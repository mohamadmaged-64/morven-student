/**
 * AI Module — Public API
 *
 * Import everything from '@/services/ai':
 *
 *   import { aiService, aiServiceStream, registerPrompt } from '@/services/ai';
 *   import type { AIRequest, AIResponse, ToolName } from '@/services/ai';
 */

// ── Service ────────────────────────────────────────────────
export { aiService, aiServiceStream } from './aiService';

// ── Config ─────────────────────────────────────────────────
export { getBackendUrl } from './config';

// ── Prompt Registry ────────────────────────────────────────
export { registerPrompt, getPrompt, hasPrompt, getRegisteredTools } from './prompts';

// ── Types (re-export everything) ───────────────────────────
export type {
  ToolName,
  ProviderName,
  AIModel,
  GenerationOptions,
  AIRequest,
  AIResponse,
  AIError,
  AIErrorCode,
  StreamChunk,
  TokenUsage,
  AIProvider,
  AIConfig,
  PromptDefinition,
} from './types';
