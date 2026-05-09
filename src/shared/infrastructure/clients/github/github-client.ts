import https from 'node:https';
import { envConfig } from '@config/env-config';
import { createHttpClient } from '../axios-client';

const githubBaseConfig = {
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

export const githubProvider = createHttpClient('GitHub API', {
  ...githubBaseConfig,
  headers: {
    ...githubBaseConfig.headers,
    Accept: 'application/vnd.github.v3+json',
  },
});

export const githubDiffProvider = createHttpClient('GitHub API', {
  ...githubBaseConfig,
  headers: {
    ...githubBaseConfig.headers,
    Accept: 'application/vnd.github.v3.diff',
    responseType: 'text',
  },
});
