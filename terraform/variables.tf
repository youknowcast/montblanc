variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "openai_api_key" {
  description = "OpenAI API Key"
  type        = string
  sensitive   = true
}

variable "alexa_skill_id" {
  description = "Alexa Skill ID (amzn1.ask.skill.xxx)"
  type        = string
} 