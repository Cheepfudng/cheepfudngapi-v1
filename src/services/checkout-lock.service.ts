import { RedisLock } from '../integrations/redis/redis.lock';
import { logger } from '../utils/logger';

// How long a single buyer is blocked from starting a *new* checkout while an existing
// one is still awaiting payment. This is deliberately NOT "how long the order stays
// reservable" — that's ORDER_EXPIRY_MINUTES (default 30), and this must stay comfortably
// below it so a buyer is never left unable to retry an order the expiry job has already
// released the stock for.
const CHECKOUT_LOCK_TTL_SECONDS = 15 * 60;

const CHECKOUT_LOCK_KEY_PREFIX = 'checkout:lock:';

/**
 * Owns the checkout lock as a domain concept: its key shape, its lifetime, and the fact
 * that its token is the checkoutReference.
 *
 * The lock spans the whole payment attempt, not just the `checkout()` request. It is taken
 * when an order is successfully created and a paymentUrl handed back, and released by
 * whichever of these happens first:
 *
 *   - the webhook confirms payment succeeded (PaymentService.processSuccessfulPayment)
 *   - the webhook confirms payment failed (PaymentService.processFailedPayment)
 *   - the buyer cancels the still-unpaid order (OrderService.cancel)
 *   - the TTL above elapses (an abandoned checkout — no cancel, no webhook either way)
 *
 * Using the checkoutReference as the lock token is what makes release-from-elsewhere safe.
 * A webhook or a cancel for checkout A presents A's reference, so Redis's compare-and-delete
 * refuses to release a lock that checkout B has since taken. Without that, a late webhook
 * for an abandoned checkout could silently unlock a *newer* checkout still awaiting payment.
 */
export class CheckoutLockService {
  constructor(private readonly lock: RedisLock) {}

  private keyFor(buyerId: string): string {
    return `${CHECKOUT_LOCK_KEY_PREFIX}${buyerId}`;
  }

  /** False means another checkout is already in flight for this buyer. */
  async acquire(buyerId: string, checkoutReference: string): Promise<boolean> {
    const token = await this.lock.acquire(
      this.keyFor(buyerId),
      CHECKOUT_LOCK_TTL_SECONDS,
      checkoutReference
    );
    return token !== null;
  }

  /**
   * No-op when the lock is already gone or belongs to a newer checkout — releasing is
   * always safe to call, including more than once for the same checkout (a webhook retry,
   * or a cancel arriving after payment already failed).
   */
  async release(buyerId: string, checkoutReference: string): Promise<void> {
    await this.lock.release(this.keyFor(buyerId), checkoutReference);
    logger.info(`Checkout lock released for buyer ${buyerId} (checkout ${checkoutReference})`);
  }
}
