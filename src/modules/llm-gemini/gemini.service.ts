import { GoogleGenAI } from '@google/genai';
import { envConfig } from '@config/env-config';
import { AIReviewResponse, ReviewContext } from '@shared/types/review-context.types';
import { AiServiceError } from 'shared/errors/502.AiServiceError';
import { logger } from '@shared/infrastructure/logger/pino-logger';
import { withRetry, isRetryable } from 'shared/infrastructure/clients/http-client.utils';
import { GEMINI_SYSTEM_INSTRUCTION, getReviewPrompt } from './prompts/review.prompt';
import { MODEL_FALLBACKS } from './gemini.constants';
import { aiReviewResponseSchema } from './gemini.validator';

const ai = new GoogleGenAI({
  apiKey: envConfig.GEMINI_API_KEY,
});

const callModel = async (modelName: string, prompt: string): Promise<string> => {
  const startTime = Date.now();

  logger.debug(`[LLM Request] Model: ${modelName}`, {
    promptLength: prompt.length,
    promptSample: prompt.substring(0, 200) + '...',
  });

  try {
    const response = await ai.models.generateContent({
      model: modelName,
      contents: prompt,
      config: {
        systemInstruction: GEMINI_SYSTEM_INSTRUCTION,
        responseMimeType: 'application/json',
      },
    });

    const duration = Date.now() - startTime;

    if (!response.text) {
      throw new AiServiceError(
        `Model ${modelName} returned an empty response`,
        'GEMINI_EMPTY_RESPONSE',
      );
    }

    logger.info(`[LLM Response] Model: ${modelName} Success`, {
      duration: `${duration}ms`,
      responseLength: response.text.length,
      usage: response.usageMetadata, // Полезно для мониторинга токенов
    });

    return response.text;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const duration = Date.now() - startTime;
    logger.error(`[LLM Error] Model: ${modelName}`, error, {
      duration: `${duration}ms`,
      message: errorMessage,
    });
    throw error;
  }
};

export const reviewCode = async (context: ReviewContext): Promise<AIReviewResponse> => {
  const prompt = getReviewPrompt(context);

  for (const modelName of MODEL_FALLBACKS) {
    try {
      const text = await withRetry(() => callModel(modelName, prompt), 1, 2000);

      const validation = aiReviewResponseSchema.safeParse(text);

      if (!validation.success) {
        logger.error('LLM returned invalid JSON structure', {
          model: modelName,
          errors: validation.error.issues,
          rawOutput: text,
        });
        continue;
      }

      return validation.data;
    } catch (error: unknown) {
      if (isRetryable(error) && error.status === 429) {
        logger.warn(`Model ${modelName} rate limited. Trying next available model...`);
        continue;
      }

      if (error instanceof SyntaxError) {
        logger.error('Failed to parse Gemini response', error);
        throw error;
      }

      throw error;
    }
  }

  throw new AiServiceError(
    'All Gemini models exhausted their rate limits',
    'ALL_MODELS_RATE_LIMITED',
  );
};
