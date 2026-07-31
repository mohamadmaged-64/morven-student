// ─── Tool Names ──────────────────────────────────────────────
// Every AI tool must register a unique name here.
// This union is the single source of truth for valid tool identifiers.

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
  /** Sampling temperature (0 – 2). */
  temperature?: number;

  /** Top-p nucleus sampling threshold. */
  topP?: number;

  /** Maximum tokens the model may generate. */
  maxOutputTokens?: number;

  /** Stop sequences that halt generation. */
  stopSequences?: string[];

  /** Specific model override for this request. */
  model?: AIModel;
}

// ─── AI Request ──────────────────────────────────────────────

export interface AIRequest {
  /** Which tool is making this request. */
  tool: ToolName;

  /** The user-provided input text. */
  input: string;

  /** Optional extra context the tool can pass (e.g. target language, format). */
  context?: Record<string, string>;

  /** Optional generation parameter overrides. */
  options?: GenerationOptions;
}

// ─── AI Response ─────────────────────────────────────────────

export interface AIResponse {
  /** The generated text output. */
  text: string;

  /** Which model actually answered. */
  model: AIModel;

  /** Which provider served the request. */
  provider: ProviderName;

  /** Token usage metadata (if available). */
  usage?: TokenUsage;

  /** Wall-clock time in milliseconds. */
  latencyMs: number;
}

// ─── Token Usage ─────────────────────────────────────────────

export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

// ─── Stream Chunk ────────────────────────────────────────────

export interface StreamChunk {
  /** Partial text delta for this chunk. */
  delta: string;

  /** True when the model has finished generating. */
  done: boolean;

  /** Token usage (only present on the final chunk). */
  usage?: TokenUsage;
}

// ─── AI Error ────────────────────────────────────────────────

export interface AIError {
  /** Machine-readable error code. */
  code: AIErrorCode;

  /** Human-readable message safe for display. */
  message: string;

  /** Original provider error (logged, never shown to users). */
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
// Every provider adapter must implement this contract.

export interface AIProvider {
  /** Unique identifier for this provider. */
  readonly name: ProviderName;

  /** Send a request and return a complete response. */
  generate(request: AIRequest, config: AIConfig): Promise<AIResponse>;

  /** Send a request and return a streaming iterator. */
  generateStream(request: AIRequest, config: AIConfig): AsyncGenerator<StreamChunk, void, unknown>;
}

// ─── Config Shape ────────────────────────────────────────────
// Centralised config consumed by providers.

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
  /** Builds the system + user prompt from the request. */
  build: (request: AIRequest) => { system: string; user: string };
}

export type PromptRegistry = Map<ToolName, PromptDefinition>;
