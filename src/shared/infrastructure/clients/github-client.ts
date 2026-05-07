import https from 'node:https';
import axios, { AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import { envConfig } from '@config/env-config';
import { logger } from '../logger';

interface CustomAxiosConfig extends InternalAxiosRequestConfig {
  metadata: {
    startTime: number;
  };
}

export const commonConfig = {
  baseURL: 'https://api.github.com',
  timeout: 60000,
  httpsAgent: new https.Agent({
    keepAlive: true,
    keepAliveMsecs: 5000,
    maxSockets: 15,
    maxFreeSockets: 10,
    scheduling: 'lifo',
  }),
  headers: {
    Authorization: `Bearer ${envConfig.GITHUB_TOKEN}`,
    'User-Agent': 'AI-Agent-App',
    'X-GitHub-Api-Version': '2022-11-28',
  },
};

export const githubProvider = axios.create({
  ...commonConfig,
  headers: {
    ...commonConfig.headers,
    Accept: 'application/vnd.github.v3+json',
  },
});

export const githubDiffProvider = axios.create({
  ...commonConfig,
  headers: {
    ...commonConfig.headers,
    Accept: 'application/vnd.github.v3.diff',
  },
});

const setupLoggingInterceptors = (instance: AxiosInstance) => {
  instance.interceptors.request.use((config) => {
    (config as any).metadata = { startTime: Date.now() };

    logger.debug(`[GitHub API] Request: ${config.method?.toUpperCase()} ${config.url}`, {
      params: config.params,
    });

    return config;
  });

  instance.interceptors.response.use(
    (response) => {
      const config = response.config as CustomAxiosConfig;
      const startTime = config.metadata?.startTime;
      const duration = startTime ? `${Date.now() - startTime}ms` : 'unknown';

      logger.info(
        `[GitHub API] Response: ${response.config.method?.toUpperCase()} ${response.config.url}`,
        {
          status: response.status,
          duration,
          requestId: response.headers['x-github-request-id'],
        },
      );

      return response;
    },
    (error) => {
      const startTime = error.config?.metadata?.startTime;
      const duration = startTime ? `${Date.now() - startTime}ms` : 'unknown';

      const sanitizedError = {
        message: error.message,
        code: error.code,
        status: error.response?.status,
        url: error.config?.url,
        method: error.config?.method?.toUpperCase(),
        duration,
        apiResponse: error.response?.data,
      };

      logger.error(`[GitHub API Error]`, sanitizedError);

      return Promise.reject(sanitizedError);
    },
  );
};

setupLoggingInterceptors(githubProvider);
setupLoggingInterceptors(githubDiffProvider);
