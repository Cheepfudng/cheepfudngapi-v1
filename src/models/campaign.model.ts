import { Document, Schema, Types, model } from 'mongoose';

import { CampaignStatus, UrgencyLevel } from '../types/enums';

export interface ICampaignImage {
  url: string;
  publicId: string;
}

export interface ICampaignFoodGoal {
  description: string;
  quantity: number;
  unit: string;
}

export interface ICampaignLocation {
  state: string;
  lga: string;
}

export interface ICampaignUpdate {
  message: string;
  postedAt: Date;
}

export interface ICampaignDistributionRecord {
  date: Date;
  quantity: number;
  beneficiaries: number;
  location: string;
  media: ICampaignImage[];
}

export interface ICampaign extends Document {
  organization: Types.ObjectId;
  title: string;
  description: string;
  urgencyLevel: UrgencyLevel;
  fundingGoal: number;
  // Denormalized for fast reads — kept in sync exclusively by CampaignFundService via
  // CampaignRepository.incrementFunding, never written to directly from a campaign-edit endpoint.
  currentFunding: number;
  donorCount: number;
  foodGoal: ICampaignFoodGoal;
  distributionPlan?: string;
  location: ICampaignLocation;
  images: ICampaignImage[];
  status: CampaignStatus;
  rejectionReason?: string;
  startDate: Date;
  endDate: Date;
  campaignUpdates: ICampaignUpdate[];
  distributionRecords: ICampaignDistributionRecord[];
  createdAt: Date;
  updatedAt: Date;
}

const campaignImageSchema = new Schema<ICampaignImage>(
  {
    url: { type: String, required: true },
    publicId: { type: String, required: true },
  },
  { _id: false }
);

const campaignFoodGoalSchema = new Schema<ICampaignFoodGoal>(
  {
    description: { type: String, required: true, trim: true },
    quantity: { type: Number, required: true, min: 0 },
    unit: { type: String, required: true, trim: true },
  },
  { _id: false }
);

const campaignLocationSchema = new Schema<ICampaignLocation>(
  {
    state: { type: String, required: true, trim: true },
    lga: { type: String, required: true, trim: true },
  },
  { _id: false }
);

const campaignUpdateSchema = new Schema<ICampaignUpdate>(
  {
    message: { type: String, required: true, trim: true },
    postedAt: { type: Date, required: true, default: () => new Date() },
  },
  { _id: false }
);

const campaignDistributionRecordSchema = new Schema<ICampaignDistributionRecord>(
  {
    date: { type: Date, required: true },
    quantity: { type: Number, required: true, min: 0 },
    beneficiaries: { type: Number, required: true, min: 0 },
    location: { type: String, required: true, trim: true },
    media: { type: [campaignImageSchema], default: [] },
  },
  { _id: false }
);

const campaignSchema = new Schema<ICampaign>(
  {
    organization: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true, trim: true, minlength: 10, maxlength: 100 },
    description: { type: String, required: true, trim: true, minlength: 50 },
    urgencyLevel: { type: String, enum: Object.values(UrgencyLevel), required: true, index: true },
    fundingGoal: { type: Number, required: true, min: 0.01 },
    currentFunding: { type: Number, default: 0 },
    donorCount: { type: Number, default: 0 },
    foodGoal: { type: campaignFoodGoalSchema, required: true },
    distributionPlan: { type: String, trim: true },
    location: { type: campaignLocationSchema, required: true },
    images: { type: [campaignImageSchema], default: [] },
    status: {
      type: String,
      enum: Object.values(CampaignStatus),
      default: CampaignStatus.PENDING_APPROVAL,
      index: true,
    },
    rejectionReason: { type: String, trim: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    campaignUpdates: { type: [campaignUpdateSchema], default: [] },
    distributionRecords: { type: [campaignDistributionRecordSchema], default: [] },
  },
  { timestamps: true }
);

export const CampaignModel = model<ICampaign>('Campaign', campaignSchema);
