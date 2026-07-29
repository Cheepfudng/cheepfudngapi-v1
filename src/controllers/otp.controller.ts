import { Request, Response } from 'express';

import { otpService } from '../services/service-container';
import { sendSuccess } from '../utils/api-response';

export class OtpController {
  requestOtp = async (req: Request, res: Response): Promise<Response> => {
    const { email } = req.body;

    await otpService.sendOtp(email);

    return sendSuccess(res, 200, 'OTP sent successfully', null);
  };

  verifyOtp = async (req: Request, res: Response): Promise<Response> => {
    const { email, code } = req.body;

    await otpService.verifyOtp(email, code);

    return sendSuccess(res, 200, 'OTP verified successfully', {
      verified: true,
    });
  };
}

export const otpController = new OtpController();
