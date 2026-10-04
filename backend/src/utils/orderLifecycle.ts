import Order from '../models/Order';
import Product from '../models/Product';
import { AppError } from '../middleware/errorHandler';

/**
 * Canonical order lifecycle. Every status change in the app (seller route,
 * admin route, user cancel) must go through transitionOrder() so that:
 *  - invalid jumps are rejected,
 *  - stock is restored EXACTLY once (guarded by Order.stockRestoredAt),
 *  - totalSales is only counted for actually-collected money.
 *
 * Inventory / sales rules:
 *  - create           : stock is atomically decremented (reservation, no overselling),
 *                       totalSales is NOT touched (no "sold" before payment).
 *  - payment verified : paymentStatus -> paid, totalSales +qty (once, guarded).
 *  - COD delivered    : paymentStatus -> paid, totalSales +qty (once, guarded).
 *  - cancel           : reserved stock returned (once), totalSales -qty only if it
 *                       was already counted (i.e. the order was paid).
 *  - returned         : status only — stock/money are undecided until approve/reject.
 *  - return approved  : stock returned (once), paid -> refunded, totalSales -qty.
 *  - return rejected  : back to delivered — customer keeps the goods, nothing changes.
 */
export const ORDER_TRANSITIONS: Record<string, string[]> = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['processing', 'cancelled'],
  processing: ['shipped', 'cancelled'],
  shipped: ['delivered', 'cancelled'],
  delivered: ['returned'],
  returned: ['delivered'], // reject sends it back to delivered; approve keeps "returned"
  cancelled: [],
};

/** Reverse lookup: which source statuses may transition INTO `target`. */
const sourcesFor = (target: string): string[] =>
  Object.entries(ORDER_TRANSITIONS)
    .filter(([, to]) => to.includes(target))
    .map(([from]) => from);

export interface TransitionOptions {
  reason?: string;
  cancelReason?: string;
  trackingNumber?: string;
}

/** Give the reserved stock back exactly once (idempotent via stockRestoredAt). */
export async function releaseStock(order: {
  _id: any;
  items: Array<{ product: any; quantity: number }>;
}): Promise<boolean> {
  const claimed = await Order.findOneAndUpdate(
    { _id: order._id, $or: [{ stockRestoredAt: { $exists: false } }, { stockRestoredAt: null }] },
    { $set: { stockRestoredAt: new Date() } },
    { new: false }
  );
  if (!claimed) return false;
  if (!order.items?.length) return true;
  await Product.bulkWrite(
    order.items.map((item) => ({
      updateOne: { filter: { _id: item.product }, update: { $inc: { stock: item.quantity } } },
    }))
  );
  return true;
}

/** Count units as sold (payment actually collected). */
export async function incTotalSales(items: Array<{ product: any; quantity: number }>): Promise<void> {
  if (!items?.length) return;
  await Product.bulkWrite(
    items.map((item) => ({
      updateOne: { filter: { _id: item.product }, update: { $inc: { totalSales: item.quantity } } },
    }))
  );
}

/** Remove units from "sold" (refund / cancelled paid order), never below 0. */
export async function decTotalSales(items: Array<{ product: any; quantity: number }>): Promise<void> {
  if (!items?.length) return;
  await Product.bulkWrite(
    items.map((item) => ({
      updateOne: {
        filter: { _id: item.product },
        update: [
          { $set: { totalSales: { $max: [0, { $add: [{ $ifNull: ['$totalSales', 0] }, -item.quantity] }] } } },
        ],
      },
    }))
  );
}

/**
 * Atomically move an order to `target`, then apply inventory/sales side effects.
 * Only one caller can win a given transition (findOneAndUpdate on the source status),
 * which makes stock restoration and sales counting idempotent under concurrency.
 */
export async function transitionOrder(
  orderId: any,
  target: string,
  opts: TransitionOptions = {}
): Promise<{ pre: any; order: any }> {
  const sources = sourcesFor(target);
  if (sources.length === 0) {
    throw new AppError(`Cannot set order status to ${target}`, 400);
  }

  const set: any = { orderStatus: target };
  if (opts.trackingNumber) set.trackingNumber = opts.trackingNumber;
  if (target === 'delivered') set.deliveredAt = new Date();
  if (target === 'cancelled') {
    set.cancelledAt = new Date();
    set.cancelReason = opts.cancelReason || opts.reason || 'Cancelled';
  }

  const pre = await Order.findOneAndUpdate(
    { _id: orderId, orderStatus: { $in: sources } },
    { $set: set },
    { new: false }
  );

  if (!pre) {
    const current = await Order.findById(orderId).select('orderStatus').lean();
    if (!current) throw new AppError('Order not found', 404);
    throw new AppError(`Cannot transition from ${current.orderStatus} to ${target}`, 400);
  }

  if (target === 'delivered') {
    // COD: money is collected on delivery. Online/UPI payments must already
    // have been verified by this backend — never force them to "paid".
    if (pre.paymentMethod === 'cod' && pre.paymentStatus !== 'paid' && pre.paymentStatus !== 'refunded') {
      const won = await Order.findOneAndUpdate(
        { _id: pre._id, paymentStatus: { $nin: ['paid', 'refunded'] } },
        { $set: { paymentStatus: 'paid' } },
        { new: false }
      );
      if (won) await incTotalSales(pre.items);
    }
  }

  if (target === 'cancelled') {
    await releaseStock(pre);
    if (pre.paymentStatus === 'paid') await decTotalSales(pre.items);
  }

  const order = await Order.findById(orderId);
  return { pre, order };
}
