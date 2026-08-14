interface OrderSummary {
  orderNumber: string;
  total: number;
}

export const createOrderConfirmationEmailTemplate = (params: {
  buyerName: string;
  orders: OrderSummary[];
}): string => {
  const { buyerName, orders } = params;

  const rows = orders
    .map(
      (order) =>
        `<li>Order <strong>${order.orderNumber}</strong> — ₦${order.total.toLocaleString('en-NG')}</li>`
    )
    .join('');

  return `
    <div style="font-family: sans-serif; padding: 24px;">
      <h2>Thanks for your order, ${buyerName}!</h2>
      <p>Your payment was successful. Here's what you ordered:</p>
      <ul>${rows}</ul>
      <p>Each seller will update your order status as it's prepared and shipped.</p>
    </div>
  `;
};
