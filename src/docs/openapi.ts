import { ErrorCode } from '../errors';
import { AccountType, OnboardingStatus, UserRole, VerificationStatus } from '../types';

export const openApiDocument = {
  openapi: '3.0.3',
  info: {
    title: 'Cheepfud API',
    version: '1.0.0',
    description: 'Cheepfud Backend API',
  },
  securitySchemes: {
    bearerAuth: {
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT',
    },
  },
  servers: [
    {
      url: 'http://localhost:5000/v1',
      description: 'Local Development Server',
    },
    {
      url: 'https://cheepfud-api-staging.onrender.com',
      description: 'Staging Server URL',
    },
    {
      url: 'https://cheepfud-api-ng.onrender.com',
      description: 'Production Server URL',
    },
  ],
  tags: [
    {
      name: 'General',
      description: 'General API endpoints',
    },
    {
      name: 'Onboarding',
      description: 'User onboarding and account management',
    },
    {
      name: 'Auth',
      description: 'Login, tokens, and password management',
    },
  ],

  paths: {
    '/health': {
      get: {
        tags: ['General'],
        summary: 'Health check endpoint',
        description: 'Checks the health and status of the API.',
        responses: {
          200: {
            description: 'API is running successfully',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/HealthCheckResponse',
                },
              },
            },
          },
          500: {
            description: 'Internal Server Error',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse',
                },
                examples: {
                  InternalServerError: {
                    value: {
                      status: false,
                      message: 'An unexpected error occurred',
                      error: {
                        code: ErrorCode.INTERNAL_SERVER_ERROR,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/': {
      get: {
        tags: ['General'],
        summary: 'API Root',
        description: 'Returns basic information about the API.',
        responses: {
          200: {
            description: 'Welcome message and API version',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'Welcome to Cheepfud API' },
                    version: { type: 'string', example: 'v1' },
                  },
                },
              },
            },
          },
          500: {
            description: 'Internal Server Error',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse',
                },
                examples: {
                  InternalServerError: {
                    value: {
                      status: false,
                      message: 'An unexpected error occurred',
                      error: {
                        code: ErrorCode.INTERNAL_SERVER_ERROR,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/otp/request': {
      post: {
        tags: ['Onboarding'],
        summary: 'Request OTP',
        description: 'Requests a One-Time Password (OTP) to be sent to the provided email address.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/RequestOtpRequest',
              },
              examples: {
                RequestOtpExample: {
                  value: {
                    email: 'test@example.com',
                  },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'OTP sent successfully',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/SuccessResponse',
                },
                examples: {
                  OTPSentSuccess: {
                    value: {
                      status: true,
                      message: 'OTP sent successfully',
                      data: null,
                    },
                  },
                },
              },
            },
          },
          400: {
            description: 'Bad Request / Validation Error',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse',
                },
                examples: {
                  ValidationError: {
                    value: {
                      status: false,
                      message: 'A valid email is required',
                      error: {
                        code: ErrorCode.VALIDATION_ERROR,
                        details: [
                          { msg: 'A valid email is required', path: 'email', location: 'body' },
                        ],
                      },
                    },
                  },
                },
              },
            },
          },
          500: {
            description: 'Internal Server Error',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse',
                },
                examples: {
                  InternalServerError: {
                    value: {
                      status: false,
                      message: 'An unexpected error occurred',
                      error: {
                        code: ErrorCode.INTERNAL_SERVER_ERROR,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/otp/verify': {
      post: {
        tags: ['Onboarding'],
        summary: 'Verify OTP',
        description:
          'Verifies the provided OTP for the given email address. Sets isEmailVerified to true; does not affect verificationStatus.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/VerifyOtpRequest',
              },
              examples: {
                VerifyOtpExample: {
                  value: {
                    email: 'test@example.com',
                    code: '123456',
                  },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'OTP verified successfully',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/OtpVerifySuccessResponse',
                },
                examples: {
                  OTPVerifiedSuccess: {
                    value: {
                      status: true,
                      message: 'OTP verified successfully',
                      data: {
                        verified: true,
                      },
                    },
                  },
                },
              },
            },
          },
          400: {
            description: 'Bad Request / Invalid OTP / OTP Expired / Validation Error',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse',
                },
                examples: {
                  ValidationError: {
                    value: {
                      status: false,
                      message: 'A valid email is required',
                      error: {
                        code: ErrorCode.VALIDATION_ERROR,
                        details: [
                          { msg: 'A valid email is required', path: 'email', location: 'body' },
                        ],
                      },
                    },
                  },
                  InvalidOtp: {
                    value: {
                      status: false,
                      message: 'Invalid OTP',
                      error: {
                        code: ErrorCode.INVALID_OTP,
                      },
                    },
                  },
                  OtpExpired: {
                    value: {
                      status: false,
                      message: 'OTP has expired',
                      error: {
                        code: ErrorCode.OTP_EXPIRED,
                      },
                    },
                  },
                },
              },
            },
          },
          404: {
            description: 'Not Found',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse',
                },
                examples: {
                  UserNotFound: {
                    value: {
                      status: false,
                      message: 'User not found',
                      error: {
                        code: ErrorCode.USER_NOT_FOUND,
                      },
                    },
                  },
                },
              },
            },
          },
          429: {
            description: 'Too Many Requests',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse',
                },
                examples: {
                  OtpMaxAttempts: {
                    value: {
                      status: false,
                      message: 'Maximum OTP attempts exceeded',
                      error: {
                        code: ErrorCode.OTP_MAX_ATTEMPTS,
                      },
                    },
                  },
                },
              },
            },
          },
          500: {
            description: 'Internal Server Error',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse',
                },
                examples: {
                  InternalServerError: {
                    value: {
                      status: false,
                      message: 'An unexpected error occurred',
                      error: {
                        code: ErrorCode.INTERNAL_SERVER_ERROR,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/onboarding/account-type': {
      post: {
        tags: ['Onboarding'],
        summary: 'Select account type',
        description:
          'Allows an email-verified user to select their account type (individual or organization). Assigns role: user for individual, role: organization for organization. verificationStatus remains pending at this stage.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/SelectAccountTypeRequest',
              },
              examples: {
                SelectIndividualAccount: {
                  value: {
                    email: 'test@example.com',
                    accountType: 'individual',
                  },
                },
                SelectOrganizationAccount: {
                  value: {
                    email: 'org@example.com',
                    accountType: 'organization',
                  },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Account type selected successfully',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/UserSuccessResponse',
                },
                examples: {
                  IndividualAccountTypeSelected: {
                    value: {
                      status: true,
                      message: 'Account type selected successfully',
                      data: {
                        _id: '60d0fe4f54e0d9001c23a4a1',
                        email: 'test@example.com',
                        accountType: AccountType.INDIVIDUAL,
                        role: UserRole.USER,
                        verificationStatus: VerificationStatus.PENDING,
                        onboardingStatus: OnboardingStatus.ACCOUNT_TYPE_SELECTED,
                        isEmailVerified: true,
                        isActive: true,
                        createdAt: '2023-01-01T10:00:00.000Z',
                        updatedAt: '2023-01-01T10:05:00.000Z',
                      },
                    },
                  },
                  OrganizationAccountTypeSelected: {
                    value: {
                      status: true,
                      message: 'Account type selected successfully',
                      data: {
                        _id: '60d0fe4f54e0d9001c23a4a2',
                        email: 'org@example.com',
                        accountType: AccountType.ORGANIZATION,
                        role: UserRole.ORGANIZATION,
                        verificationStatus: VerificationStatus.PENDING,
                        onboardingStatus: OnboardingStatus.ACCOUNT_TYPE_SELECTED,
                        isEmailVerified: true,
                        isActive: true,
                        createdAt: '2023-01-01T10:00:00.000Z',
                        updatedAt: '2023-01-01T10:05:00.000Z',
                      },
                    },
                  },
                },
              },
            },
          },
          400: {
            description: 'Bad Request / Validation Error',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse',
                },
                examples: {
                  ValidationError: {
                    value: {
                      status: false,
                      message: 'Invalid account type',
                      error: {
                        code: ErrorCode.VALIDATION_ERROR,
                        details: [
                          {
                            msg: 'Invalid account type',
                            param: 'accountType',
                            location: 'body',
                          },
                        ],
                      },
                    },
                  },
                },
              },
            },
          },
          403: {
            description: 'Forbidden',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse',
                },
                examples: {
                  Unauthorized: {
                    value: {
                      status: false,
                      message: 'Email must be verified before selecting an account type',
                      error: {
                        code: ErrorCode.UNAUTHORIZED,
                      },
                    },
                  },
                },
              },
            },
          },
          404: {
            description: 'Not Found',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse',
                },
                examples: {
                  UserNotFound: {
                    value: {
                      status: false,
                      message: 'User not found',
                      error: {
                        code: ErrorCode.USER_NOT_FOUND,
                      },
                    },
                  },
                },
              },
            },
          },
          500: {
            description: 'Internal Server Error',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse',
                },
                examples: {
                  InternalServerError: {
                    value: {
                      status: false,
                      message: 'An unexpected error occurred',
                      error: {
                        code: ErrorCode.INTERNAL_SERVER_ERROR,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/onboarding/individual': {
      post: {
        tags: ['Onboarding'],
        summary: 'Complete individual onboarding',
        description:
          'Completes onboarding for an individual user and sets their password. verificationStatus is set to verified immediately — individuals do not require admin review.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/IndividualOnboardingRequest',
              },
              examples: {
                IndividualOnboardingExample: {
                  value: {
                    email: 'test@example.com',
                    firstName: 'John',
                    lastName: 'Doe',
                    phoneNumber: '+1234567890',
                    password: 'StrongPass123',
                    confirmPassword: 'StrongPass123',
                  },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Individual onboarding completed successfully',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/UserSuccessResponse',
                },
                examples: {
                  IndividualOnboardingCompleted: {
                    value: {
                      status: true,
                      message: 'Individual onboarding created successfully',
                      data: {
                        _id: '60d0fe4f54e0d9001c23a4a1',
                        email: 'test@example.com',
                        firstName: 'John',
                        lastName: 'Doe',
                        phoneNumber: '+1234567890',
                        accountType: AccountType.INDIVIDUAL,
                        role: UserRole.USER,
                        verificationStatus: VerificationStatus.VERIFIED,
                        onboardingStatus: OnboardingStatus.COMPLETED,
                        isEmailVerified: true,
                        isActive: true,
                        createdAt: '2023-01-01T10:00:00.000Z',
                        updatedAt: '2023-01-01T10:10:00.000Z',
                      },
                    },
                  },
                },
              },
            },
          },
          400: {
            description: 'Bad Request / Validation Error',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse',
                },
                examples: {
                  ValidationError: {
                    value: {
                      status: false,
                      message: 'First name is required',
                      error: {
                        code: ErrorCode.VALIDATION_ERROR,
                        details: [
                          { msg: 'First name is required', path: 'firstName', location: 'body' },
                        ],
                      },
                    },
                  },
                  PasswordMismatch: {
                    value: {
                      status: false,
                      message: 'Passwords do not match',
                      error: {
                        code: ErrorCode.VALIDATION_ERROR,
                        details: [
                          {
                            msg: 'Passwords do not match',
                            path: 'confirmPassword',
                            location: 'body',
                          },
                        ],
                      },
                    },
                  },
                  IncorrectAccountType: {
                    value: {
                      status: false,
                      message: 'User account type is not individual',
                      error: {
                        code: ErrorCode.VALIDATION_ERROR,
                      },
                    },
                  },
                },
              },
            },
          },
          403: {
            description: 'Forbidden',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse',
                },
                examples: {
                  Unauthorized: {
                    value: {
                      status: false,
                      message: 'Email must be verified before completing onboarding',
                      error: {
                        code: ErrorCode.UNAUTHORIZED,
                      },
                    },
                  },
                },
              },
            },
          },
          404: {
            description: 'Not Found',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse',
                },
                examples: {
                  UserNotFound: {
                    value: {
                      status: false,
                      message: 'User not found',
                      error: {
                        code: ErrorCode.USER_NOT_FOUND,
                      },
                    },
                  },
                },
              },
            },
          },
          409: {
            description: 'Conflict',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse',
                },
                examples: {
                  OnboardingConflict: {
                    value: {
                      status: false,
                      message: 'Onboarding has already been completed',
                      error: {
                        code: ErrorCode.CONFLICT,
                      },
                    },
                  },
                },
              },
            },
          },
          500: {
            description: 'Internal Server Error',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse',
                },
                examples: {
                  InternalServerError: {
                    value: {
                      status: false,
                      message: 'An unexpected error occurred',
                      error: {
                        code: ErrorCode.INTERNAL_SERVER_ERROR,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/onboarding/organization': {
      post: {
        tags: ['Onboarding'],
        summary: 'Complete organization onboarding',
        description:
          'Completes onboarding for an organization user and sets their password. verificationStatus remains pending after this step — organizations must submit documents and be approved by an admin before verificationStatus becomes verified.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/OrganizationOnboardingRequest',
              },
              examples: {
                OrganizationOnboardingExample: {
                  value: {
                    email: 'org@example.com',
                    organizationName: 'Acme Farms',
                    organizationType: 'Farmer/Vendor',
                    phoneNumber: '+1987654321',
                    password: 'StrongPass123',
                    confirmPassword: 'StrongPass123',
                  },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Organization onboarding completed successfully',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/UserSuccessResponse',
                },
                examples: {
                  OrganizationOnboardingCompleted: {
                    value: {
                      status: true,
                      message: 'Organization onboarding created successfully',
                      data: {
                        _id: '60d0fe4f54e0d9001c23a4a2',
                        email: 'org@example.com',
                        organizationName: 'Acme Farms',
                        organizationType: 'Farmer/Vendor',
                        phoneNumber: '+1987654321',
                        accountType: AccountType.ORGANIZATION,
                        role: UserRole.ORGANIZATION,
                        verificationStatus: VerificationStatus.PENDING,
                        onboardingStatus: OnboardingStatus.COMPLETED,
                        isEmailVerified: true,
                        isActive: true,
                        createdAt: '2023-01-01T10:00:00.000Z',
                        updatedAt: '2023-01-01T10:15:00.000Z',
                      },
                    },
                  },
                },
              },
            },
          },
          400: {
            description: 'Bad Request / Validation Error',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse',
                },
                examples: {
                  ValidationError: {
                    value: {
                      status: false,
                      message: 'Organization name is required',
                      error: {
                        code: ErrorCode.VALIDATION_ERROR,
                        details: [
                          {
                            msg: 'Organization name is required',
                            path: 'organizationName',
                            location: 'body',
                          },
                        ],
                      },
                    },
                  },
                  PasswordMismatch: {
                    value: {
                      status: false,
                      message: 'Passwords do not match',
                      error: {
                        code: ErrorCode.VALIDATION_ERROR,
                        details: [
                          {
                            msg: 'Passwords do not match',
                            path: 'confirmPassword',
                            location: 'body',
                          },
                        ],
                      },
                    },
                  },
                  IncorrectAccountType: {
                    value: {
                      status: false,
                      message: 'User account type is not organization',
                      error: {
                        code: ErrorCode.VALIDATION_ERROR,
                      },
                    },
                  },
                },
              },
            },
          },
          403: {
            description: 'Forbidden',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse',
                },
                examples: {
                  Unauthorized: {
                    value: {
                      status: false,
                      message: 'Email must be verified before completing onboarding',
                      error: {
                        code: ErrorCode.UNAUTHORIZED,
                      },
                    },
                  },
                },
              },
            },
          },
          404: {
            description: 'Not Found',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse',
                },
                examples: {
                  UserNotFound: {
                    value: {
                      status: false,
                      message: 'User not found',
                      error: {
                        code: ErrorCode.USER_NOT_FOUND,
                      },
                    },
                  },
                },
              },
            },
          },
          409: {
            description: 'Conflict',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse',
                },
                examples: {
                  OnboardingConflict: {
                    value: {
                      status: false,
                      message: 'Onboarding has already been completed',
                      error: {
                        code: ErrorCode.CONFLICT,
                      },
                    },
                  },
                },
              },
            },
          },
          500: {
            description: 'Internal Server Error',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse',
                },
                examples: {
                  InternalServerError: {
                    value: {
                      status: false,
                      message: 'An unexpected error occurred',
                      error: {
                        code: ErrorCode.INTERNAL_SERVER_ERROR,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Login',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/LoginRequest' },
              examples: {
                LoginExample: {
                  value: { email: 'test@example.com', password: 'StrongPass123' },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Login successful',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/AuthSuccessResponse' },
              },
            },
          },
          401: {
            description: 'Invalid credentials',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
                examples: {
                  InvalidCredentials: {
                    value: {
                      status: false,
                      message: 'Invalid email or password',
                      error: { code: ErrorCode.INVALID_CREDENTIALS },
                    },
                  },
                },
              },
            },
          },
          403: {
            description: 'Account deactivated',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
                examples: {
                  AccountDeactivated: {
                    value: {
                      status: false,
                      message: 'This account has been deactivated',
                      error: { code: ErrorCode.ACCOUNT_DEACTIVATED },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/auth/refresh': {
      post: {
        tags: ['Auth'],
        summary: 'Refresh access token',
        description:
          'Exchanges a valid refresh token for a new access + refresh token pair. The refresh token used in this request is invalidated (rotation).',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/RefreshRequest' },
            },
          },
        },
        responses: {
          200: {
            description: 'Token refreshed successfully',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/TokensSuccessResponse' },
              },
            },
          },
          401: {
            description: 'Refresh token invalid or expired',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
                examples: {
                  InvalidRefreshToken: {
                    value: {
                      status: false,
                      message: 'Refresh token is invalid or expired',
                      error: { code: ErrorCode.REFRESH_TOKEN_INVALID },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/auth/logout': {
      post: {
        tags: ['Auth'],
        summary: 'Logout',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: false,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/RefreshRequest' },
              examples: {
                LogoutExample: { value: { refreshToken: '<refresh token>' } },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Logout successful',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/SuccessResponse' } },
            },
          },
          401: {
            description: 'Not authenticated',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } },
            },
          },
        },
      },
    },
    '/auth/me': {
      get: {
        tags: ['Auth'],
        summary: 'Get current user',
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: 'Current authenticated user',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/UserSuccessResponse' } },
            },
          },
          401: {
            description: 'Not authenticated',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } },
            },
          },
        },
      },
    },
    '/auth/forgot-password': {
      post: {
        tags: ['Auth'],
        summary: 'Request a password reset OTP',
        description:
          'Always returns the same generic success message, regardless of whether the email exists, to prevent account enumeration.',
        requestBody: {
          required: true,
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/ForgotPasswordRequest' } },
          },
        },
        responses: {
          200: {
            description: 'Generic success response',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/SuccessResponse' },
                examples: {
                  Generic: {
                    value: {
                      status: true,
                      message: 'If an account exists for this email, a reset code has been sent',
                      data: null,
                    },
                  },
                },
              },
            },
          },
          429: {
            description: 'Too many requests',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
                examples: {
                  TooManyRequests: {
                    value: {
                      status: false,
                      message: 'Too many requests, please try again later',
                      error: { code: ErrorCode.TOO_MANY_REQUESTS },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/auth/reset-password': {
      post: {
        tags: ['Auth'],
        summary: 'Reset password using OTP',
        description:
          'Resetting a password invalidates every existing session (refresh token) for the user.',
        requestBody: {
          required: true,
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/ResetPasswordRequest' } },
          },
        },
        responses: {
          200: {
            description: 'Password reset successful',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/SuccessResponse' } },
            },
          },
          400: {
            description: 'Invalid/expired OTP or password validation error',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
                examples: {
                  InvalidOtp: {
                    value: {
                      status: false,
                      message: 'Invalid OTP',
                      error: { code: ErrorCode.INVALID_OTP },
                    },
                  },
                  PasswordMismatch: {
                    value: {
                      status: false,
                      message: 'Passwords do not match',
                      error: { code: ErrorCode.VALIDATION_ERROR },
                    },
                  },
                },
              },
            },
          },
          429: {
            description: 'Too many requests',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } },
            },
          },
        },
      },
    },
    '/auth/change-password': {
      post: {
        tags: ['Auth'],
        summary: 'Change password (authenticated)',
        description:
          'Requires the current password. Invalidates every other session but keeps the current one alive by issuing a fresh token pair.',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/ChangePasswordRequest' } },
          },
        },
        responses: {
          200: {
            description: 'Password changed successfully',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/AuthSuccessResponse' } },
            },
          },
          401: {
            description: 'Not authenticated / current password incorrect',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
                examples: {
                  WrongCurrentPassword: {
                    value: {
                      status: false,
                      message: 'Current password is incorrect',
                      error: { code: ErrorCode.INVALID_CURRENT_PASSWORD },
                    },
                  },
                },
              },
            },
          },
          429: {
            description: 'Too many requests',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } },
            },
          },
        },
      },
    },
  },
  components: {
    schemas: {
      HealthCheckResponse: {
        type: 'object',
        properties: {
          status: { type: 'string', example: 'success' },
          message: { type: 'string', example: 'Cheepfud API is running' },
          timestamp: { type: 'string', format: 'date-time' },
        },
      },
      SuccessResponse: {
        type: 'object',
        properties: {
          status: { type: 'boolean', example: true },
          message: { type: 'string', example: 'Operation successful' },
          data: { nullable: true },
        },
        required: ['status', 'message', 'data'],
      },
      ErrorResponse: {
        type: 'object',
        properties: {
          status: { type: 'boolean', example: false },
          message: { type: 'string', example: 'An error occurred' },
          error: {
            type: 'object',
            properties: {
              code: {
                type: 'string',
                enum: Object.values(ErrorCode),
                example: ErrorCode.INTERNAL_SERVER_ERROR,
              },
              details: {
                type: 'object',
                description: 'Optional additional error details (e.g., validation errors)',
                nullable: true,
              },
            },
            required: ['code'],
          },
        },
        required: ['status', 'message', 'error'],
      },
      // Note: password / passwordChangedAt are intentionally never part of this
      // schema — the model's toJSON transform strips them from every response.
      User: {
        type: 'object',
        properties: {
          _id: { type: 'string', example: '60d0fe4f54e0d9001c23a4a1' },
          email: { type: 'string', format: 'email', example: 'user@example.com' },
          firstName: { type: 'string', example: 'John', nullable: true },
          lastName: { type: 'string', example: 'Doe', nullable: true },
          phoneNumber: { type: 'string', example: '+1234567890', nullable: true },
          organizationName: { type: 'string', example: 'Acme Farms', nullable: true },
          organizationType: { type: 'string', example: 'Farmer/Vendor', nullable: true },
          accountType: {
            type: 'string',
            enum: Object.values(AccountType),
            example: AccountType.INDIVIDUAL,
            nullable: true,
          },
          role: { type: 'string', enum: Object.values(UserRole), example: UserRole.USER },
          verificationStatus: {
            type: 'string',
            enum: Object.values(VerificationStatus),
            description:
              'For role: organization, this reflects admin document-review status (pending → under_review → verified/rejected). For role: user, it is set to verified immediately upon completing onboarding.',
            example: VerificationStatus.VERIFIED,
          },
          onboardingStatus: {
            type: 'string',
            enum: Object.values(OnboardingStatus),
            example: OnboardingStatus.NOT_STARTED,
          },
          isEmailVerified: { type: 'boolean', example: true },
          isActive: { type: 'boolean', example: true },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
        required: [
          '_id',
          'email',
          'role',
          'verificationStatus',
          'onboardingStatus',
          'isEmailVerified',
          'isActive',
          'createdAt',
          'updatedAt',
        ],
      },
      UserSuccessResponse: {
        allOf: [
          { $ref: '#/components/schemas/SuccessResponse' },
          {
            type: 'object',
            properties: {
              data: { $ref: '#/components/schemas/User' },
            },
          },
        ],
      },
      OtpVerifySuccessResponse: {
        allOf: [
          { $ref: '#/components/schemas/SuccessResponse' },
          {
            type: 'object',
            properties: {
              data: {
                type: 'object',
                properties: {
                  verified: { type: 'boolean', example: true },
                },
                required: ['verified'],
              },
            },
          },
        ],
      },
      // Request Payloads
      RequestOtpRequest: {
        type: 'object',
        required: ['email'],
        properties: {
          email: {
            type: 'string',
            format: 'email',
            description: 'Email address to send the OTP to.',
            example: 'test@example.com',
          },
        },
      },
      VerifyOtpRequest: {
        type: 'object',
        required: ['email', 'code'],
        properties: {
          email: {
            type: 'string',
            format: 'email',
            description: 'Email address associated with the OTP.',
            example: 'test@example.com',
          },
          code: {
            type: 'string',
            pattern: '^[0-9]{6}$',
            description: 'The 6-digit OTP received.',
            example: '123456',
          },
        },
      },
      SelectAccountTypeRequest: {
        type: 'object',
        required: ['email', 'accountType'],
        properties: {
          email: {
            type: 'string',
            format: 'email',
            description: 'Email address of the user.',
            example: 'test@example.com',
          },
          accountType: {
            type: 'string',
            enum: [AccountType.INDIVIDUAL, AccountType.ORGANIZATION],
            description: 'The type of account to select (individual or organization).',
            example: AccountType.INDIVIDUAL,
          },
        },
      },
      IndividualOnboardingRequest: {
        type: 'object',
        required: ['email', 'firstName', 'lastName', 'phoneNumber', 'password', 'confirmPassword'],
        properties: {
          email: {
            type: 'string',
            format: 'email',
            description: 'Email address of the user.',
            example: 'test@example.com',
          },
          firstName: {
            type: 'string',
            description: "User's first name.",
            example: 'John',
          },
          lastName: {
            type: 'string',
            description: "User's last name.",
            example: 'Doe',
          },
          phoneNumber: {
            type: 'string',
            pattern: '^\\+?[1-9]\\d{7,14}$',
            description: "User's phone number.",
            example: '+1234567890',
          },
          password: {
            type: 'string',
            format: 'password',
            minLength: 8,
            description:
              'Minimum 8 characters, at least one uppercase, one lowercase, and one number.',
            example: 'StrongPass123',
          },
          confirmPassword: {
            type: 'string',
            format: 'password',
            description: 'Must match password.',
            example: 'StrongPass123',
          },
        },
      },
      OrganizationOnboardingRequest: {
        type: 'object',
        required: [
          'email',
          'organizationName',
          'organizationType',
          'phoneNumber',
          'password',
          'confirmPassword',
        ],
        properties: {
          email: {
            type: 'string',
            format: 'email',
            description: 'Email address of the organization contact.',
            example: 'org@example.com',
          },
          organizationName: {
            type: 'string',
            description: 'Name of the organization.',
            example: 'Acme Farms',
          },
          organizationType: {
            type: 'string',
            description:
              'Category of the organization (e.g., Farmer/Vendor, NGO, Foundation, Religious Body, Agency).',
            example: 'Farmer/Vendor',
          },
          phoneNumber: {
            type: 'string',
            pattern: '^\\+?[1-9]\\d{7,14}$',
            description: 'Organization contact phone number.',
            example: '+1987654321',
          },
          password: {
            type: 'string',
            format: 'password',
            minLength: 8,
            description:
              'Minimum 8 characters, at least one uppercase, one lowercase, and one number.',
            example: 'StrongPass123',
          },
          confirmPassword: {
            type: 'string',
            format: 'password',
            description: 'Must match password.',
            example: 'StrongPass123',
          },
        },
      },
      LoginRequest: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email', example: 'test@example.com' },
          password: { type: 'string', format: 'password', example: 'StrongPass123' },
        },
      },
      RefreshRequest: {
        type: 'object',
        required: ['refreshToken'],
        properties: {
          refreshToken: { type: 'string', example: '<refresh token>' },
        },
      },
      ForgotPasswordRequest: {
        type: 'object',
        required: ['email'],
        properties: {
          email: { type: 'string', format: 'email', example: 'test@example.com' },
        },
      },
      ResetPasswordRequest: {
        type: 'object',
        required: ['email', 'code', 'password', 'confirmPassword'],
        properties: {
          email: { type: 'string', format: 'email', example: 'test@example.com' },
          code: { type: 'string', pattern: '^[0-9]{6}$', example: '123456' },
          password: {
            type: 'string',
            format: 'password',
            minLength: 8,
            example: 'NewStrongPass456',
          },
          confirmPassword: { type: 'string', format: 'password', example: 'NewStrongPass456' },
        },
      },
      ChangePasswordRequest: {
        type: 'object',
        required: ['currentPassword', 'password', 'confirmPassword'],
        properties: {
          currentPassword: { type: 'string', format: 'password', example: 'NewStrongPass456' },
          password: { type: 'string', format: 'password', minLength: 8, example: 'FinalPass789' },
          confirmPassword: { type: 'string', format: 'password', example: 'FinalPass789' },
        },
      },
      AuthTokens: {
        type: 'object',
        properties: {
          accessToken: { type: 'string' },
          refreshToken: { type: 'string' },
        },
        required: ['accessToken', 'refreshToken'],
      },
      AuthSuccessResponse: {
        allOf: [
          { $ref: '#/components/schemas/SuccessResponse' },
          {
            type: 'object',
            properties: {
              data: {
                allOf: [
                  { $ref: '#/components/schemas/User' },
                  { $ref: '#/components/schemas/AuthTokens' },
                ],
              },
            },
          },
        ],
      },
      TokensSuccessResponse: {
        allOf: [
          { $ref: '#/components/schemas/SuccessResponse' },
          {
            type: 'object',
            properties: { data: { $ref: '#/components/schemas/AuthTokens' } },
          },
        ],
      },
    },
  },
};
