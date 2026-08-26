import { AppError } from '../errors/app-error';
import { ErrorCode } from '../errors/error-codes';
import { ICampaign } from '../models/campaign.model';
import { IOrder } from '../models/order.model';
import { IUser } from '../models/user.model';
import {
  CampaignPagination,
  CampaignRepository,
  PaginatedCampaigns,
} from '../repositories/campaign.repository';
import {
  AdminOrderFilter,
  OrderPagination,
  OrderRepository,
  PaginatedOrders,
} from '../repositories/order.repository';
import {
  AdminProductFilter,
  PaginatedProducts,
  ProductPagination,
  ProductRepository,
} from '../repositories/product.repository';
import {
  AdminUserFilter,
  PaginatedUsers,
  UserPagination,
  UserRepository,
} from '../repositories/user.repository';
import { VerificationDocumentRepository } from '../repositories/verification-document.repository';
import { EmailProvider } from '../integrations/contracts/email-provider.interface';
import { createOrganizationStatusEmailTemplate } from '../integrations/brevo/templates/organization-status-email.template';
import { createCampaignStatusEmailTemplate } from '../integrations/brevo/templates/campaign-status-email.template';
import { createProductStatusEmailTemplate } from '../integrations/brevo/templates/product-status-email.template';
import { IProduct } from '../models/product.model';
import { CampaignStatus, ProductModerationStatus, UserRole, VerificationStatus } from '../types/enums';

export interface RecentActivityItem {
  type: 'order' | 'campaign';
  id: string;
  summary: string;
  createdAt: Date;
}

export interface AdminDashboard {
  users: { total: number; byRole: Partial<Record<UserRole, number>> };
  orders: { total: number; revenue: number };
  campaigns: { active: number; totalDonated: number };
  pendingVerifications: number;
  recentActivity: RecentActivityItem[];
}

const RECENT_ACTIVITY_LIMIT = 10;

export class AdminService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly documentRepository: VerificationDocumentRepository,
    private readonly emailProvider: EmailProvider,
    private readonly campaignRepository: CampaignRepository,
    private readonly productRepository: ProductRepository,
    private readonly orderRepository: OrderRepository
  ) {}

  async listOrganizations(
    status: VerificationStatus | undefined,
    pagination: UserPagination
  ): Promise<PaginatedUsers> {
    return this.userRepository.findOrganizations(status, pagination);
  }

  async getOrganizationDetail(orgId: string) {
    const user = await this.userRepository.findById(orgId);
    if (!user || user.role !== UserRole.ORGANIZATION) {
      throw new AppError('Organization not found', 404, ErrorCode.USER_NOT_FOUND);
    }
    const documents = await this.documentRepository.findByUser(orgId);
    return { organization: user, documents };
  }

  async reviewOrganization(
    orgId: string,
    decision: 'approved' | 'rejected',
    rejectionReason?: string
  ) {
    const user = await this.userRepository.findById(orgId);
    if (!user || user.role !== UserRole.ORGANIZATION) {
      throw new AppError('Organization not found', 404, ErrorCode.USER_NOT_FOUND);
    }

    if (user.verificationStatus === VerificationStatus.VERIFIED) {
      throw new AppError('Organization is already verified', 409, ErrorCode.CONFLICT);
    }

    if (decision === 'rejected' && !rejectionReason) {
      throw new AppError(
        'rejectionReason is required when rejecting',
        400,
        ErrorCode.VALIDATION_ERROR
      );
    }

    const newStatus =
      decision === 'approved' ? VerificationStatus.VERIFIED : VerificationStatus.REJECTED;
    const updated = await this.userRepository.updateById(orgId, { verificationStatus: newStatus });

    await this.emailProvider.sendEmail({
      to: user.email,
      subject:
        decision === 'approved'
          ? 'Your organization has been verified'
          : 'Update on your organization verification',
      htmlContent: createOrganizationStatusEmailTemplate({
        organizationName: user.organizationName ?? 'your organization',
        approved: decision === 'approved',
        rejectionReason,
      }),
    });

    return updated;
  }

  // Mirrors listOrganizations/reviewOrganization above exactly.
  async listCampaigns(
    status: CampaignStatus = CampaignStatus.PENDING_APPROVAL,
    pagination: CampaignPagination
  ): Promise<PaginatedCampaigns> {
    return this.campaignRepository.findByStatus(status, pagination);
  }

  async reviewCampaign(
    campaignId: string,
    decision: 'approved' | 'rejected',
    rejectionReason?: string
  ): Promise<ICampaign> {
    const campaign = await this.campaignRepository.findById(campaignId);
    if (!campaign) throw new AppError('Campaign not found', 404, ErrorCode.CAMPAIGN_NOT_FOUND);

    if (campaign.status !== CampaignStatus.PENDING_APPROVAL) {
      throw new AppError('Campaign has already been reviewed', 409, ErrorCode.CONFLICT);
    }

    if (decision === 'rejected' && !rejectionReason) {
      throw new AppError(
        'rejectionReason is required when rejecting',
        400,
        ErrorCode.VALIDATION_ERROR
      );
    }

    const newStatus = decision === 'approved' ? CampaignStatus.ACTIVE : CampaignStatus.REJECTED;
    const updated = await this.campaignRepository.updateById(campaignId, {
      status: newStatus,
      ...(decision === 'rejected' && { rejectionReason }),
    });
    if (!updated) throw new AppError('Campaign not found', 404, ErrorCode.CAMPAIGN_NOT_FOUND);

    const org = await this.userRepository.findById(campaign.organization.toString());
    if (org) {
      await this.emailProvider.sendEmail({
        to: org.email,
        subject:
          decision === 'approved' ? 'Your campaign is live!' : 'Update on your campaign submission',
        htmlContent: createCampaignStatusEmailTemplate({
          organizationName: org.organizationName ?? 'your organization',
          campaignTitle: campaign.title,
          approved: decision === 'approved',
          rejectionReason,
        }),
      });
    }

    return updated;
  }

  // ---- Phase 15: platform-wide admin visibility (Users/Orders/Products/Dashboard) ----

  async listUsers(
    filter: AdminUserFilter,
    search: string,
    pagination: UserPagination
  ): Promise<PaginatedUsers> {
    return this.userRepository.findMany(filter, search, pagination);
  }

  // Deactivating a user only blocks their future login — historical orders/campaigns/
  // products stay exactly as they are, untouched.
  async updateUserStatus(userId: string, isActive: boolean): Promise<IUser> {
    const updated = await this.userRepository.updateActiveStatus(userId, isActive);
    if (!updated) throw new AppError('User not found', 404, ErrorCode.USER_NOT_FOUND);
    return updated;
  }

  async listOrders(
    filter: AdminOrderFilter,
    pagination: OrderPagination
  ): Promise<PaginatedOrders> {
    return this.orderRepository.findAllAdmin(filter, pagination);
  }

  // Deliberately bypasses the public isActive/deactivated-seller filtering
  // (ProductRepository.findMany) — admin needs to see everything.
  async listProducts(
    filter: AdminProductFilter,
    pagination: ProductPagination
  ): Promise<PaginatedProducts> {
    return this.productRepository.findManyAdmin(filter, pagination);
  }

  // Mirrors reviewOrganization/reviewCampaign above exactly — same "already reviewed"
  // 409 guard, same rejectionReason-required-when-rejecting rule, same Brevo email pattern.
  async moderateProduct(
    productId: string,
    decision: 'approved' | 'rejected',
    rejectionReason?: string
  ): Promise<IProduct> {
    const product = await this.productRepository.findById(productId);
    if (!product) throw new AppError('Product not found', 404, ErrorCode.PRODUCT_NOT_FOUND);

    if (product.moderationStatus !== ProductModerationStatus.PENDING) {
      throw new AppError('Product has already been reviewed', 409, ErrorCode.CONFLICT);
    }

    if (decision === 'rejected' && !rejectionReason) {
      throw new AppError(
        'rejectionReason is required when rejecting',
        400,
        ErrorCode.VALIDATION_ERROR
      );
    }

    const newStatus =
      decision === 'approved' ? ProductModerationStatus.APPROVED : ProductModerationStatus.REJECTED;
    const updated = await this.productRepository.updateById(productId, {
      moderationStatus: newStatus,
      ...(decision === 'rejected' && { rejectionReason }),
    });
    if (!updated) throw new AppError('Product not found', 404, ErrorCode.PRODUCT_NOT_FOUND);

    const seller = await this.userRepository.findById(product.seller.toString());
    if (seller) {
      await this.emailProvider.sendEmail({
        to: seller.email,
        subject:
          decision === 'approved' ? 'Your product is live!' : 'Update on your product listing',
        htmlContent: createProductStatusEmailTemplate({
          organizationName: seller.organizationName ?? 'your organization',
          productName: product.name,
          approved: decision === 'approved',
          rejectionReason,
        }),
      });
    }

    return updated;
  }

  async getDashboard(): Promise<AdminDashboard> {
    const [usersByRole, orderStats, campaignStats, pendingVerifications, recentOrders, recentCampaigns] =
      await Promise.all([
        this.userRepository.countByRole(),
        this.orderRepository.getOrderStats(),
        this.campaignRepository.getPlatformStats(),
        this.userRepository.countPendingVerifications(),
        this.orderRepository.findRecent(RECENT_ACTIVITY_LIMIT),
        this.campaignRepository.findRecent(RECENT_ACTIVITY_LIMIT),
      ]);

    const totalUsers = Object.values(usersByRole).reduce(
      (sum: number, count) => sum + (count ?? 0),
      0
    );

    const recentActivity = this.buildRecentActivity(recentOrders, recentCampaigns);

    return {
      users: { total: totalUsers, byRole: usersByRole },
      orders: orderStats,
      campaigns: campaignStats,
      pendingVerifications,
      recentActivity,
    };
  }

  // Merges two different collections' "most recent N" into one feed sorted by createdAt —
  // fetching RECENT_ACTIVITY_LIMIT from each source and re-slicing after the merge is
  // simpler and safe here (worst case we over-fetch by LIMIT items), not a real N+1.
  private buildRecentActivity(orders: IOrder[], campaigns: ICampaign[]): RecentActivityItem[] {
    const orderItems: RecentActivityItem[] = orders.map((order) => ({
      type: 'order',
      id: order._id.toString(),
      summary: `Order ${order.orderNumber} — ₦${order.total.toLocaleString()} (${order.orderStatus})`,
      createdAt: order.createdAt,
    }));

    const campaignItems: RecentActivityItem[] = campaigns.map((campaign) => ({
      type: 'campaign',
      id: campaign._id.toString(),
      summary: `Campaign "${campaign.title}" submitted (${campaign.status})`,
      createdAt: campaign.createdAt,
    }));

    return [...orderItems, ...campaignItems]
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, RECENT_ACTIVITY_LIMIT);
  }
}
