terraform {
  required_version = ">= 1.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

# Secrets ManagerでOpenAI APIキーを管理
resource "aws_secretsmanager_secret" "openai_api_key" {
  name        = "alexa-openai-api-key"
  description = "OpenAI API Key for Alexa integration"
}

resource "aws_secretsmanager_secret_version" "openai_api_key" {
  secret_id     = aws_secretsmanager_secret.openai_api_key.id
  secret_string = var.openai_api_key
}

# IAMロール（Lambda実行用）
resource "aws_iam_role" "lambda_role" {
  name = "montblanc-lambda-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })
}

# Lambda実行ポリシー
resource "aws_iam_role_policy_attachment" "lambda_policy" {
  role       = aws_iam_role.lambda_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

# Secrets Manager読み取りポリシー
resource "aws_iam_role_policy" "secrets_manager_policy" {
  name = "secrets-manager-read-policy"
  role = aws_iam_role.lambda_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue"
        ]
        Resource = aws_secretsmanager_secret.openai_api_key.arn
      }
    ]
  })
}

# Lambda関数
resource "aws_lambda_function" "montblanc" {
  filename         = "../lambda/function.zip"
  function_name    = "montblanc"
  role            = aws_iam_role.lambda_role.arn
  handler         = "index.handler"
  runtime         = "nodejs20.x"
  timeout         = 30
  memory_size     = 256

  environment {
    variables = {
      SECRET_NAME = aws_secretsmanager_secret.openai_api_key.name
    }
  }
} 