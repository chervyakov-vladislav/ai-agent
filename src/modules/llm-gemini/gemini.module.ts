import * as geminiService from './gemini.service';

export const geminiModule = {
  reviewCode: geminiService.reviewCode,
};

export type GeminiModule = typeof geminiModule;
