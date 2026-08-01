import {
  GoogleGenerativeAI,
  type GenerativeModel,
} from '@google/generative-ai';

import type {
  AIProvider,
  AIRequest,
  AIResponse,
  AIConfig,
  AIError,
  TokenUsage,
  StreamChunk,
} from '../types';

class GeminiProvider implements AIProvider {
  readonly name = 'gemini' as const;

  private genAI: GoogleGenerativeAI | null = null;

  // ──────────────────────────────────────────────────────────
  // Client
  // ──────────────────────────────────────────────────────────

  private getClient(apiKey: string): GoogleGenerativeAI {
    if (!apiKey) {
      throw {
        code: 'MISSING_API_KEY',
        message: 'Gemini API key is missing.',
      } satisfies AIError;
    }

    if (!this.genAI) {
      this.genAI = new GoogleGenerativeAI(apiKey);
    }

    return this.genAI;
  }

  // ──────────────────────────────────────────────────────────
  // Model
  // ──────────────────────────────────────────────────────────

  private getModel(config: AIConfig): GenerativeModel {
    const client = this.getClient(config.apiKey);

    return client.getGenerativeModel({
      model: config.model,
      generationConfig: {
        temperature: config.temperature,
        topP: config.topP,
        maxOutputTokens: config.maxOutputTokens,
      },
    });
  }

  // ──────────────────────────────────────────────────────────
  // Error Normalization
  // ──────────────────────────────────────────────────────────

  private normalizeError(err: unknown): AIError {
    const raw = err as {
      message?: string;
      status?: number;
      code?: number;
    };

    if (
      raw.message?.includes('API_KEY_INVALID') ||
      raw.status === 401 ||
      raw.status === 403
    ) {
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
      raw.message?.includes('SAFETY') ||
      raw.message?.includes('blocked')
    ) {
      return {
        code: 'CONTENT_FILTERED',
        message: 'Content was blocked by safety filters.',
        cause: err,
      };
    }

    if (
      raw.message?.includes('fetch') ||
      raw.message?.includes('network')
    ) {
      return {
        code: 'NETWORK_ERROR',
        message: 'Network error.',
        cause: err,
      };
    }

    if (
      raw.status === 404 ||
      raw.message?.includes('not found')
    ) {
      return {
        code: 'MODEL_UNAVAILABLE',
        message: 'Requested model is not available.',
        cause: err,
      };
    }

    return {
      code: 'PROVIDER_ERROR',
      message:
        raw.message ??
        'An unexpected error occurred with the AI provider.',
      cause: err,
    };
  }

  // ──────────────────────────────────────────────────────────
  // Generate
  // ──────────────────────────────────────────────────────────

  async generate(
    request: AIRequest,
    config: AIConfig,
  ): Promise<AIResponse> {
    const startTime = Date.now();

    try {
      const model = this.getModel(config);
      const systemInstruction = request.context?.__system;

      const result = await model.generateContent({
        contents: [
          {
            role: 'user',
            parts: [{ text: request.input }],
          },
        ],
        ...(systemInstruction && { systemInstruction }),
      });

      const response = result.response;

      const usage = response.usageMetadata;

      const tokenUsage: TokenUsage | undefined = usage
        ? {
            promptTokens: usage.promptTokenCount ?? 0,
            completionTokens: usage.candidatesTokenCount ?? 0,
            totalTokens: usage.totalTokenCount ?? 0,
          }
        : undefined;

      return {
        text: response.text(),
        model: config.model,
        provider: 'gemini',
        usage: tokenUsage,
        latencyMs: Date.now() - startTime,
      };
    }  catch (err) {
  console.error('Gemini Error Full:', JSON.stringify(err, null, 2));
  console.error(err);
  throw this.normalizeError(err);
}
  }

  // ──────────────────────────────────────────────────────────
  // Streaming
  // ──────────────────────────────────────────────────────────

  async *generateStream(
    request: AIRequest,
    config: AIConfig,
  ): AsyncGenerator<StreamChunk, void, unknown> {
    try {
      const model = this.getModel(config);
      const systemInstruction = request.context?.__system;

      const result = await model.generateContentStream({
        contents: [
          {
            role: 'user',
            parts: [{ text: request.input }],
          },
        ],
        ...(systemInstruction && { systemInstruction }),
      });

      for await (const chunk of result.stream) {
        yield {
          delta: chunk.text(),
          done: false,
        };
      }

      yield {
        delta: '',
        done: true,
      };
    } catch (err) {
      throw this.normalizeError(err);
    }
  }
}

export const geminiProvider: AIProvider = new GeminiProvider();