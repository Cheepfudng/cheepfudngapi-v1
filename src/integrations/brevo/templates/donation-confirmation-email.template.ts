export const createDonationConfirmationEmailTemplate = (params: {
  donorName: string;
  campaignTitle: string;
  amount: number;
  mealsEquivalent: number;
}): string => {
  const { donorName, campaignTitle, amount, mealsEquivalent } = params;

  return `
    <div style="font-family: sans-serif; padding: 24px;">
      <h2>Thank you, ${donorName}!</h2>
      <p>Your donation of ₦${amount.toLocaleString()} to "${campaignTitle}" has been received.</p>
      <p>That's approximately <strong>${mealsEquivalent} meals</strong> of impact.</p>
      <p>Funds are restricted to food procurement and distribution for this campaign — you can track its progress on the campaign page.</p>
    </div>
  `;
};
