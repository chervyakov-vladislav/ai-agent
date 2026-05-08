import axios, { AxiosInstance, InternalAxiosRequestConfig, CreateAxiosDefaults } from 'axios';
import { logger } from '../logger';

interface CustomMetadata {
  startTime: number;
}

interface InternalConfigWithMetadata extends InternalAxiosRequestConfig {
  metadata: CustomMetadata;
}

export const createHttpClient = (
  serviceName: string,
  options: CreateAxiosDefaults,
): AxiosInstance => {
  const instance = axios.create(options);

  instance.interceptors.request.use((config) => {
    (config as InternalConfigWithMetadata).metadata = { startTime: Date.now() };

    logger.debug(`[${serviceName}] Request: ${config.method?.toUpperCase()} ${config.url}`, {
      params: config.params,
    });
    return config;
  });

  instance.interceptors.response.use(
    (response) => {
      const config = response.config as InternalConfigWithMetadata;
      const duration = Date.now() - config.metadata.startTime;

      logger.info(`[${serviceName}] Response: ${config.method?.toUpperCase()} ${config.url}`, {
        status: response.status,
        duration: `${duration}ms`,
        requestId: response.headers['x-github-request-id'] || response.headers['x-request-id'],
      });

      return response;
    },
    (error) => {
      const config = error.config as InternalConfigWithMetadata;
      const duration = config?.metadata ? `${Date.now() - config.metadata.startTime}ms` : 'unknown';

      const errorPayload = {
        message: error.message,
        status: error.response?.status,
        url: error.config?.url,
        method: error.config?.method?.toUpperCase(),
        duration,
        data: error.response?.data,
      };

      logger.error(`[${serviceName} Error]`, errorPayload);
      return Promise.reject(errorPayload);
    },
  );

  return instance;
};
