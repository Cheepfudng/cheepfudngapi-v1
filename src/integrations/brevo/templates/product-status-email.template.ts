export const createProductStatusEmailTemplate = (params: {
  organizationName: string;
  productName: string;
  approved: boolean;
  rejectionReason?: string;
}): string => {
  const { organizationName, productName, approved, rejectionReason } = params;

  if (approved) {
    return `
      <div style="font-family: sans-serif; padding: 24px;">
        <h2>Your product is live!</h2>
        <p>Hi ${organizationName}, "${productName}" has been approved and is now visible to buyers on Cheepfud.</p>
      </div>
    `;
  }

  return `
    <div style="font-family: sans-serif; padding: 24px;">
      <h2>Update on your product listing</h2>
      <p>Hi ${organizationName}, we were unable to approve "${productName}" at this time.</p>
      <p><strong>Reason:</strong> ${rejectionReason}</p>
      <p>Contact support if you'd like to discuss this listing further.</p>
    </div>
  `;
};
