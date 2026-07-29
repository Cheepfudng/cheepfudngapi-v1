import { env } from '../../config/env';
import { EmailProvider, SendEmailInput } from '../contracts/email-provider.interface';
import { brevoClient } from './brevo.client';

export class BrevoEmailAdapter implements EmailProvider {
  async sendEmail(input: SendEmailInput): Promise<void> {
    await brevoClient.transactionalEmails.sendTransacEmail({
      sender: {
        name: input.senderName ?? env.BREVO_SENDER_NAME,
        email: input.senderEmail ?? env.BREVO_SENDER_EMAIL,
      },
      to: [
        {
          email: input.to,
        },
      ],
      subject: input.subject,
      htmlContent: input.htmlContent,
    });
  }
}
