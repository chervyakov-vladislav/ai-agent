export default {
  LOG_LEVEl: process.env.LOG_LEVEL || 'info',
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: process.env.PORT || 3000,
  APP_VERSION: process.env.APP_VERSION,
} as const;
