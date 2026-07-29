export interface ApiSuccessResponse<T> {
  status: true;
  message: string;
  data: T;
}

export interface ApiErrorResponse {
  status: false;
  message: string;
  error: {
    code: string;
    details?: unknown;
  };
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;
