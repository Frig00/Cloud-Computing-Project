output "api_gateway_websocket_url" {
  value = aws_apigatewayv2_api.sunomi-ws.api_endpoint
}

output "controller_alb_dns_name" {
  value = aws_lb.controller.dns_name
}