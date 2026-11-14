# CloudFront caches files for a day, so whenever an apply changes any file,
# clear the whole cache so visitors get the new version within a few minutes.
# Runs the AWS CLI with the same credentials as Terraform; "/*" counts as one
# of the 1,000 free invalidation paths a month.
resource "terraform_data" "invalidate" {
  triggers_replace = sha256(jsonencode(concat(
    [for o in aws_s3_object.site : o.etag],
    [aws_s3_object.forward.etag, aws_s3_object.root.etag],
  )))

  provisioner "local-exec" {
    command = "aws cloudfront create-invalidation --distribution-id ${aws_cloudfront_distribution.site.id} --paths '/*' --query Invalidation.Id --output text"
  }
}
