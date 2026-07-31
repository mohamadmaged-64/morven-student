/**
 * AI Service — Frontend HTTP Client
 *
 * Every AI tool calls this function. It forwards requests to the backend.
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
  StreamChunk,
} from './types';
import { getBackendUrl } from './config';

// ─── Error Builder ───────────────────────────────────────────

function buildError(code: AIErrorCode, message: string, cause?: unknown): AIError {
  return { code, message, cause };
}



// ─── Main Entry Point ────────────────────────────────────────

export async function aiService(request: AIRequest): Promise<AIResponse> {
  if (!request.input || !request.input.trim()) {
    throw buildError('INVALID_REQUEST', 'Input text cannot be empty.');
  }

  if (!request.tool) {
    throw buildError('INVALID_REQUEST', 'Tool name is required.');
  }

  const url = `${getBackendUrl()}/api/ai/generate`;

  let response: Response;

  try {
    response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });
  } catch {
    throw buildError('NETWORK_ERROR', 'Could not reach the AI service. Is the backend running?');
  }

  if (!response.ok) {
    let errorData: { code?: string; message?: string } = {};

    try {
      errorData = await response.json();
    } catch {
      // response wasn't JSON — use status text
    }

    const code = (errorData.code as AIErrorCode) || 'PROVIDER_ERROR';
    const message = errorData.message || `AI request failed (${response.status})`;

    throw buildError(code, message);
  }

  try {
    const data: AIResponse = await response.json();
    return data;
  } catch {
    throw buildError('PROVIDER_ERROR', 'Invalid response from AI service.');
  }
}
// ─── Streaming Entry Point ───────────────────────────────────

/**
 * TODO:
 * Implement streaming when the backend supports
 * Server-Sent Events (SSE) or WebSockets.
 */
export async function* aiServiceStream(
  _request: AIRequest,
): AsyncGenerator<StreamChunk, void, unknown> {
  throw buildError(
    'PROVIDER_ERROR',
    'Streaming is not yet supported by the backend.',
  );
}