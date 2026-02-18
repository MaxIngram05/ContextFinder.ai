export const API_BASE_URL = process.env.API_BASE_URL ?? '';

export const API_ENDPOINTS = {
  SUMMARIZE: '/summarize',
  ASK: '/ask',
} as const;

export const STORAGE_KEYS = {
  SUMMARIES: 'cf_summaries',
  SETTINGS: 'cf_settings',
  HISTORY: 'cf_history',
} as const;

export const EXTENSION_CONFIG = {
  MAX_CONTENT_LENGTH: 10_000,
  MAX_PDF_SIZE_MB: 10,
  REQUEST_TIMEOUT_MS: 30_000,
} as const;
