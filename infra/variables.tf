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

variable "telegram_bot_token" {
  description = "Telegram bot token used to deliver notifications"
  type        = string
  sensitive   = true
}
