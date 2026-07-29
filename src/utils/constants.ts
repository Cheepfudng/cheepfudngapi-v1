export const API_CONFIG = {
  VERSION: 'v1',
  RATE_LIMIT: { WINDOW_MS: 900000, MAX_REQUESTS: 100 },
};

export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
};

export const MESSAGES = {
  SUCCESS: {
    REGISTRATION: 'Registration successful',
    LOGIN: 'Login successful',
  },
  ERROR: {
    UNAUTHORIZED: 'Authentication required',
    NOT_FOUND: 'Resource not found',
  },
};

export default { API_CONFIG, PAGINATION, MESSAGES };
