output "lambda_function_name" {
  description = "Lambda function name"
  value       = aws_lambda_function.montblanc.function_name
}

output "lambda_function_arn" {
  description = "Lambda function ARN"
  value       = aws_lambda_function.montblanc.arn
}

output "secrets_manager_arn" {
  description = "Secrets Manager ARN for OpenAI API key"
  value       = aws_secretsmanager_secret.openai_api_key.arn
}

output "secret_name" {
  description = "Secrets Manager secret name"
  value       = aws_secretsmanager_secret.openai_api_key.name
} 