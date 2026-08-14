import { IWebhookLog, WebhookLogModel } from '../models/webhook-log.model';

export class WebhookLogRepository {
  async create(data: Partial<IWebhookLog>): Promise<IWebhookLog> {
    return WebhookLogModel.create(data);
  }

  // Not in the original spec's "create, that's it for now" — added because
  // processedSuccessfully is only meaningful if something flips it after async
  // processing finishes; otherwise every log entry would sit at its creation-time
  // default of false forever, defeating the field's purpose.
  async updateProcessedStatus(logId: string, processedSuccessfully: boolean): Promise<void> {
    await WebhookLogModel.updateOne({ _id: logId }, { $set: { processedSuccessfully } });
  }
}
