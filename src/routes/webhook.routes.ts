import express, { Router } from 'express';

import { webhookController } from '../controllers/webhook.controller';
import { asyncHandler } from '../utils/async-handler';

const router = Router();

// No `protect` — the HMAC signature check inside the controller IS the authentication.
// express.raw() (not the app-wide express.json()) is required here: signature
// verification needs the exact raw bytes Paystack signed, which JSON.parse-then-restringify
// can't reliably reproduce. This route must be mounted in app.ts BEFORE the global
// express.json()/urlencoded() middleware, or that middleware will have already consumed
// the body by the time this router's own express.raw() gets to run.
router.post(
  '/paystack',
  express.raw({ type: 'application/json' }),
  asyncHandler(webhookController.handlePaystackWebhook)
);

export default router;
