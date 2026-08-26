import mongoose from 'mongoose';

import { connectDatabase } from '../config/database';
import { ProductModel } from '../models/product.model';
import { ProductModerationStatus } from '../types/enums';
import { logger } from '../utils/logger';

// One-time migration (Phase 19): every product created before this phase has no
// moderationStatus field at all — they were created under the old auto-approve
// (isApproved: true, default) rule, so grandfathering them in as approved is correct.
// Defaulting them to pending instead would silently de-list real existing listings.
//
// Run once against each environment: `npx ts-node src/scripts/migrate-product-moderation-status.ts`
// No existing migration pattern was found in this codebase to follow instead.
async function main(): Promise<void> {
  await connectDatabase();

  const setResult = await ProductModel.updateMany(
    { moderationStatus: { $exists: false } },
    { $set: { moderationStatus: ProductModerationStatus.APPROVED } }
  );
  logger.info(
    `Product moderation migration: matched ${setResult.matchedCount}, set moderationStatus: approved on ${setResult.modifiedCount}`
  );

  // Mongoose's strict-mode schema casting silently drops $set/$unset operations
  // targeting fields no longer declared in the schema — isApproved was removed from the
  // Product schema this phase, so ProductModel.updateMany() would silently no-op on it.
  // Going through the raw driver collection bypasses that casting entirely. Run as its own
  // step (not combined with the $set above) so this script stays idempotent and safe to
  // re-run — each half only touches documents that still need it.
  const unsetResult = await ProductModel.collection.updateMany(
    { isApproved: { $exists: true } },
    { $unset: { isApproved: '' } }
  );
  logger.info(
    `Product moderation migration: removed the stale isApproved field from ${unsetResult.modifiedCount} product(s)`
  );

  await mongoose.disconnect();
  process.exit(0);
}

main().catch(async (err) => {
  logger.error(`Product moderation migration failed: ${err}`);
  await mongoose.disconnect();
  process.exit(1);
});
