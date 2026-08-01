import { Router } from 'express';
import { getProvider } from '../services/ai/providers';
import { mergeConfig } from '../services/ai/config';
import { getPrompt } from '../services/ai/prompts';
import type { AIRequest, AIError } from '../services/ai/types';

const router = Router();

// ────────────────────────────────────────────────────────────
// Type Guard
// ────────────────────────────────────────────────────────────

function isAIError(err: unknown): err is AIError {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    'message' in err &&
    typeof (err as AIError).code === 'string'
  );
}

// ────────────────────────────────────────────────────────────
// POST /api/ai/generate
// ────────────────────────────────────────────────────────────

router.post('/api/ai/generate', async (req, res) => {
  try {
    const { tool, input, context, options } = req.body as AIRequest;

    // Validation
    if (!input?.trim()) {
      res.status(400).json({
        code: 'INVALID_REQUEST',
        message: 'Input text cannot be empty.',
      });
      return;
    }

    if (!tool) {
      res.status(400).json({
        code: 'INVALID_REQUEST',
        message: 'Tool name is required.',
      });
      return;
    }

    // AI Configuration
    const config = mergeConfig(options);

    if (!config.apiKey) {
      res.status(500).json({
        code: 'MISSING_API_KEY',
        message: 'AI service is not configured.',
      });
      return;
    }

    // Prompt Resolution
    const prompt = getPrompt(tool)?.build({
      tool,
      input,
      context,
      options,
    });

    const enrichedRequest: AIRequest = {
      tool,
      input: prompt?.user ?? input,
      context: {
        ...context,
        ...(prompt && {
          __system: prompt.system,
        }),
      },
      options,
    };

    // Generate
    const provider = getProvider(config.provider);

const result = await provider.generate(
  enrichedRequest,
  config,
);
    res.json(result);
} catch (err) {
  console.error('Route Error:', err);
    if (isAIError(err)) {
      const statusMap: Partial<Record<AIError['code'], number>> = {
        INVALID_REQUEST: 400,
        MISSING_API_KEY: 500,
        AUTH_ERROR: 401,
        RATE_LIMITED: 429,
        CONTENT_FILTERED: 422,
        MODEL_UNAVAILABLE: 503,
        NETWORK_ERROR: 502,
      };

      res.status(statusMap[err.code] ?? 500).json({
        code: err.code,
        message: err.message,
      });

      return;
    }

    res.status(500).json({
      code: 'UNKNOWN_ERROR',
      message: 'An unexpected error occurred.',
    });
  }
});

export default router;