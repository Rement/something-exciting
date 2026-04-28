# Per-tile unlock notifier — fires every minute and sends Telegram messages
# for any newly-unlocked card across all events.

resource "aws_cloudwatch_event_rule" "tile_unlock" {
  name                = "${local.prefix}-tile-unlock"
  schedule_expression = "rate(1 minute)"
  state               = "ENABLED"
}

resource "aws_cloudwatch_event_target" "tile_unlock" {
  rule = aws_cloudwatch_event_rule.tile_unlock.name
  arn  = aws_lambda_function.functions["email-cron"].arn

  input = jsonencode({ trigger = "tile-unlock" })
}

resource "aws_lambda_permission" "eventbridge" {
  statement_id  = "AllowEventBridge"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.functions["email-cron"].function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.tile_unlock.arn
}
