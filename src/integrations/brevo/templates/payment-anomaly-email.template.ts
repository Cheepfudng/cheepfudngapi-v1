interface AnomalousOrderSummary {
  orderNumber: string;
  total: number;
}

export const createPaymentAnomalyEmailTemplate = (params: {
  transactionReference: string;
  amount: number;
  buyerEmail: string;
  orders: AnomalousOrderSummary[];
}): string => {
  const { transactionReference, amount, buyerEmail, orders } = params;

  const rows = orders
    .map(
      (order) =>
        `<li>Order <strong>${order.orderNumber}</strong> — ₦${order.total.toLocaleString('en-NG')}</li>`
    )
    .join('');

  return `
    <div style="font-family: sans-serif; padding: 24px;">
      <h2 style="color: #b91c1c;">Payment received for an already-cancelled order</h2>
      <p>
        A payment of <strong>₦${amount.toLocaleString('en-NG')}</strong> (transaction
        <strong>${transactionReference}</strong>, buyer <strong>${buyerEmail}</strong>) was
        just confirmed by Paystack for one or more orders that had already been cancelled
        on Cheepfud before the payment landed.
      </p>
      <p>The affected order(s):</p>
      <ul>${rows}</ul>
      <p>
        These orders were left exactly as they were (still showing cancelled) — nothing was
        silently marked complete, and the payment has not been refunded automatically. This
        needs manual review to decide next steps (contact the buyer, arrange a refund, etc).
      </p>
    </div>
  `;
};
