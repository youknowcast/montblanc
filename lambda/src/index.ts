import OpenAI from "openai";
import { SecretsManagerClient, GetSecretValueCommand } from "@aws-sdk/client-secrets-manager";

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
    return response.SecretString || "";
  } catch (error) {
    console.error("Error fetching OpenAI API key from Secrets Manager:", error);
    throw new Error("Failed to retrieve OpenAI API key");
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

// Alexaスキルの応答形式（ディスプレイ対応）
interface AlexaResponse {
  version: string;
  response: {
    outputSpeech: {
      type: string;
      text: string;
    };
    card?: {
      type: string;
      title: string;
      content: string;
    };
    directives?: Array<{
      type: string;
      template: {
        type: string;
        title: string;
        textContent: {
          primaryText: {
            type: string;
            text: string;
          };
          secondaryText?: {
            type: string;
            text: string;
          };
        };
      };
    }>;
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
  context?: {
    System?: {
      device?: {
        supportedInterfaces?: {
          Display?: {};
        };
      };
    };
  };
}

export const handler = async (event: AlexaRequest): Promise<AlexaResponse> => {
  try {
    console.log("Received event:", JSON.stringify(event, null, 2));

    // OpenAIクライアントを初期化
    await initializeOpenAI();

    // ディスプレイ対応デバイスかどうかを判定
    const hasDisplay =
      event.context?.System?.device?.supportedInterfaces?.Display !== undefined;

    // リクエストタイプを確認
    if (event.request.type === "LaunchRequest") {
      return createAlexaResponse(
        "こんにちは！何かお手伝いできることはありますか？",
        false,
        hasDisplay,
      );
    }

    if (event.request.type === "IntentRequest") {
      const intentName = event.request.intent?.name;

      if (intentName === "AskAIIntent") {
        // ユーザーの質問を取得
        const question = event.request.intent?.slots?.question?.value || "こんにちは";

        // OpenAIに質問を送信
        const completion = await openai.chat.completions.create({
          model: "gpt-3.5-turbo",
          messages: [
            {
              role: "system",
              content:
                "あなたは親切で役立つアシスタントです。日本語で回答してください。回答は400字程度にまとめてください。音声で聞き取りやすいように、簡潔で分かりやすい表現を使用してください。",
            },
            {
              role: "user",
              content: question,
            },
          ],
          max_tokens: 400,
          temperature: 0.7,
        });

        const answer =
          completion.choices[0]?.message?.content ||
          "申し訳ございませんが、回答を生成できませんでした。";

        return createAlexaResponse(answer, false, hasDisplay, question);
      }

      if (intentName === "TranslateToEnglishIntent") {
        const phrase = event.request.intent?.slots?.question?.value || "";
      
        if (!phrase) {
          return createAlexaResponse("翻訳する言葉が聞き取れませんでした。もう一度お願いします。", false, hasDisplay);
        }
      
        const completion = await openai.chat.completions.create({
          model: "gpt-3.5-turbo",
          messages: [
            {
              role: "system",
              content: [
                "あなたはプロの翻訳者です。",
                "ユーザーが入力した日本語の単語または短いフレーズを、英語で自然な形に翻訳してください。",
                "出力は**英単語または英語の短文のみ**にしてください。",
                "「〜は英語で〜です」のような説明は不要です。",
                "回答は1行だけ、簡潔に。",
              ].join(" "),
            },
            {
              role: "user",
              content: `「${phrase}」は英語で？`,
            },
          ],
          max_tokens: 60,
          temperature: 0.2,
        });
      
        const english =
          completion.choices[0]?.message?.content?.trim() ||
          "申し訳ありませんが、翻訳できませんでした。";
      
        return createAlexaResponse(`${english}`, false, hasDisplay, phrase);
      }

      if (intentName === "AMAZON.HelpIntent") {
        return createAlexaResponse("何か質問があれば、お気軽にお聞きください。", false, hasDisplay);
      }

      if (intentName === "AMAZON.StopIntent" || intentName === "AMAZON.CancelIntent") {
        return createAlexaResponse("お疲れさまでした。またお会いしましょう。", true, hasDisplay);
      }
    }

    return createAlexaResponse(
      "申し訳ございませんが、理解できませんでした。もう一度お試しください。",
      false,
      hasDisplay,
    );
  } catch (error) {
    console.error("Error:", error);
    return createAlexaResponse(
      "申し訳ございませんが、エラーが発生しました。もう一度お試しください。",
      true,
      false,
    );
  }
};

function createAlexaResponse(
  speechText: string,
  shouldEndSession: boolean = false,
  hasDisplay: boolean = false,
  question?: string,
): AlexaResponse {
  const response: AlexaResponse = {
    version: "1.0",
    response: {
      outputSpeech: {
        type: "PlainText",
        text: speechText,
      },
      shouldEndSession: shouldEndSession,
    },
  };

  // ディスプレイ対応デバイスの場合、ディスプレイ表示を追加
  if (hasDisplay) {
    if (question) {
      // OpenAIの回答の場合
      response.response.directives = [
        {
          type: "Display",
          template: {
            type: "BodyTemplate1",
            title: "Montblanc - AI Assistant",
            textContent: {
              primaryText: {
                type: "RichText",
                text: `<speak><break time="1s"/><prosody rate="slow">${question}</prosody></speak>`,
              },
              secondaryText: {
                type: "RichText",
                text: speechText,
              },
            },
          },
        },
      ];
    } else {
      // 通常の応答の場合
      response.response.directives = [
        {
          type: "Display",
          template: {
            type: "BodyTemplate1",
            title: "Montblanc - AI Assistant",
            textContent: {
              primaryText: {
                type: "RichText",
                text: speechText,
              },
            },
          },
        },
      ];
    }
  } else {
    // ディスプレイ非対応デバイスの場合、カードを表示
    response.response.card = {
      type: "Simple",
      title: "Montblanc - AI Assistant",
      content: speechText,
    };
  }

  return response;
}
