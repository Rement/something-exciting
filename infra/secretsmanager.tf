resource "aws_secretsmanager_secret" "app" {
  name = "${local.prefix}-secrets"
}

resource "aws_secretsmanager_secret_version" "app" {
  secret_id = aws_secretsmanager_secret.app.id
  secret_string = jsonencode({
    userPin   = var.user_pin
    adminPin  = var.admin_pin
    jwtSecret = var.jwt_secret
  })
}
