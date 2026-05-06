import { GoogleGenAI } from '@google/genai';
import { envConfig } from '@config/env-config';
import { AIReviewResponse, ReviewContext } from '@shared/types/review-context.types';
import { AiServiceError } from '@shared/errors/AiServiceError';
import { logger } from '@shared/infrastructure/logger/pino-logger';
import { withRetry, hasStatus } from 'shared/infrastructure/clients/axios-utils';
import { GEMINI_SYSTEM_INSTRUCTION, getReviewPrompt } from './prompts/review.prompt';
import { MODEL_FALLBACKS } from './gemini.constants';
import { aiReviewResponseSchema } from './gemini.validator';

const ai = new GoogleGenAI({
  apiKey: envConfig.GEMINI_API_KEY,
});

export const geminiService = {
  async _callModel(modelName: string, prompt: string): Promise<string> {
    const response = await ai.models.generateContent({
      model: modelName,
      contents: prompt,
      config: {
        systemInstruction: GEMINI_SYSTEM_INSTRUCTION,
        responseMimeType: 'application/json',
      },
    });

    if (!response.text) {
      throw new AiServiceError(
        `Model ${modelName} returned an empty response`,
        'GEMINI_EMPTY_RESPONSE',
      );
    }

    return response.text;
  },

  review: async (context: ReviewContext): Promise<AIReviewResponse> => {
    const prompt = getReviewPrompt(context);

    for (const modelName of MODEL_FALLBACKS) {
      try {
        const text = await withRetry(() => geminiService._callModel(modelName, prompt), 1, 2000);

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
        if (hasStatus(error) && error.status === 429) {
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
  },
};
