export const createCampaignStatusEmailTemplate = (params: {
  organizationName: string;
  campaignTitle: string;
  approved: boolean;
  rejectionReason?: string;
}): string => {
  const { organizationName, campaignTitle, approved, rejectionReason } = params;

  if (approved) {
    return `
      <div style="font-family: sans-serif; padding: 24px;">
        <h2>Your campaign is live!</h2>
        <p>Hi ${organizationName}, "${campaignTitle}" has been approved and is now visible to donors on Cheepfud.</p>
      </div>
    `;
  }

  return `
    <div style="font-family: sans-serif; padding: 24px;">
      <h2>Update on your campaign submission</h2>
      <p>Hi ${organizationName}, we were unable to approve "${campaignTitle}" at this time.</p>
      <p><strong>Reason:</strong> ${rejectionReason}</p>
    </div>
  `;
};
