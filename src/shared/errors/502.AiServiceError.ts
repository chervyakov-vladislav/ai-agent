import { AppError } from './AppError';

export class AiServiceError extends AppError {
  constructor(message = 'AI Analysis failed', code = 'AI_SERVICE_ERROR') {
    super(message, 502, code);
  }
}
