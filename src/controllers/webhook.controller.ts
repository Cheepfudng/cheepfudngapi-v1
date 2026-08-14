import { Request, Response } from 'express';

import { paymentService } from '../services/service-container';
import { logger } from '../utils/logger';
import { ErrorCode } from '../errors/error-codes';

const HANDLED_EVENTS = new Set(['charge.success', 'charge.failed']);

export class WebhookController {
  // Deliberately not asyncHandler-wrapped in the usual "let it throw" style: this handler
  // must ALWAYS send its own response (400 on bad signature, 200 otherwise) and must never
  // let event processing delay that response — Paystack retries aggressively if it doesn't
  // get a fast 200, and a slow/failed handler would trigger duplicate deliveries.
  handlePaystackWebhook = async (req: Request, res: Response): Promise<void> => {
    const signature = req.headers['x-paystack-signature'];
    const rawBody = req.body as Buffer;

    if (
      typeof signature !== 'string' ||
      !paymentService.verifyWebhookSignature(rawBody, signature)
    ) {
      logger.error('Paystack webhook rejected: invalid or missing signature');
      res.status(400).json({
        status: false,
        message: 'Invalid signature',
        error: { code: ErrorCode.INVALID_WEBHOOK_SIGNATURE },
      });
      return;
    }

    let event: { event?: string; data?: { reference?: string } };
    try {
      event = JSON.parse(rawBody.toString('utf8'));
    } catch {
      logger.error('Paystack webhook rejected: signature valid but body was not valid JSON');
      res.status(400).json({
        status: false,
        message: 'Invalid payload',
        error: { code: ErrorCode.VALIDATION_ERROR },
      });
      return;
    }

    const eventType = event.event ?? 'unknown';
    const reference = event.data?.reference ?? 'unknown';

    const webhookLog = await paymentService.logWebhookEvent(eventType, reference, event);

    // Respond before doing any real work — see class comment.
    res.status(200).json({ status: true, message: 'Webhook received' });

    void this.processAsync(eventType, reference, event, webhookLog._id.toString());
  };

  private async processAsync(
    eventType: string,
    reference: string,
    event: unknown,
    webhookLogId: string
  ): Promise<void> {
    try {
      if (eventType === 'charge.success') {
        await paymentService.processSuccessfulPayment(reference, event);
      } else if (eventType === 'charge.failed') {
        await paymentService.processFailedPayment(reference, event);
      } else if (!HANDLED_EVENTS.has(eventType)) {
        logger.info(
          `Paystack webhook: unhandled event type ${eventType} for ${reference}, ignoring`
        );
      }

      await paymentService.markWebhookProcessed(webhookLogId, true);
    } catch (error) {
      logger.error(`Paystack webhook processing failed for ${reference} (${eventType}): ${error}`);
      await paymentService.markWebhookProcessed(webhookLogId, false).catch(() => {});
    }
  }
}

export const webhookController = new WebhookController();
