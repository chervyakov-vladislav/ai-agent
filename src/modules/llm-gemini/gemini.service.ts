import { GoogleGenAI } from '@google/genai';
import envConfig from '@config/env-config';
import { AIReviewResponse, ReviewContext } from '@shared/types/review-context.types';
import { AiServiceError } from '@shared/errors/AiServiceError';
import { GEMINI_SYSTEM_INSTRUCTION, getReviewPrompt } from './prompts/review.prompt';

const ai = new GoogleGenAI({
  apiKey: envConfig.GEMINI_API_KEY,
});

export const geminiService = {
  review: async (context: ReviewContext): Promise<AIReviewResponse> => {
    const prompt = getReviewPrompt(context);

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        systemInstruction: GEMINI_SYSTEM_INSTRUCTION,
        responseMimeType: 'application/json',
      },
    });

    const text = response.text;

    if (!text) {
      throw new AiServiceError('Gemini returned an empty response', 'GEMINI_EMPTY_RESPONSE');
    }

    try {
      return JSON.parse(text) as AIReviewResponse;
    } catch (e) {
      console.error('Raw Gemini JSON error:', text);
      throw e;
    }
  },
};
