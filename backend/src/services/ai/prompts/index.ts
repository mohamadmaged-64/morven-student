import type { ToolName, PromptDefinition, PromptRegistry } from '../types';
import { summarizeTextPrompt } from './summarize-text';

const registry: PromptRegistry = new Map();

// ─── Register built-in prompts ───────────────────────────────

registerPrompt('summarize-text', summarizeTextPrompt);

export function registerPrompt(tool: ToolName, definition: PromptDefinition): void {
  registry.set(tool, definition);
}

export function getPrompt(tool: ToolName): PromptDefinition | undefined {
  return registry.get(tool);
}
