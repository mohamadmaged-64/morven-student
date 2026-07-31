/**
 * Prompt Registry
 *
 * Each AI tool registers its prompt builder here.
 * The architecture is intentionally simple: a Map from ToolName → PromptDefinition.
 *
 * To add a new tool:
 *   1. Create  prompts/<toolName>.ts
 *   2. Export a PromptDefinition from that file
 *   3. Register it in the map below
 *
 * Example (in a future file):
 *
 *   import { registerPrompt } from '@/services/ai/prompts';
 *   import { summarizePrompt } from './prompts/summarize';
 *   registerPrompt('summarize', summarizePrompt);
 */

import type { ToolName, PromptDefinition, PromptRegistry } from '../types';

// ─── Registry ────────────────────────────────────────────────

const registry: PromptRegistry = new Map();

/**
 * Register a prompt definition for a tool.
 Logs a warning if a prompt for this tool is already registered, then overwrites it.
 */
export function registerPrompt(tool: ToolName, definition: PromptDefinition): void {
  if (registry.has(tool)) {
    console.warn(`[AI Prompts] Overwriting existing prompt for tool: "${tool}"`);
  }
  registry.set(tool, definition);
}

/**
 * Retrieve the prompt builder for a given tool.
 * Returns undefined if no prompt has been registered.
 */
export function getPrompt(tool: ToolName): PromptDefinition | undefined {
  return registry.get(tool);
}

/**
 * Check whether a prompt exists for the given tool.
 */
export function hasPrompt(tool: ToolName): boolean {
  return registry.has(tool);
}

/**
 * Return all registered tool names. Useful for diagnostics.
 */
export function getRegisteredTools(): ToolName[] {
  return Array.from(registry.keys());
}
