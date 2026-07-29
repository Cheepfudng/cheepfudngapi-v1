import { Request, Response } from 'express';

import { AccountType } from '../types/enums';
import { onboardingService } from '../services/service-container';
import { sendSuccess } from '../utils/api-response';

export class OnboardingController {
  selectAccountType = async (req: Request, res: Response): Promise<Response> => {
    const { email, accountType } = req.body;

    const user = await onboardingService.selectAccountType(email, accountType as AccountType);

    return sendSuccess(res, 200, 'Account type selected successfully', user);
  };

  completeIndividual = async (req: Request, res: Response): Promise<Response> => {
    const { email, ...input } = req.body;

    const user = await onboardingService.completeIndividualOnboarding(email, input);

    return sendSuccess(res, 200, 'Individual onboarding created successfully', user);
  };

  completeOrganization = async (req: Request, res: Response): Promise<Response> => {
    const { email, ...input } = req.body;

    const user = await onboardingService.completeOrganizationOnboarding(email, input);

    return sendSuccess(res, 200, 'Organization onboarding created successfully', user);
  };
}

export const onboardingController = new OnboardingController();
