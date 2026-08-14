export interface InitializeTransactionParams {
  email: string;
  amountKobo: number;
  reference: string;
  metadata: Record<string, unknown>;
}

export interface InitializeTransactionResult {
  authorizationUrl: string;
  accessCode: string;
}

export type PaystackTransactionStatus = 'success' | 'failed' | 'abandoned';

export interface VerifyTransactionResult {
  status: PaystackTransactionStatus;
  amountKobo: number;
  raw: unknown;
}

export interface PaymentGateway {
  initializeTransaction(params: InitializeTransactionParams): Promise<InitializeTransactionResult>;
  verifyTransaction(reference: string): Promise<VerifyTransactionResult>;
}
