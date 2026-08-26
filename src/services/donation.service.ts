import { FilterQuery } from 'mongoose';

import { ITransaction } from '../models/transaction.model';
import {
  PaginatedTransactions,
  TransactionPagination,
  TransactionRepository,
} from '../repositories/transaction.repository';
import { PaymentStatus, TransactionType } from '../types/enums';

// Kept out of UserService deliberately — this isn't about the user record, it's a
// donor-facing read over Transactions. A small, focused module with a clear reason to
// change (donation-history shape/filters), separate from address management.
export class DonationService {
  constructor(private readonly transactionRepository: TransactionRepository) {}

  async getDonationHistory(
    userId: string,
    status: PaymentStatus | undefined,
    pagination: TransactionPagination
  ): Promise<PaginatedTransactions> {
    const filter: FilterQuery<ITransaction> = { transactionType: TransactionType.CAMPAIGN_DONATION };
    if (status) filter.status = status;

    return this.transactionRepository.findByPayer(userId, filter, pagination);
  }
}
