import { geminiProvider } from './gemini';
import { openRouterProvider } from './openrouter';

import type { AIProvider, ProviderName } from '../types';

const providers = new Map<ProviderName, AIProvider>([
  ['gemini', geminiProvider],
  ['openrouter', openRouterProvider],
]);

export function getProvider(provider: ProviderName): AIProvider {
  const instance = providers.get(provider);

  if (!instance) {
    throw new Error(`AI provider "${provider}" is not implemented.`);
  }

  return instance;
}