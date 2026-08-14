import axios, { AxiosInstance } from 'axios';

import { env } from '../../config/env';
import { logger } from '../../utils/logger';
import {
  InitializeTransactionParams,
  InitializeTransactionResult,
  PaymentGateway,
  PaystackTransactionStatus,
  VerifyTransactionResult,
} from '../contracts/payment-gateway.interface';

const PAYSTACK_BASE_URL = 'https://api.paystack.co';

interface PaystackInitializeResponse {
  data: { authorization_url: string; access_code: string; reference: string };
}

interface PaystackVerifyResponse {
  data: { status: PaystackTransactionStatus; amount: number; [key: string]: unknown };
}

export class PaystackGateway implements PaymentGateway {
  private readonly client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: PAYSTACK_BASE_URL,
      headers: { Authorization: `Bearer ${env.PAYSTACK_SECRET_KEY}` },
      timeout: 15000,
    });
  }

  // Amounts are always in kobo (₦1 = 100 kobo) at this boundary — the ₦ <-> kobo
  // conversion happens here and in verifyTransaction only, never scattered elsewhere.
  async initializeTransaction(
    params: InitializeTransactionParams
  ): Promise<InitializeTransactionResult> {
    try {
      const response = await this.client.post<PaystackInitializeResponse>(
        '/transaction/initialize',
        {
          email: params.email,
          amount: params.amountKobo,
          reference: params.reference,
          metadata: params.metadata,
        }
      );

      const { authorization_url, access_code } = response.data.data;
      return { authorizationUrl: authorization_url, accessCode: access_code };
    } catch (error) {
      logger.error(
        `Paystack initializeTransaction failed for reference ${params.reference}: ${describeAxiosError(error)}`
      );
      throw error;
    }
  }

  async verifyTransaction(reference: string): Promise<VerifyTransactionResult> {
    try {
      const response = await this.client.get<PaystackVerifyResponse>(
        `/transaction/verify/${encodeURIComponent(reference)}`
      );
      const { status, amount } = response.data.data;
      return { status, amountKobo: amount, raw: response.data.data };
    } catch (error) {
      logger.error(
        `Paystack verifyTransaction failed for reference ${reference}: ${describeAxiosError(error)}`
      );
      throw error;
    }
  }
}

const describeAxiosError = (error: unknown): string => {
  if (axios.isAxiosError(error)) {
    return `status=${error.response?.status} body=${JSON.stringify(error.response?.data)}`;
  }
  return error instanceof Error ? error.message : String(error);
};
