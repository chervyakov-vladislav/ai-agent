import axios from 'axios';
import env from '@config/env-config';

export const githubProvider = axios.create({
  baseURL: 'https://api.github.com',
  headers: {
    Authorization: `Bearer ${env.GITHUB_TOKEN}`,
    Accept: 'application/vnd.github.v3+json',
  },
});

export const githubDiffProvider = axios.create({
  baseURL: 'https://api.github.com',
  headers: {
    Authorization: `Bearer ${env.GITHUB_TOKEN}`,
    Accept: 'application/vnd.github.v3.diff', // КРИТИЧНО для получения текста изменений
  },
});
