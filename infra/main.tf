terraform {
  required_version = ">= 1.5"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.6"
    }
  }
}

# Primary provider — all resources in us-east-2
provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = "birthday-reveal"
      ManagedBy   = "terraform"
      Environment = "prod"
    }
  }
}

# Aliased provider for us-east-1 — required for ACM certs used by CloudFront
provider "aws" {
  alias  = "us_east_1"
  region = "us-east-1"

  default_tags {
    tags = {
      Project     = "birthday-reveal"
      ManagedBy   = "terraform"
      Environment = "prod"
    }
  }
}

locals {
  prefix = "birthday-reveal"
}

# ----- Data sources for pre-existing resources -----

data "aws_route53_zone" "main" {
  name         = "${var.domain}."
  private_zone = false
}

data "aws_caller_identity" "current" {}
data "aws_region" "current" {}
