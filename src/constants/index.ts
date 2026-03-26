export const STORAGE_KEYS = {
  SUMMARIES:     'cf_summaries',
  SETTINGS:      'cf_settings',
  HISTORY:       'cf_history',
  ANTHROPIC_KEY: 'cf_anthropic_key',
} as const;

export const EXTENSION_CONFIG = {
  MAX_CONTENT_LENGTH: 10_000,
  MAX_PDF_SIZE_MB: 10,
  REQUEST_TIMEOUT_MS: 30_000,
} as const;
