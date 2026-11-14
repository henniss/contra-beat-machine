output "certificate_validation_record" {
  description = "CNAME to add at Namecheap. The host omits the domain, which Namecheap appends itself."
  value = [for o in aws_acm_certificate.site.domain_validation_options : {
    host  = trimsuffix(trimsuffix(o.resource_record_name, "."), ".${var.domain_name}")
    type  = o.resource_record_type
    value = o.resource_record_value
  }]
}

output "cloudfront_domain" {
  description = "Target for the ALIAS record on @ at Namecheap."
  value       = aws_cloudfront_distribution.site.domain_name
}

output "distribution_id" {
  description = "For finding the distribution in the console and for clearing its cache."
  value       = aws_cloudfront_distribution.site.id
}

output "site_url" {
  value = "https://${var.domain_name}/${var.site_path}/"
}
