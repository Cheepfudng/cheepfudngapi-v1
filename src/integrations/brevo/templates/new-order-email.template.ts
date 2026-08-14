interface SellerOrderSummary {
  orderNumber: string;
  total: number;
  itemCount: number;
}

export const createNewOrderEmailTemplate = (params: {
  organizationName: string;
  orders: SellerOrderSummary[];
}): string => {
  const { organizationName, orders } = params;

  const rows = orders
    .map(
      (order) =>
        `<li>Order <strong>${order.orderNumber}</strong> — ${order.itemCount} item(s), ₦${order.total.toLocaleString('en-NG')}</li>`
    )
    .join('');

  return `
    <div style="font-family: sans-serif; padding: 24px;">
      <h2>You have a new order, ${organizationName}!</h2>
      <p>Payment has been confirmed for the following order(s):</p>
      <ul>${rows}</ul>
      <p>Log in to your Cheepfud dashboard to confirm and start preparing it.</p>
    </div>
  `;
};
