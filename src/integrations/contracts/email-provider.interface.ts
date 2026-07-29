export interface SendEmailInput {
  to: string;
  subject: string;
  htmlContent: string;
  senderName?: string;
  senderEmail?: string;
}

export interface EmailProvider {
  sendEmail(input: SendEmailInput): Promise<void>;
}
