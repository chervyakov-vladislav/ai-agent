import { AppError } from './AppError';

export class HttpClientError extends AppError {
  public readonly url?: string;
  public readonly method?: string;
  public readonly duration?: string;
  public readonly data?: unknown;

  constructor(payload: {
    message: string;
    status: number;
    code: string;
    url?: string;
    method?: string;
    duration?: string;
    data?: unknown;
  }) {
    super(payload.message, payload.status, payload.code);

    this.url = payload.url;
    this.method = payload.method;
    this.duration = payload.duration;
    this.data = payload.data;
  }

  override toJSON() {
    return {
      ...super.toJSON(),
      url: this.url,
      method: this.method,
      duration: this.duration,
      data: this.data,
    };
  }
}
