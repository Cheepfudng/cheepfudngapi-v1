export const createNewDonationEmailTemplate = (params: {
  organizationName: string;
  campaignTitle: string;
  amount: number;
}): string => {
  const { organizationName, campaignTitle, amount } = params;

  return `
    <div style="font-family: sans-serif; padding: 24px;">
      <h2>New donation received, ${organizationName}!</h2>
      <p>Your campaign "${campaignTitle}" just received a donation of ₦${amount.toLocaleString()}.</p>
      <p>You can view updated fund totals on your campaign's Impact tab.</p>
    </div>
  `;
};
