import { AppError } from '../errors/app-error';
import { ErrorCode } from '../errors/error-codes';
import { UserRepository } from '../repositories/user.repository';
import { VerificationDocumentRepository } from '../repositories/verification-document.repository';
import { EmailProvider } from '../integrations/contracts/email-provider.interface';
import { createOrganizationStatusEmailTemplate } from '../integrations/brevo/templates/organization-status-email.template';
import { UserRole, VerificationStatus } from '../types/enums';

export class AdminService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly documentRepository: VerificationDocumentRepository,
    private readonly emailProvider: EmailProvider
  ) {}

  async listOrganizations(status?: VerificationStatus) {
    return this.userRepository.findOrganizations(status);
  }

  async getOrganizationDetail(orgId: string) {
    const user = await this.userRepository.findById(orgId);
    if (!user || user.role !== UserRole.ORGANIZATION) {
      throw new AppError('Organization not found', 404, ErrorCode.USER_NOT_FOUND);
    }
    const documents = await this.documentRepository.findByUser(orgId);
    return { organization: user, documents };
  }

  async reviewOrganization(
    orgId: string,
    decision: 'approved' | 'rejected',
    rejectionReason?: string
  ) {
    const user = await this.userRepository.findById(orgId);
    if (!user || user.role !== UserRole.ORGANIZATION) {
      throw new AppError('Organization not found', 404, ErrorCode.USER_NOT_FOUND);
    }

    if (user.verificationStatus === VerificationStatus.VERIFIED) {
      throw new AppError('Organization is already verified', 409, ErrorCode.CONFLICT);
    }

    if (decision === 'rejected' && !rejectionReason) {
      throw new AppError(
        'rejectionReason is required when rejecting',
        400,
        ErrorCode.VALIDATION_ERROR
      );
    }

    const newStatus =
      decision === 'approved' ? VerificationStatus.VERIFIED : VerificationStatus.REJECTED;
    const updated = await this.userRepository.updateById(orgId, { verificationStatus: newStatus });

    await this.emailProvider.sendEmail({
      to: user.email,
      subject:
        decision === 'approved'
          ? 'Your organization has been verified'
          : 'Update on your organization verification',
      htmlContent: createOrganizationStatusEmailTemplate({
        organizationName: user.organizationName ?? 'your organization',
        approved: decision === 'approved',
        rejectionReason,
      }),
    });

    return updated;
  }
}
