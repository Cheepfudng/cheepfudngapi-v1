import cron from 'node-cron';

import { orderService } from '../services/service-container';
import { logger } from '../utils/logger';

// Implementation detail, not an env var — unlike ORDER_EXPIRY_MINUTES (a real business
// tuning knob), how often the sweep runs doesn't need runtime configuration.
const CRON_SCHEDULE = '*/5 * * * *';

// In-process cron, not a separate Render Cron Job or Redis-based scheduler — the API
// process is already always-on, so no new infrastructure is needed. Multi-instance safety
// comes from OrderService.expireStaleOrders' self-guarding query (see its own comment),
// not a distributed lock — deliberately not adding one here.
export const startOrderExpiryJob = (): void => {
  cron.schedule(CRON_SCHEDULE, async () => {
    try {
      await orderService.expireStaleOrders();
    } catch (error) {
      logger.error(`Order auto-expiry job failed: ${error}`);
    }
  });

  logger.info('✅ Order auto-expiry cron job scheduled (every 5 minutes)');
};
