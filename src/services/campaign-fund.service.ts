import mongoose, { Types } from 'mongoose';

import { AppError } from '../errors/app-error';
import { ErrorCode } from '../errors/error-codes';
import { CampaignFundRepository } from '../repositories/campaign-fund.repository';
import { CampaignRepository } from '../repositories/campaign.repository';
import { MEAL_COST_NGN } from '../utils/constants';

// Deliberately does NOT include the internal `availableBalance` field name — this is the
// only shape getCampaignFundSummary is ever allowed to return. Per BACKEND_RULES §20 and
// TASKS.md scope decision 7: no cash-suggestive field (cashBalance/withdrawable/bankBalance
// or anything similar) may ever appear here, in any form, for any caller.
export interface CampaignFundSummary {
  totalDonated: number;
  totalAllocatedToFood: number;
  totalDelivered: number;
  availableForProcurement: number;
  donorCount: number;
  mealsEquivalent: number;
}

export interface SanitizedDonation {
  donorName: string;
  amount: number;
  donatedAt: Date;
}

export class CampaignFundService {
  constructor(
    private readonly campaignFundRepository: CampaignFundRepository,
    private readonly campaignRepository: CampaignRepository
  ) {}

  // Idempotent — a Campaign always gets exactly one CampaignFund, created alongside it.
  async createFundForCampaign(campaignId: string): Promise<void> {
    const existing = await this.campaignFundRepository.findByCampaign(campaignId);
    if (existing) return;

    await this.campaignFundRepository.create({ campaign: new Types.ObjectId(campaignId) });
  }

  // Called only from PaymentService.processSuccessfulPayment's campaign_donation branch,
  // after the webhook's atomic transaction-claim already guarantees this runs at most once
  // per donation. Fund totals and the Campaign's denormalized currentFunding/donorCount are
  // two different documents updated together — wrapped in a real Mongo transaction, same
  // pattern Phase 11.5 established for checkout, for the same reason (no partial state ever
  // visible if one write succeeds and the other doesn't).
  async recordDonation(
    campaignId: string,
    donorId: string,
    amount: number,
    transactionId: string
  ): Promise<void> {
    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        const donation = {
          donor: new Types.ObjectId(donorId),
          amount,
          transaction: new Types.ObjectId(transactionId),
          donatedAt: new Date(),
        };
        const auditEntry = {
          action: 'donation_received',
          amount,
          actor: new Types.ObjectId(donorId),
          timestamp: new Date(),
        };

        const fund = await this.campaignFundRepository.recordDonation(
          campaignId,
          donation,
          auditEntry,
          session
        );
        if (!fund) {
          throw new AppError('Campaign fund not found', 404, ErrorCode.CAMPAIGN_NOT_FOUND);
        }

        await this.campaignRepository.incrementFunding(campaignId, amount, session);
      });
    } finally {
      await session.endSession();
    }
  }

  async getCampaignFundSummary(campaignId: string): Promise<CampaignFundSummary> {
    const fund = await this.campaignFundRepository.findByCampaign(campaignId);
    if (!fund) throw new AppError('Campaign fund not found', 404, ErrorCode.CAMPAIGN_NOT_FOUND);

    return {
      totalDonated: fund.totalDonated,
      totalAllocatedToFood: fund.totalAllocatedToFood,
      totalDelivered: fund.totalDelivered,
      availableForProcurement: fund.availableBalance,
      donorCount: fund.donations.length,
      mealsEquivalent: Math.floor(fund.totalDonated / MEAL_COST_NGN),
    };
  }

  // Donor identity reduced to name only — never expose email/phone to the campaign org.
  async getSanitizedDonations(campaignId: string): Promise<SanitizedDonation[]> {
    const fund = await this.campaignFundRepository.findByCampaignWithDonors(campaignId);
    if (!fund) throw new AppError('Campaign fund not found', 404, ErrorCode.CAMPAIGN_NOT_FOUND);

    return fund.donations.map((donation) => {
      const donor = donation.donor as unknown as
        | { firstName?: string; lastName?: string }
        | Types.ObjectId;
      const name =
        'firstName' in donor ? `${donor.firstName ?? ''} ${donor.lastName ?? ''}`.trim() : '';

      return {
        donorName: name || 'Anonymous',
        amount: donation.amount,
        donatedAt: donation.donatedAt,
      };
    });
  }
}
