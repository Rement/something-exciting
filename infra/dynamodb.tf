resource "aws_dynamodb_table" "state" {
  name         = "${local.prefix}-state"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "id"

  attribute {
    name = "id"
    type = "S"
  }
}
