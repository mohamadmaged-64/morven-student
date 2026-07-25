/**
 * AI Service — Single Entry Point
 *
 * Every AI tool in the application MUST call this function.
 * No tool should ever communicate directly with a provider.
 *
 * Usage:
 *   import { aiService } from '@/services/ai';
 *
 *   const response = await aiService({
 *     tool: 'summarize',
 *     input: 'Long text here...',
 *   });
 */

import type {
  AIRequest,
  AIResponse,
  AIError,
  AIErrorCode,
  AIProvider,
  StreamChunk,
  GenerationOptions,
} from './types';
import { mergeConfig } from './config';
import { geminiProvider } from './providers/gemini';
import { getPrompt } from './prompts';

// ─── Provider Registry ───────────────────────────────────────

const providers: Record<string, AIProvider> = {
  gemini: geminiProvider,
  // future: openai, groq, openrouter, anthropic
};

function getProvider(name: string): AIProvider {
  const p = providers[name];
  if (!p) {
    throw buildError('PROVIDER_ERROR', `Unknown provider: "${name}".`);
  }
  return p;
}

// ─── Error Builder ───────────────────────────────────────────

function buildError(code: AIErrorCode, message: string, cause?: unknown): AIError {
  return { code, message, cause };
}

// ─── Main Entry Point ────────────────────────────────────────

export async function aiService(request: AIRequest): Promise<AIResponse> {
  // 1. Validate input
  if (!request.input || !request.input.trim()) {
    throw buildError('INVALID_REQUEST', 'Input text cannot be empty.');
  }

  if (!request.tool) {
    throw buildError('INVALID_REQUEST', 'Tool name is required.');
  }

  // 2. Resolve config (merges defaults + caller overrides)
  const config = mergeConfig(request.options);

  // 3. Resolve provider
  const provider = getProvider(config.provider);

  // 4. Resolve prompt (if registered)
  const promptDef = getPrompt(request.tool);

  // Build enriched request with system prompt if available
  const enrichedRequest: AIRequest = promptDef
    ? {
        ...request,
        context: {
          ...request.context,
          __system: promptDef.build(request).system,
        },
      }
    : request;

  // 5. Generate
  try {
    return await provider.generate(enrichedRequest, config);
  } catch (err) {
    // If it's already a normalised AIError, rethrow
    if (isAIError(err)) throw err;

    // Otherwise wrap it
    throw buildError('UNKNOWN_ERROR', 'An unexpected error occurred.', err);
  }
}

// ─── Streaming Entry Point ───────────────────────────────────

export async function* aiServiceStream(
  request: AIRequest,
): AsyncGenerator<StreamChunk, void, unknown> {
  if (!request.input || !request.input.trim()) {
    throw buildError('INVALID_REQUEST', 'Input text cannot be empty.');
  }

  if (!request.tool) {
    throw buildError('INVALID_REQUEST', 'Tool name is required.');
  }

  const config = mergeConfig(request.options);
  const provider = getProvider(config.provider);

  const promptDef = getPrompt(request.tool);
  const enrichedRequest: AIRequest = promptDef
    ? {
        ...request,
        context: {
          ...request.context,
          __system: promptDef.build(request).system,
        },
      }
    : request;

  try {
    yield* provider.generateStream(enrichedRequest, config);
  } catch (err) {
    if (isAIError(err)) throw err;
    throw buildError('UNKNOWN_ERROR', 'An unexpected error occurred.', err);
  }
}

// ─── Helpers ─────────────────────────────────────────────────

function isAIError(err: unknown): err is AIError {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    'message' in err &&
    typeof (err as AIError).code === 'string'
  );
}
