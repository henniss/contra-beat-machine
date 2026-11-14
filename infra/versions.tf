terraform {
  required_version = ">= 1.10"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.0"
    }
  }
}

# Everything lives in us-east-1: CloudFront only accepts certificates from
# there, and keeping the bucket alongside avoids a second provider.
provider "aws" {
  region = "us-east-1"

  default_tags {
    tags = {
      project = "contra-beat-machine"
    }
  }
}
