import { getOrgDocumentCategory } from '../config/document-catalog';
import { CampaignRepository } from '../repositories/campaign.repository';
import { OrderRepository } from '../repositories/order.repository';
import { ProductRepository } from '../repositories/product.repository';
import { OrganizationType } from '../types/enums';

export interface SupplyDashboardStats {
  category: 'supply';
  totalProducts: number;
  totalOrders: number;
  // Sum of order.subtotal (not order.total) across paymentStatus: completed orders —
  // deliberately excludes deliveryFee. See OrderRepository.getSellerStats.
  revenue: number;
}

export interface CampaignDashboardStats {
  category: 'campaign';
  activeCampaigns: number;
  // Sum of Campaign.currentFunding across the org's campaigns (already denormalized —
  // never re-touches CampaignFund directly for this aggregate).
  totalRaised: number;
  // Sum of distributionRecords[].beneficiaries across all of the org's campaigns.
  familiesReached: number;
}

// Discriminated on `category` so a caller can never accidentally end up with a
// mixed/wrong-shaped stats object — narrowing on `category` gives the right fields.
export type DashboardStats = SupplyDashboardStats | CampaignDashboardStats;

export class OrganizationService {
  constructor(
    private readonly productRepository: ProductRepository,
    private readonly orderRepository: OrderRepository,
    private readonly campaignRepository: CampaignRepository
  ) {}

  async getDashboardStats(
    orgId: string,
    organizationType: OrganizationType
  ): Promise<DashboardStats> {
    const category = getOrgDocumentCategory(organizationType);

    if (category === 'supply') {
      const [totalProducts, { totalOrders, revenue }] = await Promise.all([
        this.productRepository.countBySeller(orgId),
        this.orderRepository.getSellerStats(orgId),
      ]);

      return { category: 'supply', totalProducts, totalOrders, revenue };
    }

    const { activeCampaigns, totalRaised, familiesReached } =
      await this.campaignRepository.getOrganizationStats(orgId);

    return { category: 'campaign', activeCampaigns, totalRaised, familiesReached };
  }
}
