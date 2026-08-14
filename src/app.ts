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
import adminRoutes from './routes/admin.routes';

import { env } from './config/env';
import { errorHandler } from './middleware/errorHandler';
import organizationRoutes from './routes/organization.routes';
import productRoutes from './routes/product.routes';
import cartRoutes from './routes/cart.routes';
import userRoutes from './routes/user.routes';
import orderRoutes from './routes/order.routes';
import webhookRoutes from './routes/webhook.routes';
import campaignRoutes from './routes/campaign.routes';

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

// Paystack webhook: MUST be mounted before the global express.json()/urlencoded() below.
// Signature verification needs the exact raw request bytes; once express.json() has
// consumed the stream for JSON parsing, that raw body is gone. The route itself applies
// express.raw() only to this one path (see webhook.routes.ts) — everything else in the
// app still gets normal JSON body parsing.
app.use(`/${env.API_VERSION}/webhooks`, webhookRoutes);

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
app.use(`/${env.API_VERSION}/organizations`, organizationRoutes);
app.use(`/${env.API_VERSION}/admin`, adminRoutes);
app.use(`/${env.API_VERSION}/products`, productRoutes);
app.use(`/${env.API_VERSION}/cart`, cartRoutes);
app.use(`/${env.API_VERSION}/users`, userRoutes);
app.use(`/${env.API_VERSION}/orders`, orderRoutes);
app.use(`/${env.API_VERSION}/campaigns`, campaignRoutes);

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
