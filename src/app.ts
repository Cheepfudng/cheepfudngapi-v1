import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import otpRoutes from './routes/otp.routes';
import onboardingRoutes from './routes/onboarding.routes';
import { apiReference } from '@scalar/express-api-reference';
import { openApiDocument } from './docs/openapi';
import authRoutes from './routes/auth.routes';

import { env } from './config/env';
import { errorHandler } from './middleware/errorHandler';

const app: Application = express();

// Security middleware
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],

        scriptSrc: ["'self'", "'unsafe-inline'", 'https://cdn.jsdelivr.net'],

        styleSrc: ["'self'", "'unsafe-inline'", 'https://cdn.jsdelivr.net'],

        imgSrc: ["'self'", 'data:', 'https:'],

        connectSrc: ["'self'", 'https://cdn.jsdelivr.net'],

        fontSrc: ["'self'", 'https:', 'data:'],
      },
    },
  })
);

app.use(
  cors({
    origin: env.ALLOWED_ORIGINS,
    credentials: true,
  })
);

// Body parsing
app.use(express.json({ limit: '10mb' }));

app.use(
  express.urlencoded({
    extended: true,
    limit: '10mb',
  })
);

// Compression
app.use(compression());

// Logging
if (env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

app.use(
  '/docs',
  apiReference({
    spec: {
      content: openApiDocument,
    },
  })
);

// Health check
app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'success',
    message: 'Cheepfud API is running',
    timestamp: new Date().toISOString(),
  });
});

// API root
app.get(`/`, (_req: Request, res: Response) => {
  res.status(200).json({
    status: true,
    message: 'Welcome to Cheepfud API',
    version: env.API_VERSION,
  });
});

app.use(`/${env.API_VERSION}/otp`, otpRoutes);

app.use(`/${env.API_VERSION}/onboarding`, onboardingRoutes);
app.use(`/${env.API_VERSION}/auth`, authRoutes);

// 404 handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({
    status: false,
    error: {
      code: 'NOT_FOUND',
      message: 'Resource not found',
    },
  });
});

// Global error handler
app.use(errorHandler);

export default app;
