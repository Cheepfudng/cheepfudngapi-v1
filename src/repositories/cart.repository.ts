import { ClientSession } from 'mongoose';

import { CART_TTL_MS, CartModel, ICart } from '../models/cart.model';

const nextExpiry = (): Date => new Date(Date.now() + CART_TTL_MS);

export class CartRepository {
  async findByUser(userId: string, session?: ClientSession): Promise<ICart | null> {
    return CartModel.findOne({ user: userId }, undefined, session ? { session } : undefined);
  }

  // Sets the item's quantity to the given (already-validated, final) value — creating the
  // cart and/or the item entry if either doesn't exist yet. Used by the add-to-cart flow,
  // where the service has already computed the resulting quantity (existing + requested).
  async upsertItem(userId: string, productId: string, quantity: number): Promise<ICart> {
    const expiresAt = nextExpiry();

    const existingItemUpdate = await CartModel.findOneAndUpdate(
      { user: userId, 'items.product': productId },
      { $set: { 'items.$.quantity': quantity, expiresAt } },
      { new: true }
    );
    if (existingItemUpdate) return existingItemUpdate;

    return CartModel.findOneAndUpdate(
      { user: userId },
      { $push: { items: { product: productId, quantity } }, $set: { expiresAt } },
      { new: true, upsert: true }
    );
  }

  // Updates an already-present item's quantity. Returns null if the cart or the item
  // doesn't exist — the caller (service) turns that into a 404.
  async updateItemQuantity(
    userId: string,
    productId: string,
    quantity: number
  ): Promise<ICart | null> {
    return CartModel.findOneAndUpdate(
      { user: userId, 'items.product': productId },
      { $set: { 'items.$.quantity': quantity, expiresAt: nextExpiry() } },
      { new: true }
    );
  }

  // Atomic $inc, unlike updateItemQuantity's absolute $set: MongoDB serializes concurrent
  // increments on the same document, so two racing +1 calls can never collapse into a
  // single +1 the way a read-current-then-$set approach would. Returns null if the cart or
  // the item doesn't exist. The caller is responsible for validating/rolling back the
  // resulting quantity (e.g. against live stock) since that check can't happen atomically
  // alongside this update — it depends on the Product collection.
  async incrementItemQuantity(
    userId: string,
    productId: string,
    delta: number
  ): Promise<ICart | null> {
    return CartModel.findOneAndUpdate(
      { user: userId, 'items.product': productId },
      { $inc: { 'items.$.quantity': delta }, $set: { expiresAt: nextExpiry() } },
      { new: true }
    );
  }

  async removeItem(userId: string, productId: string): Promise<ICart | null> {
    return CartModel.findOneAndUpdate(
      { user: userId },
      { $pull: { items: { product: productId } }, $set: { expiresAt: nextExpiry() } },
      { new: true }
    );
  }

  // Empties the cart's items rather than deleting the document, per 9.6/9.7 — keeps
  // "cleared" indistinguishable from "never had a cart" for the GET /cart empty-state.
  async deleteByUser(userId: string): Promise<void> {
    await CartModel.updateOne({ user: userId }, { $set: { items: [], expiresAt: nextExpiry() } });
  }
}
