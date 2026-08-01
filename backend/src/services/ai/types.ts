// ─── Tool Names ──────────────────────────────────────────────

export type ToolName =
  | 'summarize-text'
  | 'summarize-pdf'
  | 'summarize-image'
  | 'summarize-audio'
  | 'translate'
  | 'rewrite'
  | 'explain'
  | 'grammar-check'
  | 'flashcards'
  | 'mcq'
  | 'quiz'
  | 'true-false'
  | 'study-plan'
  | 'mindmap'
  | 'extract-terminology'
  | 'paragraph-to-bullets'
  | 'bullets-to-article'
  | 'extract-key-ideas'
  | 'simplify';

// ─── Provider Identifiers ────────────────────────────────────

export type ProviderName = 'gemini' | 'openai' | 'groq' | 'openrouter' | 'anthropic';

// ─── Model Identifiers ───────────────────────────────────────

export type AIModel = string;

// ─── Generation Options ──────────────────────────────────────

export interface GenerationOptions {
  temperature?: number;
  topP?: number;
  maxOutputTokens?: number;
  stopSequences?: string[];
  model?: AIModel;
}

// ─── AI Request ──────────────────────────────────────────────

export interface AIRequest {
  tool: ToolName;
  input: string;
  context?: Record<string, string>;
  options?: GenerationOptions;
}

// ─── AI Response ─────────────────────────────────────────────

export interface AIResponse {
  text: string;
  model: AIModel;
  provider: ProviderName;
  usage?: TokenUsage;
  latencyMs: number;
}

// ─── Token Usage ─────────────────────────────────────────────

export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

// ─── AI Error ────────────────────────────────────────────────

export interface AIError {
  code: AIErrorCode;
  message: string;
  cause?: unknown;
}

export type AIErrorCode =
  | 'MISSING_API_KEY'
  | 'INVALID_REQUEST'
  | 'RATE_LIMITED'
  | 'AUTH_ERROR'
  | 'MODEL_UNAVAILABLE'
  | 'CONTENT_FILTERED'
  | 'NETWORK_ERROR'
  | 'PROVIDER_ERROR'
  | 'UNKNOWN_ERROR';

// ─── Provider Interface ──────────────────────────────────────

export interface AIProvider {
  readonly name: ProviderName;

  generate(request: AIRequest, config: AIConfig): Promise<AIResponse>;

  generateStream(
    request: AIRequest,
    config: AIConfig,
  ): AsyncGenerator<StreamChunk, void, unknown>;
}

// ─── Config Shape ────────────────────────────────────────────

export interface AIConfig {
  apiKey: string;
  model: AIModel;
  temperature: number;
  topP: number;
  maxOutputTokens: number;
  provider: ProviderName;
}

// ─── Prompt Registry ─────────────────────────────────────────

export interface PromptDefinition {
  build: (request: AIRequest) => { system: string; user: string };
}

export type PromptRegistry = Map<ToolName, PromptDefinition>;

export interface StreamChunk {
  delta: string;
  done: boolean;
  usage?: TokenUsage;
}
