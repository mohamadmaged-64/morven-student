import OpenAI from 'openai';

import type {
  AIProvider,
  AIRequest,
  AIResponse,
  AIConfig,
  AIError,
  StreamChunk,
} from '../types';

class OpenRouterProvider implements AIProvider {
  readonly name = 'openrouter' as const;

  private normalizeError(err: unknown): AIError {
    const raw = err as {
      message?: string;
      status?: number;
    };

    if (raw.status === 401 || raw.status === 403) {
      return {
        code: 'AUTH_ERROR',
        message: 'Invalid or missing API key.',
        cause: err,
      };
    }

    if (raw.status === 429) {
      return {
        code: 'RATE_LIMITED',
        message: 'Rate limit exceeded.',
        cause: err,
      };
    }

    if (
      raw.message?.includes('fetch') ||
      raw.message?.includes('network') ||
      raw.message?.includes('ECONN')
    ) {
      return {
        code: 'NETWORK_ERROR',
        message: 'Network error.',
        cause: err,
      };
    }

    if (raw.status === 404 || raw.message?.includes('not found')) {
      return {
        code: 'MODEL_UNAVAILABLE',
        message: 'Requested model is not available.',
        cause: err,
      };
    }

    return {
      code: 'PROVIDER_ERROR',
      message: raw.message ?? 'An unexpected error occurred with the AI provider.',
      cause: err,
    };
  }

  async generate(
    request: AIRequest,
    config: AIConfig,
  ): Promise<AIResponse> {
    const start = Date.now();

    try {
      const client = new OpenAI({
        apiKey: config.apiKey,
        baseURL: 'https://openrouter.ai/api/v1',
      });

      const completion = await client.chat.completions.create({
        model: config.model,
        messages: [
          ...(request.context?.__system
            ? [{ role: 'system' as const, content: request.context.__system }]
            : []),
          {
            role: 'user',
            content: request.input,
          },
        ],
        temperature: config.temperature,
        top_p: config.topP,
        max_tokens: config.maxOutputTokens,
      });

      return {
        text: completion.choices[0]?.message?.content ?? '',
        provider: 'openrouter',
        model: config.model,
        latencyMs: Date.now() - start,
        usage: completion.usage
          ? {
              promptTokens: completion.usage.prompt_tokens,
              completionTokens: completion.usage.completion_tokens,
              totalTokens: completion.usage.total_tokens,
            }
          : undefined,
      };
    } catch (err) {
      throw this.normalizeError(err);
    }
  }

  async *generateStream(): AsyncGenerator<StreamChunk> {
    throw new Error('Streaming not implemented yet.');
  }
}

export const openRouterProvider: AIProvider = new OpenRouterProvider();
