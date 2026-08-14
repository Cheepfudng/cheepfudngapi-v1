import { ClientSession } from 'mongoose';

import {
  CampaignFundModel,
  ICampaignDonation,
  ICampaignFund,
  ICampaignFundAuditEntry,
} from '../models/campaign-fund.model';

export class CampaignFundRepository {
  async create(
    data: Partial<ICampaignFund>,
    session?: ClientSession
  ): Promise<ICampaignFund> {
    const [fund] = await CampaignFundModel.create([data], session ? { session } : undefined);
    return fund;
  }

  async findByCampaign(campaignId: string, session?: ClientSession): Promise<ICampaignFund | null> {
    const query = CampaignFundModel.findOne({ campaign: campaignId });
    return session ? query.session(session) : query;
  }

  async findByCampaignWithDonors(campaignId: string): Promise<ICampaignFund | null> {
    return CampaignFundModel.findOne({ campaign: campaignId }).populate(
      'donations.donor',
      'firstName lastName'
    );
  }

  // Pushes the donation + audit entry and increments totalDonated on the SAME document
  // instance via .save() (not findOneAndUpdate) so the pre('save') availableBalance
  // recalculation hook actually runs — an atomic $inc/$push wouldn't trigger it. Returns
  // null if no fund exists for this campaign (shouldn't happen in practice since
  // CampaignService.create always creates one, but defensive rather than assumed).
  async recordDonation(
    campaignId: string,
    donation: ICampaignDonation,
    auditEntry: ICampaignFundAuditEntry,
    session: ClientSession
  ): Promise<ICampaignFund | null> {
    const fund = await CampaignFundModel.findOne({ campaign: campaignId }).session(session);
    if (!fund) return null;

    fund.donations.push(donation);
    fund.totalDonated += donation.amount;
    fund.auditTrail.push(auditEntry);

    await fund.save({ session });
    return fund;
  }
}
