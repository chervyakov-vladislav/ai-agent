import { AppError } from './AppError';

export class ServiceUnavailableError extends AppError {
  constructor(message = 'Service is currently overloaded, please try again later') {
    super(message, 503, 'SERVICE_UNAVAILABLE');
  }
}
