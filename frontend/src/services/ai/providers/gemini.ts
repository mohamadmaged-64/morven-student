import { GoogleGenerativeAI, type GenerativeModel } from '@google/generative-ai';
import type {
  AIProvider,
  AIRequest,
  AIResponse,
  AIConfig,
  AIError,
  AIErrorCode,
  StreamChunk,
  TokenUsage,
} from '../types';

// ─── Gemini Provider ─────────────────────────────────────────

class GeminiProvider implements AIProvider {
  readonly name = 'gemini' as const;

  private genAI: GoogleGenerativeAI | null = null;

  // ── Lazy init ────────────────────────────────────────────

  private getClient(apiKey: string): GoogleGenerativeAI {
    if (!this.genAI) {
      this.genAI = new GoogleGenerativeAI(apiKey);
    }
    return this.genAI;
  }

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

  // ── Error Normalisation ──────────────────────────────────

  private normalizeError(err: unknown): AIError {
    const raw = err as { message?: string; status?: number; code?: number };

    // Missing / invalid API key
    if (raw.message?.includes('API_KEY_INVALID') || raw.status === 401 || raw.status === 403) {
      return { code: 'AUTH_ERROR', message: 'Invalid or missing API key.', cause: err };
    }

    // Rate limiting
    if (raw.status === 429) {
      return { code: 'RATE_LIMITED', message: 'Rate limit exceeded. Please try again shortly.', cause: err };
    }

    // Safety / content filter
    if (raw.message?.includes('SAFETY') || raw.message?.includes('blocked')) {
      return { code: 'CONTENT_FILTERED', message: 'Content was blocked by safety filters.', cause: err };
    }

    // Network
    if (raw.message?.includes('fetch') || raw.message?.includes('network')) {
      return { code: 'NETWORK_ERROR', message: 'Network error. Please check your connection.', cause: err };
    }

    // Model not found
    if (raw.status === 404 || raw.message?.includes('not found')) {
      return { code: 'MODEL_UNAVAILABLE', message: 'Requested model is not available.', cause: err };
    }

    // Generic fallback
    return {
      code: 'PROVIDER_ERROR',
      message: raw.message || 'An unexpected error occurred with the AI provider.',
      cause: err,
    };
  }

  // ── System Instruction ───────────────────────────────────

  private getSystemInstruction(request: AIRequest): string | undefined {
    return (request.context as Record<string, string> | undefined)?.__system || undefined;
  }

  // ── Generate (non-streaming) ────────────────────────────

  async generate(request: AIRequest, config: AIConfig): Promise<AIResponse> {
    const startTime = Date.now();

    try {
      const model = this.getModel(config);
      const systemInstruction = this.getSystemInstruction(request);

      const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: request.input }] }],
        ...(systemInstruction && { systemInstruction }),
      });

      const response = result.response;
      const text = response.text();
      const usage = response.usageMetadata;

      const tokenUsage: TokenUsage | undefined = usage
        ? {
            promptTokens: usage.promptTokenCount ?? 0,
            completionTokens: usage.candidatesTokenCount ?? 0,
            totalTokens: usage.totalTokenCount ?? 0,
          }
        : undefined;

      return {
        text,
        model: config.model,
        provider: 'gemini',
        usage: tokenUsage,
        latencyMs: Date.now() - startTime,
      };
    } catch (err) {
      throw this.normalizeError(err);
    }
  }

  // ── Generate (streaming) ─────────────────────────────────

  async *generateStream(request: AIRequest, config: AIConfig): AsyncGenerator<StreamChunk, void, unknown> {
    const startTime = Date.now();

    try {
      const model = this.getModel(config);
      const systemInstruction = this.getSystemInstruction(request);

      const result = await model.generateContentStream({
        contents: [{ role: 'user', parts: [{ text: request.input }] }],
        ...(systemInstruction && { systemInstruction }),
      });

      let totalText = '';

      for await (const chunk of result.stream) {
        const delta = chunk.text();
        totalText += delta;

        const usage = chunk.usageMetadata;
        const tokenUsage: TokenUsage | undefined = usage
          ? {
              promptTokens: usage.promptTokenCount ?? 0,
              completionTokens: usage.candidatesTokenCount ?? 0,
              totalTokens: usage.totalTokenCount ?? 0,
            }
          : undefined;

        yield { delta, done: false, usage: tokenUsage };
      }

      // Final chunk signals completion
      yield { delta: '', done: true, usage: undefined };
    } catch (err) {
      throw this.normalizeError(err);
    }
  }
}

// ─── Singleton Export ────────────────────────────────────────

export const geminiProvider: AIProvider = new GeminiProvider();
