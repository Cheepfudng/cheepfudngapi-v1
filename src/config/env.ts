import dotenv from 'dotenv';

dotenv.config();

type NodeEnvironment = 'development' | 'staging' | 'production' | 'test';

const getRequiredEnv = (key: string): string => {
  const value = process.env[key]?.trim();

  if (!value || value.toLowerCase() === 'null' || value.toLowerCase() === 'undefined') {
    throw new Error(`Environment variable ${key} is required`);
  }

  return value;
};

const getOptionalEnv = (key: string, defaultValue: string): string => {
  const value = process.env[key]?.trim();

  if (!value || value.toLowerCase() === 'null' || value.toLowerCase() === 'undefined') {
    return defaultValue;
  }

  return value;
};

const getNumberEnv = (key: string, defaultValue: number): number => {
  const value = process.env[key]?.trim();

  if (!value || value.toLowerCase() === 'null' || value.toLowerCase() === 'undefined') {
    return defaultValue;
  }

  const parsedValue = Number(value);

  if (!Number.isFinite(parsedValue)) {
    throw new Error(`Environment variable ${key} must be a valid number`);
  }

  return parsedValue;
};

const nodeEnv = getOptionalEnv('NODE_ENV', 'development') as NodeEnvironment;

const validNodeEnvironments: NodeEnvironment[] = ['development', 'staging', 'production', 'test'];

if (!validNodeEnvironments.includes(nodeEnv)) {
  throw new Error(`NODE_ENV must be one of: ${validNodeEnvironments.join(', ')}`);
}

export const env = {
  NODE_ENV: nodeEnv,

  PORT: getNumberEnv('PORT', 5000),

  API_VERSION: getOptionalEnv('API_VERSION', 'v1'),

  ALLOWED_ORIGINS: getOptionalEnv('ALLOWED_ORIGINS', 'http://localhost:3000')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),

  MONGODB_URI: getRequiredEnv('MONGODB_URI'),

  JWT_SECRET: getRequiredEnv('JWT_SECRET'),
  JWT_EXPIRES_IN: getOptionalEnv('JWT_EXPIRES_IN', '15m'),

  JWT_REFRESH_SECRET: getRequiredEnv('JWT_REFRESH_SECRET'),
  JWT_REFRESH_EXPIRES_IN: getOptionalEnv('JWT_REFRESH_EXPIRES_IN', '7d'),

  REDIS_URL: getRequiredEnv('REDIS_URL'),

  BREVO_API_KEY: getRequiredEnv('BREVO_API_KEY'),
  BREVO_SENDER_EMAIL: getRequiredEnv('BREVO_SENDER_EMAIL'),
  BREVO_SENDER_NAME: getOptionalEnv('BREVO_SENDER_NAME', 'Cheepfud'),

  OTP_LENGTH: getNumberEnv('OTP_LENGTH', 6),
  OTP_EXPIRES_IN_MINUTES: getNumberEnv('OTP_EXPIRES_IN_MINUTES', 10),
  OTP_MAX_ATTEMPTS: getNumberEnv('OTP_MAX_ATTEMPTS', 5),
  OTP_RESEND_COOLDOWN_SECONDS: getNumberEnv('OTP_RESEND_COOLDOWN_SECONDS', 60),

  LOG_LEVEL: getOptionalEnv('LOG_LEVEL', 'info'),
  CLOUDINARY_CLOUD_NAME: getRequiredEnv('CLOUDINARY_CLOUD_NAME'),
  CLOUDINARY_API_KEY: getRequiredEnv('CLOUDINARY_API_KEY'),
  CLOUDINARY_API_SECRET: getRequiredEnv('CLOUDINARY_API_SECRET'),

  SENTRY_DSN: process.env.SENTRY_DSN?.trim() || undefined,
} as const;
