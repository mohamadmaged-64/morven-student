import type { AIConfig, ProviderName, AIModel } from './types';

const DEFAULT_TEMPERATURE = 0.7;
const DEFAULT_TOP_P = 0.9;
const DEFAULT_MAX_OUTPUT_TOKENS = 8192;

const PROVIDER_MODELS: Record<ProviderName, AIModel> = {
  gemini: 'gemini-2.0-flash',
  openai: 'gpt-4o',
  groq: 'llama-3.3-70b-versatile',
 openrouter: 'nvidia/nemotron-3-ultra-550b-a55b:free',
  anthropic: 'claude-sonnet-4-20250514',
};

export function getAIConfig(): AIConfig {
  const provider =
  process.env.AI_PROVIDER &&
  process.env.AI_PROVIDER in PROVIDER_MODELS
    ? (process.env.AI_PROVIDER as ProviderName)
    : 'gemini';

const apiKeyMap: Record<ProviderName, string> = {
  gemini: process.env.GEMINI_API_KEY || '',
  openrouter: process.env.OPENROUTER_API_KEY || '',
  openai: process.env.OPENAI_API_KEY || '',
  groq: process.env.GROQ_API_KEY || '',
  anthropic: process.env.ANTHROPIC_API_KEY || '',
};

const apiKey = apiKeyMap[provider];
const model: AIModel = process.env.AI_MODEL || PROVIDER_MODELS[provider];

  return {
    apiKey,
    model,
    temperature: DEFAULT_TEMPERATURE,
    topP: DEFAULT_TOP_P,
    maxOutputTokens: DEFAULT_MAX_OUTPUT_TOKENS,
    provider,
  };
}

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
