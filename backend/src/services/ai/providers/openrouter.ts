import OpenAI from 'openai';

import type {
  AIProvider,
  AIRequest,
  AIResponse,
  AIConfig,
  StreamChunk,
} from '../types';

class OpenRouterProvider implements AIProvider {
  readonly name = 'openrouter' as const;

  async generate(
    request: AIRequest,
    config: AIConfig,
  ): Promise<AIResponse> {
    const start = Date.now();

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
  }

  async *generateStream(): AsyncGenerator<StreamChunk> {
    throw new Error('Streaming not implemented yet.');
  }
}

export const openRouterProvider: AIProvider = new OpenRouterProvider();