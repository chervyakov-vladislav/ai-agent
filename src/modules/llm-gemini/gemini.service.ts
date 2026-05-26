import { GoogleGenAI } from '@google/genai';
import { envConfig } from '@config/env-config';
import { AIReviewResponse, ReviewComment } from '@contracts/llm.types';
import { AiServiceError } from '@shared/errors/502.AiServiceError';
import { logger } from '@shared/infrastructure/logger/pino-logger';
import { withRetry, isRetryable } from '@shared/infrastructure/clients/http-client.utils';

import {
  GEMINI_STEP1_SYSTEM_INSTRUCTION,
  getStep1Prompt,
  GEMINI_STEP2_SYSTEM_INSTRUCTION,
  getStep2Prompt,
} from './prompts/review.pipeline.prompt';

import { MODEL_FALLBACKS } from './gemini.constants';
import { aiReviewResponseSchema, aiSingleFileReviewResponseSchema } from './gemini.validator';

const ai = new GoogleGenAI({
  apiKey: envConfig.GEMINI_API_KEY,
});

const callModel = async (
  modelName: string,
  prompt: string,
  systemInstruction: string,
): Promise<string> => {
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
        systemInstruction: systemInstruction,
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

    logger.info(`[LLM Response] Model: ${modelName} Success`, { duration: `${duration}ms` });

    return response.text;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error(`[LLM Error] Model: ${modelName}`, error, { message: errorMessage });
    throw error;
  }
};

export const reviewSingleFile = async (
  diffData: string,
  vectorContext: string,
): Promise<{ reviews: ReviewComment[] }> => {
  const prompt = getStep1Prompt(diffData, vectorContext);

  for (const modelName of MODEL_FALLBACKS) {
    try {
      const text = await withRetry(
        () => callModel(modelName, prompt, GEMINI_STEP1_SYSTEM_INSTRUCTION),
        5,
        20_000,
      );
      const validation = aiSingleFileReviewResponseSchema.safeParse(text);

      if (!validation.success) {
        logger.error('LLM returned invalid JSON structure for single file', {
          errors: validation.error.issues,
        });
        continue;
      }
      return validation.data;
    } catch (error: unknown) {
      if (isRetryable(error) && error.status === 429) continue;
      if (error instanceof SyntaxError) throw error;
      throw error;
    }
  }
  throw new AiServiceError(
    'All Gemini models exhausted their rate limits (Step 1)',
    'ALL_MODELS_RATE_LIMITED',
  );
};

export const generateSummary = async (
  step1Outputs: { reviews: ReviewComment[] }[],
): Promise<AIReviewResponse> => {
  const prompt = getStep2Prompt(step1Outputs);

  for (const modelName of MODEL_FALLBACKS) {
    try {
      const text = await withRetry(
        () => callModel(modelName, prompt, GEMINI_STEP2_SYSTEM_INSTRUCTION),
        5,
        20_000,
      );
      const validation = aiReviewResponseSchema.safeParse(text);

      if (!validation.success) {
        logger.error('LLM returned invalid JSON structure for summary', {
          errors: validation.error.issues,
        });
        continue;
      }
      return validation.data;
    } catch (error: unknown) {
      if (isRetryable(error) && error.status === 429) continue;
      if (error instanceof SyntaxError) throw error;
      throw error;
    }
  }
  throw new AiServiceError(
    'All Gemini models exhausted their rate limits (Step 2)',
    'ALL_MODELS_RATE_LIMITED',
  );
};
