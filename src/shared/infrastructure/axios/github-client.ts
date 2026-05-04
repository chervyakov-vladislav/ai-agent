import https from 'node:https';
import axios from 'axios';
import env from '@config/env-config';

export const commonConfig = {
  baseURL: 'https://api.github.com',
  timeout: 60000,
  httpsAgent: new https.Agent({
    keepAlive: true,
    keepAliveMsecs: 1000,
    maxFreeSockets: 10,
    scheduling: 'lifo',
  }),
  headers: {
    Authorization: `Bearer ${env.GITHUB_TOKEN}`,
    'User-Agent': 'AI-Agent-App',
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
