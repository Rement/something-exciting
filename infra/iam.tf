# ----- Lambda execution role -----

resource "aws_iam_role" "lambda_exec" {
  name = "${local.prefix}-lambda-exec"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "lambda.amazonaws.com"
      }
    }]
  })
}

# ----- CloudWatch Logs — write to own log groups only -----

resource "aws_iam_role_policy" "lambda_logs" {
  name = "${local.prefix}-lambda-logs"
  role = aws_iam_role.lambda_exec.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ]
      Resource = "arn:aws:logs:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:log-group:/aws/lambda/${local.prefix}-*:*"
    }]
  })
}

# ----- DynamoDB — scoped to the birthday-reveal-state table -----

resource "aws_iam_role_policy" "lambda_dynamodb" {
  name = "${local.prefix}-lambda-dynamodb"
  role = aws_iam_role.lambda_exec.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = [
        "dynamodb:GetItem",
        "dynamodb:PutItem",
        "dynamodb:UpdateItem",
        "dynamodb:DeleteItem",
        "dynamodb:Scan"
      ]
      Resource = "arn:aws:dynamodb:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:table/${local.prefix}-state"
    }]
  })
}

# ----- S3 — upload images -----

resource "aws_iam_role_policy" "lambda_s3_images" {
  name = "${local.prefix}-lambda-s3-images"
  role = aws_iam_role.lambda_exec.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = [
        "s3:PutObject"
      ]
      Resource = "${aws_s3_bucket.images.arn}/*"
    }]
  })
}

# ----- Secrets Manager — read app secrets -----

resource "aws_iam_role_policy" "lambda_secrets" {
  name = "${local.prefix}-lambda-secrets"
  role = aws_iam_role.lambda_exec.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = "secretsmanager:GetSecretValue"
      Resource = aws_secretsmanager_secret.app.arn
    }]
  })
}

