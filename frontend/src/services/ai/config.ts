import type { AIConfig, ProviderName, AIModel } from './types';

// ─── Defaults ────────────────────────────────────────────────

const DEFAULT_MODEL: AIModel = 'gemini-2.0-flash';
const DEFAULT_TEMPERATURE = 0.7;
const DEFAULT_TOP_P = 0.9;
const DEFAULT_MAX_OUTPUT_TOKENS = 8192;

// ─── Provider-specific model mappings ────────────────────────
// Add new providers here without touching the rest of the codebase.

const PROVIDER_MODELS: Record<ProviderName, AIModel> = {
  gemini: 'gemini-2.0-flash',
  openai: 'gpt-4o',
  groq: 'llama-3.3-70b-versatile',
  openrouter: 'openai/gpt-4o',
  anthropic: 'claude-sonnet-4-20250514',
};

// ─── Config Resolution ───────────────────────────────────────

function resolveApiKey(): string {
  const key = import.meta.env.VITE_GEMINI_API_KEY;
  if (!key) {
    throw new Error(
      '[AI] Missing VITE_GEMINI_API_KEY environment variable. ' +
      'Add it to your .env file.',
    );
  }
  return key;
}

function resolveProvider(): ProviderName {
  const raw = import.meta.env.VITE_AI_PROVIDER as ProviderName | undefined;
  if (raw && raw in PROVIDER_MODELS) return raw;
  return 'gemini';
}

function resolveModel(provider: ProviderName): AIModel {
  const raw = import.meta.env.VITE_AI_MODEL as AIModel | undefined;
  return raw || PROVIDER_MODELS[provider];
}

// ─── Public API ──────────────────────────────────────────────

export function getAIConfig(): AIConfig {
  return {
    apiKey: resolveApiKey(),
    model: resolveModel(resolveProvider()),
    temperature: DEFAULT_TEMPERATURE,
    topP: DEFAULT_TOP_P,
    maxOutputTokens: DEFAULT_MAX_OUTPUT_TOKENS,
    provider: resolveProvider(),
  };
}

/**
 * Merge caller-supplied overrides on top of the base config.
 */
export function mergeConfig(overrides?: {
  temperature?: number;
  topP?: number;
  maxOutputTokens?: number;
  model?: AIModel;
}): AIConfig {
  const base = getAIConfig();
  return {
    ...base,
    ...(overrides?.temperature !== undefined && { temperature: overrides.temperature }),
    ...(overrides?.topP !== undefined && { topP: overrides.topP }),
    ...(overrides?.maxOutputTokens !== undefined && { maxOutputTokens: overrides.maxOutputTokens }),
    ...(overrides?.model !== undefined && { model: overrides.model }),
  };
}
