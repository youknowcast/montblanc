import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import OpenAI from 'openai';
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';

// Secrets Managerクライアントの初期化
const secretsManager = new SecretsManagerClient({ region: process.env.AWS_REGION });

// OpenAIクライアントの初期化（APIキーは後で設定）
let openai: OpenAI;

// Secrets ManagerからOpenAI APIキーを取得
async function getOpenAIApiKey(): Promise<string> {
	try {
		const command = new GetSecretValueCommand({
			SecretId: process.env.SECRET_NAME,
		});

		const response = await secretsManager.send(command);
		return response.SecretString || '';
	} catch (error) {
		console.error('Error fetching OpenAI API key from Secrets Manager:', error);
		throw new Error('Failed to retrieve OpenAI API key');
	}
}

// OpenAIクライアントを初期化
async function initializeOpenAI(): Promise<void> {
	if (!openai) {
		const apiKey = await getOpenAIApiKey();
		openai = new OpenAI({
			apiKey: apiKey,
		});
	}
}

// Alexaスキルの応答形式
interface AlexaResponse {
	version: string;
	response: {
		outputSpeech: {
			type: string;
			text: string;
		};
		shouldEndSession: boolean;
	};
}

// Alexaリクエストの形式
interface AlexaRequest {
	request: {
		type: string;
		intent?: {
			name: string;
			slots?: Record<string, any>;
		};
	};
	session: {
		sessionId: string;
		application: {
			applicationId: string;
		};
	};
}

export const handler = async (
	event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
	try {
		console.log('Received event:', JSON.stringify(event, null, 2));

		// OpenAIクライアントを初期化
		await initializeOpenAI();

		// Alexaからのリクエストを解析
		const alexaRequest: AlexaRequest = JSON.parse(event.body || '{}');

		// リクエストタイプを確認
		if (alexaRequest.request.type === 'LaunchRequest') {
			return createAlexaResponse('こんにちは！何かお手伝いできることはありますか？');
		}

		if (alexaRequest.request.type === 'IntentRequest') {
			const intentName = alexaRequest.request.intent?.name;

			if (intentName === 'AskOpenAI') {
				// ユーザーの質問を取得
				const question = alexaRequest.request.intent?.slots?.question?.value || 'こんにちは';

				// OpenAIに質問を送信
				const completion = await openai.chat.completions.create({
					model: 'gpt-3.5-turbo',
					messages: [
						{
							role: 'system',
							content: 'あなたは親切で役立つアシスタントです。日本語で回答してください。'
						},
						{
							role: 'user',
							content: question
						}
					],
					max_tokens: 500,
					temperature: 0.7,
				});

				const answer = completion.choices[0]?.message?.content || '申し訳ございませんが、回答を生成できませんでした。';

				return createAlexaResponse(answer);
			}

			if (intentName === 'AMAZON.HelpIntent') {
				return createAlexaResponse('何か質問があれば、お気軽にお聞きください。');
			}

			if (intentName === 'AMAZON.StopIntent' || intentName === 'AMAZON.CancelIntent') {
				return createAlexaResponse('お疲れさまでした。またお会いしましょう。', true);
			}
		}

		return createAlexaResponse('申し訳ございませんが、理解できませんでした。もう一度お試しください。');

	} catch (error) {
		console.error('Error:', error);
		return {
			statusCode: 500,
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				error: 'Internal server error'
			})
		};
	}
};

function createAlexaResponse(
	speechText: string,
	shouldEndSession: boolean = false
): APIGatewayProxyResult {
	const response: AlexaResponse = {
		version: '1.0',
		response: {
			outputSpeech: {
				type: 'PlainText',
				text: speechText
			},
			shouldEndSession: shouldEndSession
		}
	};

	return {
		statusCode: 200,
		headers: {
			'Content-Type': 'application/json',
		},
		body: JSON.stringify(response)
	};
} 