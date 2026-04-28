resource "aws_secretsmanager_secret" "app" {
  name = "${local.prefix}-secrets"
}

resource "random_password" "telegram_webhook_secret" {
  length  = 40
  special = false
}

resource "aws_secretsmanager_secret_version" "app" {
  secret_id = aws_secretsmanager_secret.app.id
  secret_string = jsonencode({
    adminPin              = var.admin_pin
    jwtSecret             = var.jwt_secret
    telegramBotToken      = var.telegram_bot_token
    telegramWebhookSecret = random_password.telegram_webhook_secret.result
  })
}
