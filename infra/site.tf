# The site's files, served from a private bucket under <site_path>/.
# Only this CloudFront distribution may read them.

resource "aws_s3_bucket" "site" {
  bucket_prefix = "enniss-net-site-"
}

resource "aws_s3_bucket_public_access_block" "site" {
  bucket = aws_s3_bucket.site.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_ownership_controls" "site" {
  bucket = aws_s3_bucket.site.id

  rule {
    object_ownership = "BucketOwnerEnforced"
  }
}

data "aws_iam_policy_document" "site" {
  statement {
    actions   = ["s3:GetObject"]
    resources = ["${aws_s3_bucket.site.arn}/*"]

    principals {
      type        = "Service"
      identifiers = ["cloudfront.amazonaws.com"]
    }

    condition {
      test     = "StringEquals"
      variable = "AWS:SourceArn"
      values   = [aws_cloudfront_distribution.site.arn]
    }
  }
}

resource "aws_s3_bucket_policy" "site" {
  bucket = aws_s3_bucket.site.id
  policy = data.aws_iam_policy_document.site.json

  depends_on = [aws_s3_bucket_public_access_block.site]
}

locals {
  site_root = "${path.module}/.."

  # No default on purpose: a new kind of file must fail the plan rather than
  # upload with the wrong type (browsers refuse modules not served as JS).
  content_types = {
    html = "text/html; charset=utf-8"
    css  = "text/css; charset=utf-8"
    js   = "text/javascript; charset=utf-8"
    ogg  = "audio/ogg"
    m4a  = "audio/mp4"
  }

  site_files = [
    for f in sort(setunion(
      fileset(local.site_root, "index.html"),
      fileset(local.site_root, "css/**"),
      fileset(local.site_root, "js/**"),
      fileset(local.site_root, "assets/**"),
    )) : f if !startswith(basename(f), ".")
  ]

  # S3 key => local file. The extra "<site_path>/" key holds a second copy of
  # index.html, so the folder address itself serves the page.
  site_objects = merge(
    { for f in local.site_files : "${var.site_path}/${f}" => {
      source       = f
      content_type = local.content_types[regex("[^.]+$", f)]
    } },
    { "${var.site_path}/" = {
      source       = "index.html"
      content_type = local.content_types.html
    } },
  )
}

resource "aws_s3_object" "site" {
  for_each = local.site_objects

  bucket       = aws_s3_bucket.site.id
  key          = each.key
  source       = "${local.site_root}/${each.value.source}"
  etag         = filemd5("${local.site_root}/${each.value.source}")
  content_type = each.value.content_type
}

# The page at the bare domain, enniss.net/.
resource "aws_s3_object" "root" {
  bucket       = aws_s3_bucket.site.id
  key          = "index.html"
  source       = "${path.module}/root/index.html"
  etag         = filemd5("${path.module}/root/index.html")
  content_type = local.content_types.html
}

# The address without the trailing slash would resolve the app's relative
# paths against the domain root, so it forwards to the folder, keeping any
# tune link after the #.
resource "aws_s3_object" "forward" {
  bucket       = aws_s3_bucket.site.id
  key          = var.site_path
  content_type = local.content_types.html
  content      = <<-HTML
    <!doctype html>
    <meta charset="utf-8">
    <title>Contra Beat Machine</title>
    <script>location.replace('${var.site_path}/' + location.hash)</script>
    <a href="${var.site_path}/">Contra Beat Machine</a>
  HTML
}
