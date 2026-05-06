import https from 'node:https';
import axios, { AxiosInstance } from 'axios';
import { envConfig } from '@config/env-config';
import { logger } from '../logger';

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
  instance.interceptors.response.use(
    (response) => response,
    (error) => {
      const sanitizedError = {
        message: error.message,
        code: error.code,
        status: error.response?.status,
        statusText: error.response?.statusText,
        url: error.config?.url,
        method: error.config?.method,
      };

      logger.error(`[GitHub API Error]:`, sanitizedError);

      return Promise.reject(sanitizedError);
    },
  );
};

setupLoggingInterceptors(githubProvider);
setupLoggingInterceptors(githubDiffProvider);
