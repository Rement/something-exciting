# ----- REST API -----

resource "aws_api_gateway_rest_api" "main" {
  name = "${local.prefix}-api"

  endpoint_configuration {
    types = ["REGIONAL"]
  }
}

# ----- Routes -----

locals {
  api_routes = {
    auth     = { method = "POST", auth = false, handler_key = "auth" }
    state    = { method = "GET", auth = true, handler_key = "state" }
    scratch  = { method = "POST", auth = true, handler_key = "scratch" }
    reveal   = { method = "POST", auth = true, handler_key = "reveal" }
    reset    = { method = "POST", auth = true, handler_key = "reset" }
    email    = { method = "POST", auth = true, handler_key = "state" }
    config   = { method = "POST", auth = true, handler_key = "state" }
    events   = { method = "GET", auth = true, handler_key = "state" }
    telegram = { method = "POST", auth = false, handler_key = "telegram-webhook" }
  }
}

resource "aws_api_gateway_resource" "routes" {
  for_each = local.api_routes

  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_rest_api.main.root_resource_id
  path_part   = each.key
}

# ----- JWT Authorizer -----

resource "aws_api_gateway_authorizer" "jwt" {
  name                             = "${local.prefix}-jwt"
  rest_api_id                      = aws_api_gateway_rest_api.main.id
  authorizer_uri                   = aws_lambda_function.functions["authorizer"].invoke_arn
  type                             = "TOKEN"
  identity_source                  = "method.request.header.Authorization"
  authorizer_result_ttl_in_seconds = 300
}

# ----- Methods -----

resource "aws_api_gateway_method" "routes" {
  for_each = local.api_routes

  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.routes[each.key].id
  http_method   = each.value.method
  authorization = each.value.auth ? "CUSTOM" : "NONE"
  authorizer_id = each.value.auth ? aws_api_gateway_authorizer.jwt.id : null
}

# ----- Lambda proxy integrations -----

resource "aws_api_gateway_integration" "routes" {
  for_each = local.api_routes

  rest_api_id             = aws_api_gateway_rest_api.main.id
  resource_id             = aws_api_gateway_resource.routes[each.key].id
  http_method             = aws_api_gateway_method.routes[each.key].http_method
  integration_http_method = "POST" # Lambda proxy always uses POST
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.functions[each.value.handler_key].invoke_arn
}

# ----- Deployment + Stage -----

resource "aws_api_gateway_deployment" "main" {
  rest_api_id = aws_api_gateway_rest_api.main.id

  triggers = {
    redeployment = sha1(jsonencode([
      aws_api_gateway_resource.routes,
      aws_api_gateway_method.routes,
      aws_api_gateway_integration.routes,
      aws_api_gateway_authorizer.jwt,
    ]))
  }

  lifecycle {
    create_before_destroy = true
  }

  depends_on = [aws_api_gateway_integration.routes]
}

resource "aws_api_gateway_stage" "api" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  deployment_id = aws_api_gateway_deployment.main.id
  stage_name    = "api"
}

# ----- Throttling (10 req/sec) -----

resource "aws_api_gateway_method_settings" "all" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  stage_name  = aws_api_gateway_stage.api.stage_name
  method_path = "*/*"

  settings {
    throttling_burst_limit = 20
    throttling_rate_limit  = 10
  }
}

# ----- Lambda permissions for API Gateway invocation -----

resource "aws_lambda_permission" "api_gateway" {
  for_each = local.api_routes

  statement_id  = "AllowAPIGateway-${each.key}"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.functions[each.value.handler_key].function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.main.execution_arn}/*/*"
}

resource "aws_lambda_permission" "authorizer" {
  statement_id  = "AllowAPIGatewayAuthorizer"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.functions["authorizer"].function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.main.execution_arn}/authorizers/${aws_api_gateway_authorizer.jwt.id}"
}
