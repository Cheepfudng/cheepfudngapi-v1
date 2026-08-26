import { FilterQuery, Types } from 'mongoose';

import { AppError } from '../errors/app-error';
import { ErrorCode } from '../errors/error-codes';
import { DocumentStorage } from '../integrations/contracts/document-storage.interface';
import { ICampaign, ICampaignImage } from '../models/campaign.model';
import { CampaignRepository } from '../repositories/campaign.repository';
import { UserRepository } from '../repositories/user.repository';
import {
  CampaignFundService,
  CampaignFundSummary,
  DonationPagination,
  PaginatedSanitizedDonations,
} from './campaign-fund.service';
import { PaymentService } from './payment.service';
import { CampaignStatus, OrganizationType, UrgencyLevel, UserRole, VerificationStatus } from '../types/enums';
import { buildPaginationMeta, parsePagination } from '../utils/pagination';

export interface ListCampaignsQuery {
  urgencyLevel?: string;
  state?: string;
  page?: string;
  limit?: string;
}

export interface CreateCampaignInput {
  title: string;
  description: string;
  urgencyLevel: UrgencyLevel;
  fundingGoal: number;
  foodGoal: { description: string; quantity: number; unit: string };
  distributionPlan?: string;
  location: { state: string; lga: string };
  startDate: Date;
  endDate: Date;
}

export interface UpdateCampaignInput {
  description?: string;
  distributionPlan?: string;
  urgencyLevel?: UrgencyLevel;
  fundingGoal?: number;
}

export interface DistributionRecordInput {
  date: Date;
  quantity: number;
  beneficiaries: number;
  location: string;
}

const CAMPAIGN_ORGANIZATION_TYPES: OrganizationType[] = [
  OrganizationType.NGO,
  OrganizationType.FOUNDATION,
  OrganizationType.RELIGIOUS_BODY,
  OrganizationType.AGENCY,
];

// Accepts either a real Mongoose document (already .toObject()'d by the caller) or a plain
// object from CampaignRepository.findPublic's aggregation pipeline (which never produces
// real Documents) — both shapes carry the same underlying fields, just not the same methods.
const addComputedFields = <
  T extends { fundingGoal: number; currentFunding: number; endDate: Date; donorCount: number },
>(
  campaign: T
): T & { percentage: number; daysLeft: number; totalDonors: number } => {
  const now = Date.now();
  const percentage =
    campaign.fundingGoal > 0
      ? Math.min(100, Math.round((campaign.currentFunding / campaign.fundingGoal) * 100))
      : 0;
  const daysLeft = Math.max(
    0,
    Math.ceil((new Date(campaign.endDate).getTime() - now) / (24 * 60 * 60 * 1000))
  );

  return { ...campaign, percentage, daysLeft, totalDonors: campaign.donorCount };
};

export class CampaignService {
  constructor(
    private readonly campaignRepository: CampaignRepository,
    private readonly campaignFundService: CampaignFundService,
    private readonly userRepository: UserRepository,
    private readonly campaignImageStorage: DocumentStorage,
    private readonly paymentService: PaymentService
  ) {}

  async create(
    orgId: string,
    input: CreateCampaignInput,
    files: Express.Multer.File[]
  ): Promise<ICampaign> {
    await this.assertCampaignOrganization(orgId);
    this.assertValidDates(input.startDate, input.endDate);

    if (input.title.length < 10 || input.title.length > 100) {
      throw new AppError('title must be between 10 and 100 characters', 400, ErrorCode.VALIDATION_ERROR);
    }
    if (input.description.length < 50) {
      throw new AppError('description must be at least 50 characters', 400, ErrorCode.VALIDATION_ERROR);
    }
    if (input.fundingGoal <= 0) {
      throw new AppError('fundingGoal must be greater than 0', 400, ErrorCode.VALIDATION_ERROR);
    }

    const images = await this.uploadImages(files);

    const campaign = await this.campaignRepository.create({
      organization: new Types.ObjectId(orgId),
      title: input.title,
      description: input.description,
      urgencyLevel: input.urgencyLevel,
      fundingGoal: input.fundingGoal,
      foodGoal: input.foodGoal,
      distributionPlan: input.distributionPlan,
      location: input.location,
      images,
      startDate: input.startDate,
      endDate: input.endDate,
      status: CampaignStatus.PENDING_APPROVAL,
    });

    await this.campaignFundService.createFundForCampaign(campaign._id.toString());

    return campaign;
  }

  async update(campaignId: string, orgId: string, updates: UpdateCampaignInput): Promise<ICampaign> {
    const campaign = await this.getOwnedCampaign(campaignId, orgId);

    // Protects donors from goal manipulation after money has already come in.
    if (updates.fundingGoal !== undefined && campaign.currentFunding > 0) {
      throw new AppError(
        'fundingGoal cannot be changed once a campaign has received donations',
        400,
        ErrorCode.VALIDATION_ERROR
      );
    }

    const updated = await this.campaignRepository.updateById(campaignId, {
      ...(updates.description !== undefined && { description: updates.description }),
      ...(updates.distributionPlan !== undefined && { distributionPlan: updates.distributionPlan }),
      ...(updates.urgencyLevel !== undefined && { urgencyLevel: updates.urgencyLevel }),
      ...(updates.fundingGoal !== undefined && { fundingGoal: updates.fundingGoal }),
    });
    if (!updated) throw new AppError('Campaign not found', 404, ErrorCode.CAMPAIGN_NOT_FOUND);
    return updated;
  }

  async postUpdate(campaignId: string, orgId: string, message: string): Promise<ICampaign> {
    await this.getOwnedCampaign(campaignId, orgId);

    // No donor notification here, deliberately — the full Notification domain doesn't
    // exist yet, and looping over every past donor synchronously is the wrong pattern
    // anyway (should be a queued job when that domain gets built).
    const updated = await this.campaignRepository.pushUpdate(campaignId, {
      message,
      postedAt: new Date(),
    });
    if (!updated) throw new AppError('Campaign not found', 404, ErrorCode.CAMPAIGN_NOT_FOUND);
    return updated;
  }

  async addDistributionRecord(
    campaignId: string,
    orgId: string,
    input: DistributionRecordInput,
    files: Express.Multer.File[]
  ): Promise<ICampaign> {
    await this.getOwnedCampaign(campaignId, orgId);

    const media = await this.uploadImages(files, 'cheepfud/campaigns/distribution');

    const updated = await this.campaignRepository.pushDistributionRecord(campaignId, {
      date: input.date,
      quantity: input.quantity,
      beneficiaries: input.beneficiaries,
      location: input.location,
      media,
    });
    if (!updated) throw new AppError('Campaign not found', 404, ErrorCode.CAMPAIGN_NOT_FOUND);
    return updated;
  }

  async browse(query: ListCampaignsQuery) {
    const filter: FilterQuery<ICampaign> = { status: CampaignStatus.ACTIVE };
    if (query.urgencyLevel) filter.urgencyLevel = query.urgencyLevel;
    if (query.state) filter['location.state'] = query.state;

    const { page, limit } = parsePagination(query);
    const { items, total } = await this.campaignRepository.findPublic(filter, { page, limit });

    return {
      campaigns: items.map((item) => addComputedFields(item)),
      meta: buildPaginationMeta(page, limit, total),
    };
  }

  async getById(campaignId: string, requester?: { id: string; role: UserRole }) {
    const campaign = await this.campaignRepository.findById(campaignId);
    if (!campaign) throw new AppError('Campaign not found', 404, ErrorCode.CAMPAIGN_NOT_FOUND);

    const isOwner = !!requester && campaign.organization.toString() === requester.id;
    const isAdmin = requester?.role === UserRole.ADMIN;
    if (campaign.status !== CampaignStatus.ACTIVE && !isOwner && !isAdmin) {
      throw new AppError('Campaign not found', 404, ErrorCode.CAMPAIGN_NOT_FOUND);
    }

    await this.campaignRepository.populateOrganization(campaign);
    return addComputedFields(campaign.toObject());
  }

  async getFundSummary(campaignId: string, orgId: string): Promise<CampaignFundSummary> {
    await this.getOwnedCampaign(campaignId, orgId);
    return this.campaignFundService.getCampaignFundSummary(campaignId);
  }

  async getDonations(
    campaignId: string,
    orgId: string,
    pagination: DonationPagination
  ): Promise<PaginatedSanitizedDonations> {
    await this.getOwnedCampaign(campaignId, orgId);
    return this.campaignFundService.getSanitizedDonations(campaignId, pagination);
  }

  async donate(
    donorId: string,
    campaignId: string,
    amount: number
  ): Promise<{ paymentUrl: string; reference: string }> {
    const donor = await this.userRepository.findById(donorId);
    if (!donor) throw new AppError('User not found', 404, ErrorCode.USER_NOT_FOUND);

    return this.paymentService.initializeDonationPayment(donorId, donor.email, campaignId, amount);
  }

  private async getOwnedCampaign(campaignId: string, orgId: string): Promise<ICampaign> {
    const campaign = await this.campaignRepository.findById(campaignId);
    if (!campaign) throw new AppError('Campaign not found', 404, ErrorCode.CAMPAIGN_NOT_FOUND);

    if (campaign.organization.toString() !== orgId) {
      throw new AppError(
        'You do not have permission to modify this campaign',
        403,
        ErrorCode.FORBIDDEN
      );
    }

    return campaign;
  }

  private assertValidDates(startDate: Date, endDate: Date): void {
    const now = new Date();
    if (startDate <= now) {
      throw new AppError('startDate must be in the future', 400, ErrorCode.VALIDATION_ERROR);
    }
    if (endDate <= startDate) {
      throw new AppError('endDate must be after startDate', 400, ErrorCode.VALIDATION_ERROR);
    }
  }

  private async assertCampaignOrganization(orgId: string): Promise<void> {
    const org = await this.userRepository.findById(orgId);
    if (!org) throw new AppError('User not found', 404, ErrorCode.USER_NOT_FOUND);

    const isVerifiedCampaignOrg =
      org.role === UserRole.ORGANIZATION &&
      org.verificationStatus === VerificationStatus.VERIFIED &&
      !!org.organizationType &&
      CAMPAIGN_ORGANIZATION_TYPES.includes(org.organizationType);

    if (!isVerifiedCampaignOrg) {
      throw new AppError(
        'Only verified NGO, foundation, religious body, or agency organizations can create campaigns',
        403,
        ErrorCode.CAMPAIGN_ORGANIZATION_REQUIRED
      );
    }
  }

  private async uploadImages(
    files: Express.Multer.File[],
    folder = 'cheepfud/campaigns'
  ): Promise<ICampaignImage[]> {
    return Promise.all(
      (files ?? []).map(async (file) => {
        const result = await this.campaignImageStorage.upload(file.buffer, {
          folder,
          resourceType: 'image',
        });
        return { url: result.url, publicId: result.publicId };
      })
    );
  }
}
