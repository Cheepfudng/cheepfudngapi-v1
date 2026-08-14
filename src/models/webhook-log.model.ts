import { Document, Schema, model } from 'mongoose';

export interface IWebhookLog extends Document {
  provider: string;
  event: string;
  reference?: string;
  payload: unknown;
  processedSuccessfully: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const webhookLogSchema = new Schema<IWebhookLog>(
  {
    provider: { type: String, required: true, trim: true },
    event: { type: String, required: true, trim: true },
    reference: { type: String, trim: true, index: true },
    payload: { type: Schema.Types.Mixed, required: true },
    // Defaults to false at creation time (log is written before async processing runs),
    // then flipped by WebhookLogRepository.updateProcessedStatus once processing finishes.
    processedSuccessfully: { type: Boolean, required: true, default: false },
  },
  { timestamps: true }
);

export const WebhookLogModel = model<IWebhookLog>('WebhookLog', webhookLogSchema);
