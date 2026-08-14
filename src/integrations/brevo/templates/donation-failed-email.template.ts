export const createDonationFailedEmailTemplate = (params: {
  donorName: string;
  campaignTitle: string;
  amount: number;
}): string => {
  const { donorName, campaignTitle, amount } = params;

  return `
    <div style="font-family: sans-serif; padding: 24px;">
      <h2>Your donation could not be completed</h2>
      <p>Hi ${donorName}, your donation of ₦${amount.toLocaleString()} to "${campaignTitle}" was not successful.</p>
      <p>No funds were deducted. You're welcome to try again from the campaign page.</p>
    </div>
  `;
};
