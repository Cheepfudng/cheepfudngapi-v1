export interface ApiResponse<T = any> {
  status: boolean;
  data?: T;
  message?: string;
  timestamp?: string;
}

export * from './api.types';
export * from './enums';
export * from './onboarding.types';
