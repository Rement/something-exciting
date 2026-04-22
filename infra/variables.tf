variable "aws_region" {
  description = "AWS region for all resources"
  type        = string
  default     = "us-east-2"
}

variable "domain" {
  description = "Root domain name"
  type        = string
  default     = "justexciting.com"
}

variable "user_pin" {
  description = "PIN for the birthday recipient"
  type        = string
  sensitive   = true
}

variable "admin_pin" {
  description = "PIN for the admin panel"
  type        = string
  sensitive   = true
}

variable "jwt_secret" {
  description = "Secret key for signing JWTs (32+ characters)"
  type        = string
  sensitive   = true
}

variable "recipient_email" {
  description = "Email address of the birthday recipient"
  type        = string
}

variable "sender_email" {
  description = "Sender email address (must be verified in SES)"
  type        = string
  default     = "hello@justexciting.com"
}
