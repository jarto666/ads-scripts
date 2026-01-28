import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface ChatCompletionResponse {
  id: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

@Injectable()
export class OpenRouterClient {
  private readonly logger = new Logger(OpenRouterClient.name);
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly defaultModel: string;

  constructor(private configService: ConfigService) {
    this.apiKey = this.configService.get<string>('OPENROUTER_API_KEY') || '';
    this.baseUrl =
      this.configService.get<string>('OPENROUTER_BASE_URL') ||
      'https://openrouter.ai/api/v1';
    this.defaultModel =
      this.configService.get<string>('OPENROUTER_MODEL') ||
      'anthropic/claude-sonnet-4.5';
  }

  async chatCompletion(
    messages: ChatMessage[],
    options?: {
      model?: string;
      temperature?: number;
      maxTokens?: number;
      jsonMode?: boolean;
    },
  ): Promise<string> {
    const model = options?.model || this.defaultModel;
    const temperature = options?.temperature ?? 0.7;
    const maxTokens = options?.maxTokens ?? 4096;

    const requestBody: Record<string, unknown> = {
      model,
      messages,
      temperature,
      max_tokens: maxTokens,
    };

    if (options?.jsonMode) {
      requestBody.response_format = { type: 'json_object' };
    }

    const response = await this.makeRequest('/chat/completions', requestBody);

    if (!response.choices || response.choices.length === 0) {
      throw new Error('No response from OpenRouter');
    }

    return response.choices[0].message.content;
  }

  private async makeRequest(
    endpoint: string,
    body: Record<string, unknown>,
    retries = 2,
  ): Promise<ChatCompletionResponse> {
    const url = `${this.baseUrl}${endpoint}`;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://ugc-script-factory.com',
            'X-Title': 'UGC Script Factory',
          },
          body: JSON.stringify(body),
        });

        if (!response.ok) {
          const errorText = await response.text();
          this.logger.error(
            `OpenRouter API error: ${response.status} ${errorText}`,
          );

          // Retry on 5xx errors
          if (response.status >= 500 && attempt < retries) {
            await this.delay(1000 * (attempt + 1));
            continue;
          }

          throw new Error(`OpenRouter API error: ${response.status}`);
        }

        return response.json();
      } catch (error) {
        if (attempt < retries) {
          this.logger.warn(`Request failed, retrying... (${attempt + 1}/${retries})`);
          await this.delay(1000 * (attempt + 1));
          continue;
        }
        throw error;
      }
    }

    throw new Error('Max retries exceeded');
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
