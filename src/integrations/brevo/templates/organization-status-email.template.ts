export const createOrganizationStatusEmailTemplate = (params: {
  organizationName: string;
  approved: boolean;
  rejectionReason?: string;
}): string => {
  const { organizationName, approved, rejectionReason } = params;

  if (approved) {
    return `
      <div style="font-family: sans-serif; padding: 24px;">
        <h2>Congratulations, ${organizationName}!</h2>
        <p>Your organization has been verified on Cheepfud. You now have full access to the platform.</p>
      </div>
    `;
  }

  return `
    <div style="font-family: sans-serif; padding: 24px;">
      <h2>Update on your Cheepfud verification</h2>
      <p>We were unable to verify ${organizationName} at this time.</p>
      <p><strong>Reason:</strong> ${rejectionReason}</p>
      <p>You're welcome to resubmit your documents for another review.</p>
    </div>
  `;
};
