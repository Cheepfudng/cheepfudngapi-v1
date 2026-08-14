import crypto from 'crypto';
import { Types } from 'mongoose';

import { env } from '../config/env';
import { AppError } from '../errors/app-error';
import { ErrorCode } from '../errors/error-codes';
import { logger } from '../utils/logger';
import { EmailProvider } from '../integrations/contracts/email-provider.interface';
import { PaymentGateway } from '../integrations/contracts/payment-gateway.interface';
import { createNewOrderEmailTemplate } from '../integrations/brevo/templates/new-order-email.template';
import { createOrderConfirmationEmailTemplate } from '../integrations/brevo/templates/order-confirmation-email.template';
import { createDonationConfirmationEmailTemplate } from '../integrations/brevo/templates/donation-confirmation-email.template';
import { createNewDonationEmailTemplate } from '../integrations/brevo/templates/new-donation-email.template';
import { createDonationFailedEmailTemplate } from '../integrations/brevo/templates/donation-failed-email.template';
import { IOrder } from '../models/order.model';
import { ITransaction } from '../models/transaction.model';
import { IWebhookLog } from '../models/webhook-log.model';
import { CampaignFundService } from './campaign-fund.service';
import { CampaignRepository } from '../repositories/campaign.repository';
import { CartRepository } from '../repositories/cart.repository';
import { OrderRepository } from '../repositories/order.repository';
import { TransactionRepository } from '../repositories/transaction.repository';
import { UserRepository } from '../repositories/user.repository';
import { WebhookLogRepository } from '../repositories/webhook-log.repository';
import { CampaignStatus, OrderStatus, PaymentStatus, TransactionType } from '../types/enums';
import { DONATION_MINIMUM_KOBO, MEAL_COST_NGN } from '../utils/constants';
import { generateDonationReference } from '../utils/reference-generator';

export class PaymentService {
  constructor(
    private readonly gateway: PaymentGateway,
    private readonly transactionRepository: TransactionRepository,
    private readonly orderRepository: OrderRepository,
    private readonly cartRepository: CartRepository,
    private readonly webhookLogRepository: WebhookLogRepository,
    private readonly userRepository: UserRepository,
    private readonly emailProvider: EmailProvider,
    private readonly campaignRepository: CampaignRepository,
    private readonly campaignFundService: CampaignFundService
  ) {}

  async initializeDonationPayment(
    donorId: string,
    donorEmail: string,
    campaignId: string,
    amount: number
  ): Promise<{ paymentUrl: string; reference: string }> {
    const campaign = await this.campaignRepository.findById(campaignId);
    if (!campaign) throw new AppError('Campaign not found', 404, ErrorCode.CAMPAIGN_NOT_FOUND);

    if (campaign.status !== CampaignStatus.ACTIVE) {
      throw new AppError(
        'This campaign is not currently accepting donations',
        400,
        ErrorCode.CAMPAIGN_NOT_ACTIVE
      );
    }

    const amountKobo = Math.round(amount * 100);
    if (amountKobo < DONATION_MINIMUM_KOBO) {
      throw new AppError(
        `Minimum donation is ₦${DONATION_MINIMUM_KOBO / 100}`,
        400,
        ErrorCode.VALIDATION_ERROR
      );
    }

    const reference = generateDonationReference();

    const { authorizationUrl } = await this.gateway.initializeTransaction({
      email: donorEmail,
      amountKobo,
      reference,
      metadata: { donorId, campaignId },
    });

    await this.transactionRepository.create({
      transactionReference: reference,
      payer: new Types.ObjectId(donorId),
      amount,
      transactionType: TransactionType.CAMPAIGN_DONATION,
      status: PaymentStatus.PENDING,
      relatedCampaign: new Types.ObjectId(campaignId),
    });

    return { paymentUrl: authorizationUrl, reference };
  }

  async initializeCheckoutPayment(
    buyerId: string,
    buyerEmail: string,
    orders: IOrder[],
    checkoutReference: string
  ): Promise<{ authorizationUrl: string }> {
    const amount = orders.reduce((sum, order) => sum + order.total, 0);

    const { authorizationUrl } = await this.gateway.initializeTransaction({
      email: buyerEmail,
      amountKobo: Math.round(amount * 100),
      reference: checkoutReference,
      metadata: { buyerId, orderNumbers: orders.map((order) => order.orderNumber) },
    });

    await this.transactionRepository.create({
      transactionReference: checkoutReference,
      payer: new Types.ObjectId(buyerId),
      amount,
      transactionType: TransactionType.PRODUCT_PURCHASE,
      status: PaymentStatus.PENDING,
      relatedOrders: orders.map((order) => order._id),
    });

    return { authorizationUrl };
  }

  // crypto.timingSafeEqual requires equal-length buffers, hence the length check before
  // it — a length mismatch alone is a legitimate "not equal," not something to throw on.
  verifyWebhookSignature(rawBody: Buffer, signatureHeader: string | undefined): boolean {
    if (!signatureHeader) return false;

    const expected = crypto
      .createHmac('sha512', env.PAYSTACK_SECRET_KEY)
      .update(rawBody)
      .digest('hex');

    const expectedBuffer = Buffer.from(expected, 'utf8');
    const receivedBuffer = Buffer.from(signatureHeader, 'utf8');

    if (expectedBuffer.length !== receivedBuffer.length) return false;
    return crypto.timingSafeEqual(expectedBuffer, receivedBuffer);
  }

  async logWebhookEvent(event: string, reference: string, payload: unknown): Promise<IWebhookLog> {
    return this.webhookLogRepository.create({
      provider: 'paystack',
      event,
      reference,
      payload,
      processedSuccessfully: false,
    });
  }

  async markWebhookProcessed(webhookLogId: string, success: boolean): Promise<void> {
    await this.webhookLogRepository.updateProcessedStatus(webhookLogId, success);
  }

  async processSuccessfulPayment(reference: string, gatewayPayload: unknown): Promise<void> {
    // Atomic claim: only the caller that actually flips pending -> completed proceeds.
    // A duplicate/concurrent charge.success for the same reference gets null back here
    // and returns immediately — no double order updates, no double cart-clear, no
    // duplicate emails.
    const transaction = await this.transactionRepository.markCompletedIfPending(
      reference,
      gatewayPayload
    );
    if (!transaction) {
      logger.info(
        `charge.success for ${reference}: not claimed (already processed, or unknown reference) — skipping`
      );
      return;
    }

    const paidAmountKobo = extractAmountKobo(gatewayPayload);
    const expectedKobo = Math.round(transaction.amount * 100);
    if (paidAmountKobo !== null && paidAmountKobo !== expectedKobo) {
      // The transaction has already been claimed/marked completed above (the atomic step
      // can't also validate amount), so this is a paid-but-mismatched-amount case that
      // needs a human, not automatic order fulfillment. Orders/fund are deliberately left
      // unresolved rather than flipped to completed.
      logger.error(
        `AMOUNT MISMATCH on transaction ${reference}: expected ${expectedKobo} kobo, Paystack reports ${paidAmountKobo} kobo. Left unresolved for manual review.`
      );
      return;
    }

    if (transaction.transactionType === TransactionType.CAMPAIGN_DONATION) {
      await this.processSuccessfulDonation(transaction);
      return;
    }

    await this.orderRepository.updatePaymentStatusForOrders(
      transaction.relatedOrders,
      PaymentStatus.COMPLETED
    );

    const buyer = await this.userRepository.findById(transaction.payer.toString());
    if (buyer) {
      await this.cartRepository.deleteByUser(buyer._id.toString());
    }

    // Payment has already succeeded at this point — an email failure must never appear to
    // the caller as a payment failure, so it's caught and logged, never rethrown.
    try {
      await this.sendOrderEmails(
        transaction.relatedOrders.map((id) => id.toString()),
        buyer?.email,
        buyer?.firstName
      );
    } catch (error) {
      logger.error(`Failed to send order confirmation emails for ${reference}: ${error}`);
    }
  }

  async processFailedPayment(reference: string, gatewayPayload: unknown): Promise<void> {
    // Same atomic-claim guard as processSuccessfulPayment — also the reason a late
    // charge.failed can never downgrade a transaction a charge.success already completed.
    const transaction = await this.transactionRepository.markFailedIfPending(
      reference,
      gatewayPayload
    );
    if (!transaction) {
      logger.info(
        `charge.failed for ${reference}: not claimed (already processed, or unknown reference) — skipping`
      );
      return;
    }

    if (transaction.transactionType === TransactionType.CAMPAIGN_DONATION) {
      // Nothing to restore — a donation never touches stock or a cart, and nothing was
      // ever added to the CampaignFund on the failure path (funds are only recorded on
      // confirmed success). Just notify the donor.
      await this.notifyDonorOfFailure(transaction);
      return;
    }

    const orders = await this.orderRepository.findByIds(
      transaction.relatedOrders.map((id) => id.toString())
    );

    await Promise.all(
      orders.map((order) => this.orderRepository.restoreStockForItems(order.items))
    );

    await this.orderRepository.updatePaymentStatusForOrders(
      transaction.relatedOrders,
      PaymentStatus.FAILED,
      OrderStatus.CANCELLED
    );
  }

  // Records the donation against the CampaignFund/Campaign (its own Mongo transaction,
  // see CampaignFundService.recordDonation), then emails the donor and the campaign org.
  // Payment has already succeeded by the time this runs — an email failure must never
  // surface as a payment failure, same pattern as sendOrderEmails below.
  private async processSuccessfulDonation(transaction: ITransaction): Promise<void> {
    if (!transaction.relatedCampaign) {
      logger.error(
        `Transaction ${transaction.transactionReference} is a campaign_donation with no relatedCampaign — skipping fund update`
      );
      return;
    }

    const campaignId = transaction.relatedCampaign.toString();
    const donorId = transaction.payer.toString();

    await this.campaignFundService.recordDonation(
      campaignId,
      donorId,
      transaction.amount,
      transaction._id.toString()
    );

    try {
      const [donor, campaign] = await Promise.all([
        this.userRepository.findById(donorId),
        this.campaignRepository.findById(campaignId),
      ]);
      if (!donor || !campaign) return;

      await this.emailProvider.sendEmail({
        to: donor.email,
        subject: 'Thank you for your donation',
        htmlContent: createDonationConfirmationEmailTemplate({
          donorName: donor.firstName ?? 'there',
          campaignTitle: campaign.title,
          amount: transaction.amount,
          mealsEquivalent: Math.floor(transaction.amount / MEAL_COST_NGN),
        }),
      });

      const org = await this.userRepository.findById(campaign.organization.toString());
      if (org) {
        await this.emailProvider.sendEmail({
          to: org.email,
          subject: 'New donation received',
          htmlContent: createNewDonationEmailTemplate({
            organizationName: org.organizationName ?? 'there',
            campaignTitle: campaign.title,
            amount: transaction.amount,
          }),
        });
      }
    } catch (error) {
      logger.error(
        `Failed to send donation emails for ${transaction.transactionReference}: ${error}`
      );
    }
  }

  private async notifyDonorOfFailure(transaction: ITransaction): Promise<void> {
    if (!transaction.relatedCampaign) return;

    try {
      const [donor, campaign] = await Promise.all([
        this.userRepository.findById(transaction.payer.toString()),
        this.campaignRepository.findById(transaction.relatedCampaign.toString()),
      ]);
      if (!donor || !campaign) return;

      await this.emailProvider.sendEmail({
        to: donor.email,
        subject: 'Your donation could not be completed',
        htmlContent: createDonationFailedEmailTemplate({
          donorName: donor.firstName ?? 'there',
          campaignTitle: campaign.title,
          amount: transaction.amount,
        }),
      });
    } catch (error) {
      logger.error(
        `Failed to send donation-failed email for ${transaction.transactionReference}: ${error}`
      );
    }
  }

  private async sendOrderEmails(
    orderIds: string[],
    buyerEmail: string | undefined,
    buyerName: string | undefined
  ): Promise<void> {
    const orders = await this.orderRepository.findByIds(orderIds);
    if (orders.length === 0) return;

    if (buyerEmail) {
      await this.emailProvider.sendEmail({
        to: buyerEmail,
        subject: 'Your Cheepfud order is confirmed',
        htmlContent: createOrderConfirmationEmailTemplate({
          buyerName: buyerName ?? 'there',
          orders: orders.map((order) => ({ orderNumber: order.orderNumber, total: order.total })),
        }),
      });
    }

    // Each Order belongs to exactly one seller by construction (Phase 11 splits the cart
    // per seller at checkout), so items[0].seller is that order's seller.
    const bySeller = new Map<string, IOrder[]>();
    for (const order of orders) {
      const sellerId = order.items[0]?.seller.toString();
      if (!sellerId) continue;
      if (!bySeller.has(sellerId)) bySeller.set(sellerId, []);
      bySeller.get(sellerId)!.push(order);
    }

    await Promise.all(
      Array.from(bySeller.entries()).map(async ([sellerId, sellerOrders]) => {
        const seller = await this.userRepository.findById(sellerId);
        if (!seller) return;

        await this.emailProvider.sendEmail({
          to: seller.email,
          subject: 'You have a new order on Cheepfud',
          htmlContent: createNewOrderEmailTemplate({
            organizationName: seller.organizationName ?? 'there',
            orders: sellerOrders.map((order) => ({
              orderNumber: order.orderNumber,
              total: order.total,
              itemCount: order.items.length,
            })),
          }),
        });
      })
    );
  }
}

const extractAmountKobo = (payload: unknown): number | null => {
  if (typeof payload !== 'object' || payload === null) return null;
  const data = (payload as { data?: unknown }).data;
  if (typeof data !== 'object' || data === null) return null;
  const amount = (data as { amount?: unknown }).amount;
  return typeof amount === 'number' ? amount : null;
};
