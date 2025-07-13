# Alexa OpenAI Integration

Alexa platformと連携してOpenAIにクエリを投げ、回答を返却するアプリケーションです。

## プロジェクト構造

```
.
├── terraform/          # Terraformインフラストラクチャコード
│   ├── main.tf        # メインリソース定義
│   ├── variables.tf   # 変数定義
│   └── outputs.tf     # 出力定義
├── lambda/            # Lambda関数（TypeScript）
│   ├── src/           # ソースコード
│   ├── package.json   # 依存関係
│   ├── tsconfig.json  # TypeScript設定
│   └── ramboll.yaml   # Ramboll設定
└── README.md          # このファイル
```

## アーキテクチャ

- **Alexa Skill**: Alexa platformから直接Lambda関数を呼び出し
- **Lambda Function**: OpenAI APIにクエリを送信して回答を取得
- **Secrets Manager**: OpenAI APIキーを安全に管理
- **IAM**: 最小権限でSecrets Managerアクセス

## セットアップ

### 前提条件

- Node.js 20以上
- Terraform
- AWS CLI
- Ramboll CLI

### 1. 依存関係のインストール

```bash
cd lambda
npm install
```

### 2. 環境変数の設定

```bash
export OPENAI_API_KEY="your-openai-api-key"
export AWS_REGION="us-east-1"
```

### 3. Lambda関数のビルド

```bash
cd lambda
npm run build
```

### 4. Terraformでインフラをデプロイ

```bash
cd terraform
terraform init
terraform plan
terraform apply
```

### 5. RambollでLambda関数をデプロイ

```bash
cd lambda
npm run deploy
```

## セキュリティ

### Secrets Manager

OpenAI APIキーはAWS Secrets Managerで安全に管理されます：

1. **自動作成**: TerraformがSecrets Managerのシークレットを自動的に作成
2. **安全なアクセス**: Lambda関数のみがSecrets Managerにアクセス可能
3. **環境変数**: `SECRET_NAME`環境変数でシークレット名を指定

### IAM権限

Lambda関数には以下の権限が付与されます：
- Secrets Managerからのシークレット読み取り
- CloudWatch Logsへのログ出力

## 使用方法

1. Alexa Developer Consoleでスキルを作成
2. エンドポイントタイプを「AWS Lambda ARN」に設定
3. Lambda関数のARNを設定（Terraformの出力から取得）
4. インテントを設定：
   - `AskOpenAI`: ユーザーの質問をOpenAIに送信
   - `AMAZON.HelpIntent`: ヘルプメッセージ
   - `AMAZON.StopIntent`: セッション終了

## 開発

### ローカル開発

```bash
cd lambda
npm run dev  # TypeScriptの監視モード
```

### テスト

```bash
cd lambda
npm test
```

## 注意事項

- OpenAI APIキーはSecrets Managerで安全に管理されます
- AWSリージョンは必要に応じて変更してください
- Alexaスキルの設定は別途必要です
- Secrets Managerのシークレット名は`alexa-openai-api-key`です
- Lambda関数のARNをAlexa Developer Consoleで設定してください 