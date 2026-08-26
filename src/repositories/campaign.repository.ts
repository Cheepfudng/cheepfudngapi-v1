import { ClientSession, FilterQuery, Types } from 'mongoose';

import { ICampaign, ICampaignDistributionRecord, ICampaignUpdate, CampaignModel } from '../models/campaign.model';
import { CampaignStatus } from '../types/enums';

export interface CampaignOrganizationStats {
  activeCampaigns: number;
  totalRaised: number;
  familiesReached: number;
}

const PUBLIC_ORGANIZATION_FIELDS = 'organizationName organizationType';

export interface CampaignPagination {
  page: number;
  limit: number;
}

export interface PaginatedCampaigns {
  items: ICampaign[];
  total: number;
}

// Ranks urgencyLevel for sorting (critical first) — used inside the aggregation pipeline
// in findPublic, since Mongo's default sort has no concept of this domain's priority order.
const URGENCY_RANK_EXPRESSION = {
  $switch: {
    branches: [
      { case: { $eq: ['$urgencyLevel', 'critical'] }, then: 0 },
      { case: { $eq: ['$urgencyLevel', 'high'] }, then: 1 },
      { case: { $eq: ['$urgencyLevel', 'medium'] }, then: 2 },
      { case: { $eq: ['$urgencyLevel', 'low'] }, then: 3 },
    ],
    default: 4,
  },
};

export class CampaignRepository {
  async create(data: Partial<ICampaign>): Promise<ICampaign> {
    return CampaignModel.create(data);
  }

  async findById(campaignId: string): Promise<ICampaign | null> {
    return CampaignModel.findById(campaignId);
  }

  async findByOrganization(
    organizationId: string,
    pagination: CampaignPagination
  ): Promise<PaginatedCampaigns> {
    const { page, limit } = pagination;
    const skip = (page - 1) * limit;
    const filter: FilterQuery<ICampaign> = { organization: organizationId };

    const [items, total] = await Promise.all([
      CampaignModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      CampaignModel.countDocuments(filter),
    ]);

    return { items, total };
  }

  // Public browse: status: active campaigns only (caller passes that in `filter`), sorted
  // by urgency (critical first) then recency. Uses aggregation rather than .find().sort()
  // because Mongo's native sort has no way to express the custom urgency priority order —
  // same $lookup-for-pagination-accuracy reasoning as ProductRepository.findMany's
  // deactivated-seller exclusion.
  async findPublic(
    filter: FilterQuery<ICampaign>,
    pagination: CampaignPagination
  ): Promise<PaginatedCampaigns> {
    const { page, limit } = pagination;
    const skip = (page - 1) * limit;

    const basePipeline = [
      { $match: filter },
      { $addFields: { urgencyRank: URGENCY_RANK_EXPRESSION } },
    ];

    const [items, totalResult] = await Promise.all([
      CampaignModel.aggregate([
        ...basePipeline,
        { $sort: { urgencyRank: 1, createdAt: -1 } },
        { $skip: skip },
        { $limit: limit },
        {
          $lookup: {
            from: 'users',
            localField: 'organization',
            foreignField: '_id',
            as: 'organizationDoc',
          },
        },
        { $unwind: '$organizationDoc' },
        {
          $addFields: {
            organization: {
              _id: '$organizationDoc._id',
              organizationName: '$organizationDoc.organizationName',
              organizationType: '$organizationDoc.organizationType',
            },
          },
        },
        { $project: { organizationDoc: 0, urgencyRank: 0 } },
      ]),
      CampaignModel.aggregate([...basePipeline, { $count: 'total' }]),
    ]);

    return { items: items as ICampaign[], total: totalResult[0]?.total ?? 0 };
  }

  // Admin listing (Phase 16: paginated) — filter by status, most recent first. Used to
  // mirror UserRepository.findOrganizations's unpaginated shape exactly; both were fixed
  // together in the Phase 16 pagination-standardization audit.
  async findByStatus(
    status: CampaignStatus,
    pagination: CampaignPagination
  ): Promise<PaginatedCampaigns> {
    const { page, limit } = pagination;
    const skip = (page - 1) * limit;
    const filter = { status };

    const [items, total] = await Promise.all([
      CampaignModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      CampaignModel.countDocuments(filter),
    ]);

    return { items, total };
  }

  async updateById(campaignId: string, data: Partial<ICampaign>): Promise<ICampaign | null> {
    return CampaignModel.findByIdAndUpdate(campaignId, data, { new: true, runValidators: true });
  }

  async populateOrganization(campaign: ICampaign): Promise<ICampaign> {
    return campaign.populate('organization', PUBLIC_ORGANIZATION_FIELDS);
  }

  // Denormalized-field sync, kept mechanical here — the decision of *when* to call this
  // (only from CampaignFundService.recordDonation, inside the same transaction as the fund
  // update) is a business rule that lives in the service, not here.
  async incrementFunding(
    campaignId: string,
    amount: number,
    session?: ClientSession
  ): Promise<ICampaign | null> {
    return CampaignModel.findOneAndUpdate(
      { _id: campaignId },
      { $inc: { currentFunding: amount, donorCount: 1 } },
      { new: true, session }
    );
  }

  async pushUpdate(campaignId: string, update: ICampaignUpdate): Promise<ICampaign | null> {
    return CampaignModel.findByIdAndUpdate(
      campaignId,
      { $push: { campaignUpdates: update } },
      { new: true }
    );
  }

  // Dashboard stat, single aggregation via $facet: one sub-pipeline groups campaign-level
  // fields (totalRaised, activeCampaigns), the other unwinds distributionRecords to sum
  // beneficiaries. Kept in separate $facet branches deliberately — unwinding
  // distributionRecords in the same pipeline as the campaign-level group would multiply
  // each campaign document per distribution record, corrupting activeCampaigns/totalRaised.
  async getOrganizationStats(organizationId: string): Promise<CampaignOrganizationStats> {
    const [result] = await CampaignModel.aggregate<{
      totals: { activeCampaigns: number; totalRaised: number }[];
      families: { familiesReached: number }[];
    }>([
      { $match: { organization: new Types.ObjectId(organizationId) } },
      {
        $facet: {
          totals: [
            {
              $group: {
                _id: null,
                totalRaised: { $sum: '$currentFunding' },
                activeCampaigns: {
                  $sum: { $cond: [{ $eq: ['$status', CampaignStatus.ACTIVE] }, 1, 0] },
                },
              },
            },
          ],
          families: [
            { $unwind: { path: '$distributionRecords', preserveNullAndEmptyArrays: true } },
            {
              $group: {
                _id: null,
                familiesReached: { $sum: { $ifNull: ['$distributionRecords.beneficiaries', 0] } },
              },
            },
          ],
        },
      },
    ]);

    return {
      activeCampaigns: result?.totals[0]?.activeCampaigns ?? 0,
      totalRaised: result?.totals[0]?.totalRaised ?? 0,
      familiesReached: result?.families[0]?.familiesReached ?? 0,
    };
  }

  async pushDistributionRecord(
    campaignId: string,
    record: ICampaignDistributionRecord
  ): Promise<ICampaign | null> {
    return CampaignModel.findByIdAndUpdate(
      campaignId,
      { $push: { distributionRecords: record } },
      { new: true }
    );
  }

  // Platform-wide dashboard stat (Phase 15, distinct from getOrganizationStats above):
  // active campaign count + total donated across EVERY campaign, not scoped to one org.
  // Reuses the already-denormalized Campaign.currentFunding, same as getOrganizationStats —
  // never re-touches the more sensitive CampaignFund model for this aggregate.
  async getPlatformStats(): Promise<{ active: number; totalDonated: number }> {
    const [result] = await CampaignModel.aggregate<{ active: number; totalDonated: number }>([
      {
        $group: {
          _id: null,
          totalDonated: { $sum: '$currentFunding' },
          active: { $sum: { $cond: [{ $eq: ['$status', CampaignStatus.ACTIVE] }, 1, 0] } },
        },
      },
    ]);

    return { active: result?.active ?? 0, totalDonated: result?.totalDonated ?? 0 };
  }

  // Dashboard widget: last N campaign submissions across the whole platform, any status —
  // merged with OrderRepository.findRecent in AdminService to build the combined activity feed.
  async findRecent(limit: number): Promise<ICampaign[]> {
    return CampaignModel.find()
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('organization', 'organizationName');
  }
}
