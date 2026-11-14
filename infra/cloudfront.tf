resource "aws_cloudfront_origin_access_control" "site" {
  name                              = "contra-beat-machine"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

# The free flat-rate plan only accepts AWS's managed cache policies. This one
# caches for a day, so changed files are pushed out by clearing the cache
# (see invalidate.tf).
data "aws_cloudfront_cache_policy" "optimized" {
  name = "Managed-CachingOptimized"
}

resource "aws_cloudfront_distribution" "site" {
  enabled         = true
  comment         = "Contra Beat Machine"
  aliases         = [var.domain_name]
  is_ipv6_enabled = true
  http_version    = "http2and3"
  price_class     = "PriceClass_100"

  # Only applies to the bare domain; folders are handled in site.tf.
  default_root_object = "index.html"

  origin {
    origin_id                = "site"
    domain_name              = aws_s3_bucket.site.bucket_regional_domain_name
    origin_access_control_id = aws_cloudfront_origin_access_control.site.id
  }

  default_cache_behavior {
    target_origin_id       = "site"
    allowed_methods        = ["GET", "HEAD"]
    cached_methods         = ["GET", "HEAD"]
    viewer_protocol_policy = "redirect-to-https"
    compress               = true
    cache_policy_id        = data.aws_cloudfront_cache_policy.optimized.id
  }

  viewer_certificate {
    acm_certificate_arn      = aws_acm_certificate_validation.site.certificate_arn
    ssl_support_method       = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  lifecycle {
    # The free flat-rate plan, subscribed in the console, attaches its own web
    # ACL; without this the next apply would remove it.
    ignore_changes = [web_acl_id]
  }
}
