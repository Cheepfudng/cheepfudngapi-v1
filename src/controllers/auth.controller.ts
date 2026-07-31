import { Response } from 'express';

import { authService, passwordService, userRepository } from '../services/service-container';
import { sendSuccess } from '../utils/api-response';
import { AppError } from '../errors/app-error';
import { ErrorCode } from '../errors/error-codes';
import { AuthRequest } from '../types/auth.types';

export class AuthController {
  login = async (req: AuthRequest, res: Response): Promise<Response> => {
    const { email, password } = req.body;
    const result = await authService.login(email, password);
    return sendSuccess(res, 200, 'Login successful', result);
  };

  refresh = async (req: AuthRequest, res: Response): Promise<Response> => {
    const { refreshToken } = req.body;
    if (!refreshToken)
      throw new AppError('Refresh token is required', 400, ErrorCode.VALIDATION_ERROR);

    const tokens = await authService.refresh(refreshToken);
    return sendSuccess(res, 200, 'Token refreshed successfully', tokens);
  };

  logout = async (req: AuthRequest, res: Response): Promise<Response> => {
    await authService.logout(req.token as string, req.body.refreshToken);
    return sendSuccess(res, 200, 'Logout successful', null);
  };

  me = async (req: AuthRequest, res: Response): Promise<Response> => {
    const user = await userRepository.findById(req.user!.id);
    return sendSuccess(res, 200, 'Current user', user);
  };
  forgotPassword = async (req: AuthRequest, res: Response): Promise<Response> => {
    await passwordService.forgotPassword(req.body.email);
    return sendSuccess(
      res,
      200,
      'If an account exists for this email, a reset code has been sent',
      null
    );
  };

  resetPassword = async (req: AuthRequest, res: Response): Promise<Response> => {
    const { email, code, password } = req.body;
    await passwordService.resetPassword(email, code, password);
    return sendSuccess(
      res,
      200,
      'Password reset successful. Please log in with your new password',
      null
    );
  };

  changePassword = async (req: AuthRequest, res: Response): Promise<Response> => {
    const { currentPassword, password } = req.body;
    const result = await passwordService.changePassword(req.user!.id, currentPassword, password);
    return sendSuccess(res, 200, 'Password changed successfully', result);
  };
}

export const authController = new AuthController();
