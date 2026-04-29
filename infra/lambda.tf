# ----- Lambda code bundle -----
# Archives the entire backend/ directory (src + node_modules).
# Run `cd backend && npm install --production` before `terraform plan`.

data "archive_file" "backend" {
  type        = "zip"
  source_dir  = "${path.module}/../backend"
  output_path = "${path.module}/dist/backend.zip"
}

# ----- Function definitions -----

locals {
  lambda_functions = {
    auth             = "src/authHandler.handler"
    state            = "src/stateHandler.handler"
    scratch          = "src/scratchHandler.handler"
    reset            = "src/resetHandler.handler"
    email-cron       = "src/emailCronHandler.handler"
    telegram-webhook = "src/telegramHandler.handler"
    authorizer       = "src/lib/auth.authorize"
  }

  lambda_env = {
    TABLE_NAME = aws_dynamodb_table.state.name
    SECRET_ARN = aws_secretsmanager_secret.app.arn
    DOMAIN     = var.domain
  }
}

resource "aws_lambda_function" "functions" {
  for_each = local.lambda_functions

  function_name = "${local.prefix}-${each.key}"
  handler       = each.value
  runtime       = "nodejs20.x"
  timeout       = 10
  memory_size   = 128

  filename         = data.archive_file.backend.output_path
  source_code_hash = data.archive_file.backend.output_base64sha256

  role = aws_iam_role.lambda_exec.arn

  environment {
    variables = local.lambda_env
  }
}

# ----- CloudWatch log groups (14-day retention) -----

resource "aws_cloudwatch_log_group" "lambda" {
  for_each = local.lambda_functions

  name              = "/aws/lambda/${local.prefix}-${each.key}"
  retention_in_days = 14
}
