import { ITransaction, TransactionModel } from '../models/transaction.model';
import { PaymentStatus } from '../types/enums';

export class TransactionRepository {
  async create(data: Partial<ITransaction>): Promise<ITransaction> {
    return TransactionModel.create(data);
  }

  async findByReference(reference: string): Promise<ITransaction | null> {
    return TransactionModel.findOne({ transactionReference: reference });
  }

  async updateByReference(
    reference: string,
    data: Partial<ITransaction>
  ): Promise<ITransaction | null> {
    return TransactionModel.findOneAndUpdate({ transactionReference: reference }, data, {
      new: true,
    });
  }

  // Atomic claim, not a read-then-write: only transitions pending -> completed, and only
  // for whichever caller wins the race on this exact query. Returns the PRE-update document
  // if THIS call performed the transition, or null if the transaction doesn't exist or was
  // already non-pending. That null case is what makes concurrent/duplicate webhook
  // deliveries for the same reference safe — at most one caller ever proceeds to apply the
  // side effects (order updates, cart clear, emails); everyone else gets null and no-ops.
  async markCompletedIfPending(
    reference: string,
    gatewayResponse: unknown
  ): Promise<ITransaction | null> {
    return TransactionModel.findOneAndUpdate(
      { transactionReference: reference, status: PaymentStatus.PENDING },
      { $set: { status: PaymentStatus.COMPLETED, gatewayResponse } },
      { new: false }
    );
  }

  // Same atomic-claim shape as markCompletedIfPending, for the charge.failed path. Also
  // guards against a late/out-of-order charge.failed webhook ever downgrading a transaction
  // that a charge.success webhook already completed — it only matches while still pending.
  async markFailedIfPending(
    reference: string,
    gatewayResponse: unknown
  ): Promise<ITransaction | null> {
    return TransactionModel.findOneAndUpdate(
      { transactionReference: reference, status: PaymentStatus.PENDING },
      { $set: { status: PaymentStatus.FAILED, gatewayResponse } },
      { new: false }
    );
  }
}
