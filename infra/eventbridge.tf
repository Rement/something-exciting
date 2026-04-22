# Five one-shot email triggers. PDT in May = UTC-7.
# 9pm PDT = 04:00 UTC next day. 8am PDT = 15:00 UTC.

# ----- Launch email: May 11, 9pm PDT (May 12, 04:00 UTC) -----

resource "aws_cloudwatch_event_rule" "email_launch" {
  name                = "${local.prefix}-email-launch"
  schedule_expression = "cron(0 4 12 5 ? 2026)"
  state               = "ENABLED"
}

resource "aws_cloudwatch_event_target" "email_launch" {
  rule = aws_cloudwatch_event_rule.email_launch.name
  arn  = aws_lambda_function.functions["email-cron"].arn

  input = jsonencode({ trigger = "launch" })
}

# ----- Daily email: May 12, 8am PDT (15:00 UTC) -----

resource "aws_cloudwatch_event_rule" "email_day2" {
  name                = "${local.prefix}-email-day2"
  schedule_expression = "cron(0 15 12 5 ? 2026)"
  state               = "ENABLED"
}

resource "aws_cloudwatch_event_target" "email_day2" {
  rule = aws_cloudwatch_event_rule.email_day2.name
  arn  = aws_lambda_function.functions["email-cron"].arn

  input = jsonencode({ trigger = "daily" })
}

# ----- Daily email: May 13, 8am PDT (15:00 UTC) -----

resource "aws_cloudwatch_event_rule" "email_day3" {
  name                = "${local.prefix}-email-day3"
  schedule_expression = "cron(0 15 13 5 ? 2026)"
  state               = "ENABLED"
}

resource "aws_cloudwatch_event_target" "email_day3" {
  rule = aws_cloudwatch_event_rule.email_day3.name
  arn  = aws_lambda_function.functions["email-cron"].arn

  input = jsonencode({ trigger = "daily" })
}

# ----- Daily email: May 14, 8am PDT (15:00 UTC) -----

resource "aws_cloudwatch_event_rule" "email_day4" {
  name                = "${local.prefix}-email-day4"
  schedule_expression = "cron(0 15 14 5 ? 2026)"
  state               = "ENABLED"
}

resource "aws_cloudwatch_event_target" "email_day4" {
  rule = aws_cloudwatch_event_rule.email_day4.name
  arn  = aws_lambda_function.functions["email-cron"].arn

  input = jsonencode({ trigger = "daily" })
}

# ----- Reveal day email: May 15, 8am PDT (15:00 UTC) -----

resource "aws_cloudwatch_event_rule" "email_reveal" {
  name                = "${local.prefix}-email-reveal"
  schedule_expression = "cron(0 15 15 5 ? 2026)"
  state               = "ENABLED"
}

resource "aws_cloudwatch_event_target" "email_reveal" {
  rule = aws_cloudwatch_event_rule.email_reveal.name
  arn  = aws_lambda_function.functions["email-cron"].arn

  input = jsonencode({ trigger = "reveal-day" })
}

# ----- Lambda permission for EventBridge -----

resource "aws_lambda_permission" "eventbridge" {
  statement_id  = "AllowEventBridge"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.functions["email-cron"].function_name
  principal     = "events.amazonaws.com"
  source_arn    = "arn:aws:events:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:rule/${local.prefix}-email-*"
}
