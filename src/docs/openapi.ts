import { ErrorCode } from '../errors';
import {
  AccountType,
  CampaignStatus,
  CancellationReason,
  DeliveryMethod,
  OnboardingStatus,
  OrderStatus,
  OrganizationType,
  PaymentStatus,
  ProductModerationStatus,
  UrgencyLevel,
  UserRole,
  VerificationStatus,
} from '../types';
import { NIGERIAN_STATES } from '../utils/constants';

export const openApiDocument = {
  openapi: '3.0.3',
  info: {
    title: 'Cheepfud API',
    version: '1.0.0',
    description: 'Cheepfud Backend API',
  },
  servers: [
    {
      url: 'http://localhost:5000',
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
    {
      name: 'Organizations',
      description: 'Organization document upload and verification',
    },
    {
      name: 'Admin',
      description: 'Admin-only organization review endpoints',
    },
    {
      name: 'Products',
      description: 'Marketplace product listings from supply-side organizations',
    },
    {
      name: 'Cart',
      description: "Authenticated buyer's product cart (never shared with campaign donations)",
    },
    {
      name: 'Users',
      description: 'Authenticated user profile endpoints (currently: delivery addresses)',
    },
    {
      name: 'Orders',
      description: 'Checkout, payment (Paystack), and order fulfillment',
    },
    {
      name: 'Webhooks',
      description: 'Payment provider webhooks — not called by frontend clients',
    },
    {
      name: 'Campaigns',
      description:
        'Campaign browsing, donations, and campaign-org management. Donation funds are restricted-use — see the fund-summary endpoint.',
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
    '/v1/otp/request': {
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
          429: {
            description: 'Too Many Requests',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
                examples: {
                  OtpResendCooldown: {
                    value: {
                      status: false,
                      message: 'Please wait before requesting another OTP',
                      error: { code: ErrorCode.OTP_RESEND_COOLDOWN },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/v1/otp/verify': {
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
    '/v1/onboarding/account-type': {
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
    '/v1/onboarding/individual': {
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
    '/v1/onboarding/organization': {
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
    '/v1/auth/login': {
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
    '/v1/auth/refresh': {
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
    '/v1/auth/logout': {
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
    '/v1/auth/me': {
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
    '/v1/auth/forgot-password': {
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
    '/v1/auth/reset-password': {
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
    '/v1/auth/change-password': {
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
    '/v1/organizations/document-catalog': {
      get: {
        tags: ['Organizations'],
        summary: 'Get required documents for the current org',
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: "Required document list for this org's category",
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/DocumentCatalogResponse' },
              },
            },
          },
          401: {
            description: 'Not authenticated',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } },
            },
          },
          400: {
            description: 'Organization type not set',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } },
            },
          },
        },
      },
    },
    '/v1/organizations/documents': {
      post: {
        tags: ['Organizations'],
        summary: 'Upload verification documents',
        description:
          "A single submission must include every mandatory document type for the org's category (see /document-catalog). Sets verificationStatus to under_review on success.",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: { $ref: '#/components/schemas/UploadDocumentsRequest' },
            },
          },
        },
        responses: {
          201: {
            description: 'Documents uploaded successfully',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/DocumentsSuccessResponse' },
              },
            },
          },
          400: {
            description: 'Invalid or missing document types',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
                examples: {
                  MissingRequired: {
                    value: {
                      status: false,
                      message:
                        'Missing required document(s): proof_of_address, business_registration',
                      error: { code: ErrorCode.VALIDATION_ERROR },
                    },
                  },
                },
              },
            },
          },
          401: {
            description: 'Not authenticated',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } },
            },
          },
          403: {
            description: 'Not an organization account',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } },
            },
          },
          409: {
            description: 'Already verified',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } },
            },
          },
        },
      },
    },
    '/v1/organizations/verification-status': {
      get: {
        tags: ['Organizations'],
        summary: 'Get own verification status and submitted documents',
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: 'Verification status retrieved',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/VerificationStatusResponse' },
              },
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
    '/v1/organizations/dashboard': {
      get: {
        tags: ['Organizations'],
        summary: 'Organization dashboard stats (verified orgs only)',
        description:
          'Replaces the Phase 6 placeholder. Middleware chain: protect -> requireRole(organization) -> requireVerifiedOrganization — the requireRole step is new as of Phase 13 (the old placeholder was deliberately reachable by any role to prove requireVerifiedOrganization ignored non-organization roles; real stats logic doesn\'t make sense for a non-organization account). Response shape branches on the org\'s category (supply vs campaign), discriminated by the `category` field. Supply: `revenue` is the sum of `order.subtotal` (NOT `order.total`) across the org\'s `paymentStatus: completed` orders — deliberately excludes deliveryFee, which isn\'t product revenue. Campaign: `totalRaised` sums `Campaign.currentFunding` (not a live CampaignFund re-read); `familiesReached` sums `beneficiaries` across every distributionRecords entry on all of the org\'s campaigns.',
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: 'Dashboard stats retrieved',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/DashboardStatsResponse' },
                examples: {
                  SupplyOrg: {
                    value: {
                      status: true,
                      message: 'Dashboard stats retrieved',
                      data: { category: 'supply', totalProducts: 12, totalOrders: 34, revenue: 450000 },
                    },
                  },
                  CampaignOrg: {
                    value: {
                      status: true,
                      message: 'Dashboard stats retrieved',
                      data: { category: 'campaign', activeCampaigns: 2, totalRaised: 125000, familiesReached: 340 },
                    },
                  },
                },
              },
            },
          },
          401: {
            description: 'Not authenticated',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } },
            },
          },
          403: {
            description: 'Not an organization account, or organization not verified',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
                examples: {
                  NotAnOrganization: {
                    value: {
                      status: false,
                      message: 'You do not have permission to perform this action',
                      error: { code: ErrorCode.FORBIDDEN },
                    },
                  },
                  NotVerified: {
                    value: {
                      status: false,
                      message:
                        'Your organization is pending verification. Please complete document submission and wait for admin approval.',
                      error: { code: ErrorCode.ORGANIZATION_NOT_VERIFIED },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/v1/admin/organizations': {
      get: {
        tags: ['Admin'],
        summary: 'List organizations (admin only)',
        description:
          'Paginated (Phase 16) — was previously an unbounded plain array; this is a breaking response-shape change (array → { data, meta }) for any existing consumer.',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'status',
            in: 'query',
            required: false,
            schema: { type: 'string', enum: Object.values(VerificationStatus) },
            description: 'Filter by verificationStatus',
          },
          { name: 'page', in: 'query', required: false, schema: { type: 'integer', default: 1 } },
          {
            name: 'limit',
            in: 'query',
            required: false,
            schema: { type: 'integer', default: 20, maximum: 50 },
          },
        ],
        responses: {
          200: {
            description: 'Organizations retrieved',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/OrganizationListResponse' },
              },
            },
          },
          401: {
            description: 'Not authenticated',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } },
            },
          },
          403: {
            description: 'Not an admin',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } },
            },
          },
        },
      },
    },
    '/v1/admin/organizations/{id}': {
      get: {
        tags: ['Admin'],
        summary: 'Get organization detail + documents (admin only)',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: {
            description: 'Organization detail retrieved',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/OrganizationDetailResponse' },
              },
            },
          },
          401: {
            description: 'Not authenticated',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } },
            },
          },
          403: {
            description: 'Not an admin',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } },
            },
          },
          404: {
            description: 'Organization not found',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } },
            },
          },
        },
      },
    },
    '/v1/admin/organizations/{id}/verify': {
      put: {
        tags: ['Admin'],
        summary: 'Approve or reject an organization (admin only)',
        description:
          'Not single-use — this can be called at any time regardless of the organization\'s current verificationStatus, to let admin correct a prior mistake in either direction (verified → rejected or vice versa). This is a deliberate admin-override capability, distinct from the org\'s own resubmission flow (which does not exist). The same notification email fires on every call, including corrections. rejectionReason is persisted on the User document (not just emailed) and is retrievable via GET /v1/organizations/verification-status (org\'s own view) and GET /v1/admin/organizations/{id} (admin\'s view); it is explicitly cleared back to null whenever the decision becomes approved.',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ReviewOrganizationRequest' },
              examples: {
                Approve: { value: { decision: 'approved' } },
                Reject: {
                  value: { decision: 'rejected', rejectionReason: 'Document image was unreadable' },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Organization reviewed',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/UserSuccessResponse' } },
            },
          },
          400: {
            description: 'rejectionReason required when rejecting',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
                examples: {
                  MissingReason: {
                    value: {
                      status: false,
                      message: 'rejectionReason is required when rejecting',
                      error: { code: ErrorCode.VALIDATION_ERROR },
                    },
                  },
                },
              },
            },
          },
          401: {
            description: 'Not authenticated',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } },
            },
          },
          403: {
            description: 'Not an admin',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } },
            },
          },
          404: {
            description: 'Organization not found',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } },
            },
          },
        },
      },
    },
    '/v1/admin/campaigns': {
      get: {
        tags: ['Admin'],
        summary: 'List campaigns (admin only)',
        description: 'Paginated (Phase 16) — was previously an unbounded plain array.',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'status',
            in: 'query',
            required: false,
            schema: { type: 'string', enum: Object.values(CampaignStatus), default: 'pending_approval' },
            description: 'Filter by status. Defaults to pending_approval.',
          },
          { name: 'page', in: 'query', required: false, schema: { type: 'integer', default: 1 } },
          {
            name: 'limit',
            in: 'query',
            required: false,
            schema: { type: 'integer', default: 20, maximum: 50 },
          },
        ],
        responses: {
          200: {
            description: 'Campaigns retrieved',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/AdminCampaignListResponse' } },
            },
          },
          401: {
            description: 'Not authenticated',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } },
            },
          },
          403: {
            description: 'Not an admin',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } },
            },
          },
        },
      },
    },
    '/v1/admin/campaigns/{id}/approve': {
      put: {
        tags: ['Admin'],
        summary: 'Approve or reject a campaign (admin only)',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ReviewCampaignRequest' },
              examples: {
                Approve: { value: { decision: 'approved' } },
                Reject: {
                  value: { decision: 'rejected', rejectionReason: 'Missing distribution plan detail' },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Campaign reviewed',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/CampaignSuccessResponse' } },
            },
          },
          400: {
            description: 'rejectionReason required when rejecting',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
                examples: {
                  MissingReason: {
                    value: {
                      status: false,
                      message: 'rejectionReason is required when rejecting',
                      error: { code: ErrorCode.VALIDATION_ERROR },
                    },
                  },
                },
              },
            },
          },
          401: {
            description: 'Not authenticated',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } },
            },
          },
          403: {
            description: 'Not an admin',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } },
            },
          },
          404: {
            description: 'Campaign not found',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } },
            },
          },
          409: {
            description: 'Campaign has already been reviewed',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } },
            },
          },
        },
      },
    },
    '/v1/admin/orders/expire-stale': {
      post: {
        tags: ['Admin'],
        summary: 'Manually trigger the order auto-expiry sweep (admin only)',
        description:
          'Calls the exact same OrderService.expireStaleOrders() the every-5-minutes cron job (node-cron, in-process) calls — for ops and for testing without waiting on a real clock. Cancels every order still paymentStatus: pending older than ORDER_EXPIRY_MINUTES (default 30), sets orderStatus: cancelled and cancellationReason: payment_expired, restores stock, and marks the related Transaction failed. Every order sharing a checkoutReference expires together. Safe to call repeatedly — idempotent, returns expiredCount: 0 when there is nothing left to expire.',
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: 'Sweep completed',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ExpireStaleOrdersResponse' },
                examples: {
                  Expired: {
                    value: {
                      status: true,
                      message: 'Stale orders expired',
                      data: { expiredCount: 2 },
                    },
                  },
                  NothingToExpire: {
                    value: {
                      status: true,
                      message: 'Stale orders expired',
                      data: { expiredCount: 0 },
                    },
                  },
                },
              },
            },
          },
          401: {
            description: 'Not authenticated',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } },
            },
          },
          403: {
            description: 'Not an admin',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } },
            },
          },
        },
      },
    },
    '/v1/admin/users': {
      get: {
        tags: ['Admin'],
        summary: 'List all platform users (admin only)',
        description:
          'Platform-wide user visibility — every account regardless of role or active status. `search` matches email/firstName/lastName/organizationName via case-insensitive regex.',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'role',
            in: 'query',
            required: false,
            schema: { type: 'string', enum: Object.values(UserRole) },
          },
          { name: 'isActive', in: 'query', required: false, schema: { type: 'boolean' } },
          { name: 'search', in: 'query', required: false, schema: { type: 'string' } },
          { name: 'page', in: 'query', required: false, schema: { type: 'integer', default: 1 } },
          {
            name: 'limit',
            in: 'query',
            required: false,
            schema: { type: 'integer', default: 20, maximum: 50 },
          },
        ],
        responses: {
          200: {
            description: 'Users retrieved',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/AdminUserListResponse' } },
            },
          },
          401: {
            description: 'Not authenticated',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } },
            },
          },
          403: {
            description: 'Not an admin',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } },
            },
          },
        },
      },
    },
    '/v1/admin/users/{id}/status': {
      put: {
        tags: ['Admin'],
        summary: "Activate or deactivate a user's account (admin only)",
        description:
          'A status toggle on the existing `isActive` field — not a new status system. Deactivating a user only blocks their FUTURE login attempts (reuses the existing AuthService.login isActive check); it does NOT delete, hide, or alter their historical orders, campaigns, or products.',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['isActive'],
                properties: { isActive: { type: 'boolean' } },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'User status updated',
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
          403: {
            description: 'Not an admin',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } },
            },
          },
          404: {
            description: 'User not found',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } },
            },
          },
        },
      },
    },
    '/v1/admin/orders': {
      get: {
        tags: ['Admin'],
        summary: 'List all platform orders across every buyer (admin only)',
        description:
          'Unlike GET /v1/orders (buyer-scoped) or the seller-incoming list, this has no buyer/seller restriction at all — every order on the platform. Single-order detail already works via the existing GET /v1/orders/{orderNumber} (admin is already permitted there since Phase 11); this is only the missing LIST endpoint.',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'orderStatus',
            in: 'query',
            required: false,
            schema: { type: 'string', enum: Object.values(OrderStatus) },
          },
          {
            name: 'paymentStatus',
            in: 'query',
            required: false,
            schema: { type: 'string', enum: ['pending', 'completed', 'failed'] },
          },
          { name: 'page', in: 'query', required: false, schema: { type: 'integer', default: 1 } },
          {
            name: 'limit',
            in: 'query',
            required: false,
            schema: { type: 'integer', default: 20, maximum: 50 },
          },
        ],
        responses: {
          200: {
            description: 'Orders retrieved',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/AdminOrderListResponse' } },
            },
          },
          401: {
            description: 'Not authenticated',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } },
            },
          },
          403: {
            description: 'Not an admin',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } },
            },
          },
        },
      },
    },
    '/v1/admin/products': {
      get: {
        tags: ['Admin'],
        summary: 'List all platform products, including unmoderated ones (admin only)',
        description:
          'Deliberately bypasses the isActive/deactivated-seller filtering that GET /v1/products applies for public browsing (Phase 11.5.3) — admin needs to see everything, including inactive products, products belonging to deactivated organizations, and products of any moderationStatus.',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'isActive', in: 'query', required: false, schema: { type: 'boolean' } },
          {
            name: 'moderationStatus',
            in: 'query',
            required: false,
            schema: { type: 'string', enum: Object.values(ProductModerationStatus) },
          },
          { name: 'category', in: 'query', required: false, schema: { type: 'string' } },
          { name: 'sellerId', in: 'query', required: false, schema: { type: 'string' } },
          { name: 'page', in: 'query', required: false, schema: { type: 'integer', default: 1 } },
          {
            name: 'limit',
            in: 'query',
            required: false,
            schema: { type: 'integer', default: 20, maximum: 50 },
          },
        ],
        responses: {
          200: {
            description: 'Products retrieved',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/AdminProductListResponse' },
              },
            },
          },
          401: {
            description: 'Not authenticated',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } },
            },
          },
          403: {
            description: 'Not an admin',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } },
            },
          },
        },
      },
    },
    '/v1/admin/products/{id}/moderate': {
      put: {
        tags: ['Admin'],
        summary: 'Approve or reject a pending product listing (admin only)',
        description:
          'Same pattern as organization verification and campaign approval — rejectionReason is required when rejecting, and a product that has already been reviewed cannot be re-moderated (409). Sends a Brevo email to the seller either way.',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['decision'],
                properties: {
                  decision: { type: 'string', enum: ['approved', 'rejected'], example: 'approved' },
                  rejectionReason: {
                    type: 'string',
                    description: 'Required when decision is rejected.',
                    example: 'Product images are unclear — please resubmit with clearer photos.',
                  },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Product moderated',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/ProductSuccessResponse' } },
            },
          },
          400: {
            description: 'rejectionReason missing when rejecting',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } },
            },
          },
          401: {
            description: 'Not authenticated',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } },
            },
          },
          403: {
            description: 'Not an admin',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } },
            },
          },
          404: {
            description: 'Product not found',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } },
            },
          },
          409: {
            description: 'Product has already been reviewed',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } },
            },
          },
        },
      },
    },
    '/v1/admin/dashboard': {
      get: {
        tags: ['Admin'],
        summary: 'Platform-wide dashboard stats (admin only)',
        description:
          'Distinct from GET /v1/organizations/dashboard (Phase 13, per-organization, org-facing) — this is platform-wide across all users/orders/campaigns. `orders.revenue` is the sum of `subtotal` (never `total`) across `paymentStatus: completed` orders, same definition as Phase 13. `campaigns.totalDonated` sums `Campaign.currentFunding` across every campaign. `recentActivity` merges the last 10 orders and last 10 campaign submissions, sorted by createdAt descending, capped at 10 total. All independent aggregates run in parallel via Promise.all.',
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: 'Dashboard stats retrieved',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/AdminDashboardResponse' },
              },
            },
          },
          401: {
            description: 'Not authenticated',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } },
            },
          },
          403: {
            description: 'Not an admin',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } },
            },
          },
        },
      },
    },
    '/v1/products': {
      get: {
        tags: ['Products'],
        summary: 'List products (public)',
        description:
          'Public marketplace listing. Always filters isActive: true and moderationStatus: approved (Phase 19) — new listings default to pending and are invisible here until an admin approves them.',
        parameters: [
          { name: 'category', in: 'query', required: false, schema: { type: 'string' } },
          { name: 'state', in: 'query', required: false, schema: { type: 'string' } },
          { name: 'lga', in: 'query', required: false, schema: { type: 'string' } },
          { name: 'minPrice', in: 'query', required: false, schema: { type: 'number' } },
          { name: 'maxPrice', in: 'query', required: false, schema: { type: 'number' } },
          {
            name: 'search',
            in: 'query',
            required: false,
            schema: { type: 'string' },
            description: 'Regex-matched against name and description',
          },
          {
            name: 'sort',
            in: 'query',
            required: false,
            schema: {
              type: 'string',
              enum: ['price_asc', 'price_desc', 'newest'],
              default: 'newest',
            },
          },
          { name: 'page', in: 'query', required: false, schema: { type: 'integer', default: 1 } },
          {
            name: 'limit',
            in: 'query',
            required: false,
            schema: { type: 'integer', default: 20, maximum: 50 },
          },
        ],
        responses: {
          200: {
            description: 'Products retrieved',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/ProductListResponse' } },
            },
          },
          400: {
            description: 'Invalid query parameters',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } },
            },
          },
        },
      },
      post: {
        tags: ['Products'],
        summary: 'Create a product (verified farmer/vendor organizations only)',
        description:
          'Middleware chain: protect -> requireVerifiedOrganization -> requireSupplyOrganization. seller is always taken from the authenticated user, never from the request body.',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: { $ref: '#/components/schemas/CreateProductRequest' },
            },
          },
        },
        responses: {
          201: {
            description: 'Product created successfully',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ProductSuccessResponse' },
              },
            },
          },
          400: {
            description: 'Validation error',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
                examples: {
                  MinimumOrderExceedsQuantity: {
                    value: {
                      status: false,
                      message: 'minimumOrder cannot exceed quantityAvailable',
                      error: { code: ErrorCode.VALIDATION_ERROR },
                    },
                  },
                },
              },
            },
          },
          401: {
            description: 'Not authenticated',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } },
            },
          },
          403: {
            description: 'Organization not verified, or not a supply-side organization',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
                examples: {
                  NotVerified: {
                    value: {
                      status: false,
                      message:
                        'Your organization is pending verification. Please complete document submission and wait for admin approval.',
                      error: { code: ErrorCode.ORGANIZATION_NOT_VERIFIED },
                    },
                  },
                  NotSupplyOrganization: {
                    value: {
                      status: false,
                      message: 'Only farmer or vendor organizations can perform this action',
                      error: { code: ErrorCode.SUPPLY_ORGANIZATION_REQUIRED },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/v1/products/{id}': {
      get: {
        tags: ['Products'],
        summary: 'Get product detail (public)',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: {
            description: 'Product retrieved',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ProductSuccessResponse' },
              },
            },
          },
          404: {
            description: 'Product not found or inactive',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
                examples: {
                  ProductNotFound: {
                    value: {
                      status: false,
                      message: 'Product not found',
                      error: { code: ErrorCode.PRODUCT_NOT_FOUND },
                    },
                  },
                },
              },
            },
          },
        },
      },
      put: {
        tags: ['Products'],
        summary: 'Update a product (owner only)',
        description:
          'seller cannot be changed. Image replacement is not supported by this endpoint yet.',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/UpdateProductRequest' } },
          },
        },
        responses: {
          200: {
            description: 'Product updated successfully',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ProductSuccessResponse' },
              },
            },
          },
          400: {
            description: 'Validation error',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } },
            },
          },
          401: {
            description: 'Not authenticated',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } },
            },
          },
          403: {
            description: 'Not the product owner',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
                examples: {
                  NotOwner: {
                    value: {
                      status: false,
                      message: 'You do not have permission to modify this product',
                      error: { code: ErrorCode.FORBIDDEN },
                    },
                  },
                },
              },
            },
          },
          404: {
            description: 'Product not found',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } },
            },
          },
        },
      },
      delete: {
        tags: ['Products'],
        summary: 'Soft-delete a product (owner only)',
        description:
          'Sets isActive to false. The document is not actually removed from the database.',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: {
            description: 'Product deleted successfully',
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
          403: {
            description: 'Not the product owner',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } },
            },
          },
          404: {
            description: 'Product not found',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } },
            },
          },
        },
      },
    },
    '/v1/cart/add': {
      post: {
        tags: ['Cart'],
        summary: 'Add a product to the cart (or increment if already present)',
        description:
          'If the product is already in the cart, quantity is incremented by the requested amount, capped at quantityAvailable — a request that would exceed stock is rejected outright, never silently truncated. minimumOrder is only enforced on the first add of a given product.',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/AddToCartRequest' },
              examples: {
                AddExample: { value: { productId: '60d0fe4f54e0d9001c23a4a1', quantity: 2 } },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Item added, current cart returned',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/CartSuccessResponse' } },
            },
          },
          400: {
            description: 'Validation error',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
                examples: {
                  BelowMinimumOrder: {
                    value: {
                      status: false,
                      message: 'Minimum order for this product is 5',
                      error: { code: ErrorCode.VALIDATION_ERROR },
                    },
                  },
                  ExceedsStock: {
                    value: {
                      status: false,
                      message: 'Only 10 crate(s) available',
                      error: { code: ErrorCode.VALIDATION_ERROR },
                    },
                  },
                },
              },
            },
          },
          401: {
            description: 'Not authenticated',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } },
            },
          },
          404: {
            description: 'Product not found or inactive',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
                examples: {
                  ProductNotFound: {
                    value: {
                      status: false,
                      message: 'Product not found',
                      error: { code: ErrorCode.PRODUCT_NOT_FOUND },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/v1/cart': {
      get: {
        tags: ['Cart'],
        summary: "Get the caller's own cart",
        description:
          "Always the authenticated user's own cart — there is no way to pass another user's id. Returns an empty cart shape (not a 404) if the user has no cart yet. Items whose product is no longer active/approved are still listed, flagged unavailable: true, and excluded from subtotal/totalItems.",
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: 'Cart retrieved',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/CartSuccessResponse' } },
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
      delete: {
        tags: ['Cart'],
        summary: 'Clear the entire cart',
        description:
          'Empties items in one call. Returns the same empty-cart shape as GET /cart with no items, rather than a distinct empty-state shape.',
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: 'Cart cleared',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/CartSuccessResponse' } },
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
    '/v1/cart/update': {
      put: {
        tags: ['Cart'],
        summary: 'Set an item to an exact quantity',
        description:
          'quantity: 0 removes the item, same as DELETE /v1/cart/{productId}. Otherwise enforces the same quantityAvailable stock-cap as /cart/add (minimumOrder is not re-enforced here, so an existing line can always be reduced). 404 if the product is not currently in the cart.',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/UpdateCartRequest' },
              examples: {
                SetQuantity: { value: { productId: '60d0fe4f54e0d9001c23a4a1', quantity: 3 } },
                RemoveViaZero: { value: { productId: '60d0fe4f54e0d9001c23a4a1', quantity: 0 } },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Cart updated',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/CartSuccessResponse' } },
            },
          },
          400: {
            description: 'Validation error (e.g. exceeds quantityAvailable)',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } },
            },
          },
          401: {
            description: 'Not authenticated',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } },
            },
          },
          404: {
            description: 'Product not in cart, or product not found/inactive',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
                examples: {
                  NotInCart: {
                    value: {
                      status: false,
                      message: 'Product not in cart',
                      error: { code: ErrorCode.NOT_FOUND },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/v1/cart/increment': {
      patch: {
        tags: ['Cart'],
        summary: 'Increment or decrement an existing item by exactly 1 (stepper UI)',
        description:
          "For the +/- stepper on an item already in the cart. POST /v1/cart/add remains the entry point for adding a new quantity from a product page — this endpoint only accepts delta: 1 or -1, not a general 'add N'. Applied as an atomic MongoDB increment so two rapid-fire calls can never lose an update the way a naive read-then-write would. delta: -1 on a quantity-1 item removes it, same as setting quantity: 0 via PUT /cart/update. Returns the full cart shape (same as GET /v1/cart) so the UI can update its stepper directly from the response.",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/AdjustCartQuantityRequest' },
              examples: {
                Increment: { value: { productId: '60d0fe4f54e0d9001c23a4a1', delta: 1 } },
                Decrement: { value: { productId: '60d0fe4f54e0d9001c23a4a1', delta: -1 } },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Cart updated',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/CartSuccessResponse' } },
            },
          },
          400: {
            description:
              'Validation error (delta not exactly 1 or -1, or exceeds quantityAvailable)',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
                examples: {
                  InvalidDelta: {
                    value: {
                      status: false,
                      message: 'delta must be exactly 1 or -1',
                      error: { code: ErrorCode.VALIDATION_ERROR },
                    },
                  },
                  ExceedsStock: {
                    value: {
                      status: false,
                      message: 'Only 10 crate(s) available',
                      error: { code: ErrorCode.VALIDATION_ERROR },
                    },
                  },
                },
              },
            },
          },
          401: {
            description: 'Not authenticated',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } },
            },
          },
          404: {
            description: 'Product not in cart',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } },
            },
          },
        },
      },
    },
    '/v1/cart/{productId}': {
      delete: {
        tags: ['Cart'],
        summary: 'Remove one item from the cart',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'productId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: {
            description: 'Item removed, current cart returned',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/CartSuccessResponse' } },
            },
          },
          401: {
            description: 'Not authenticated',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } },
            },
          },
          404: {
            description: 'Product not in cart',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } },
            },
          },
        },
      },
    },
    '/v1/users/addresses': {
      get: {
        tags: ['Users'],
        summary: "Get the caller's own delivery addresses",
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: 'Delivery addresses retrieved',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/AddressListResponse' } },
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
      post: {
        tags: ['Users'],
        summary: 'Add a delivery address',
        description:
          'Max 5 addresses per user. The first address added is always auto-set as default, regardless of anything sent in the body — isDefault is not an accepted field here at all.',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/CreateAddressRequest' } },
          },
        },
        responses: {
          201: {
            description: 'Delivery address added, full address list returned',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/AddressListResponse' } },
            },
          },
          400: {
            description:
              'Validation error (invalid state, malformed phone, or already at 5 addresses)',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
                examples: {
                  MaxAddresses: {
                    value: {
                      status: false,
                      message: 'You can only save up to 5 delivery addresses',
                      error: { code: ErrorCode.VALIDATION_ERROR },
                    },
                  },
                },
              },
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
    '/v1/users/addresses/{addressId}': {
      put: {
        tags: ['Users'],
        summary: 'Update a delivery address',
        description:
          "Must belong to the caller — 404 (not 403) if addressId isn't found within their own address list, so existence for another user is never confirmed. isDefault cannot be changed here; use PATCH /v1/users/addresses/{addressId}/default instead. Fields left out of the body are untouched.",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'addressId', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/UpdateAddressRequest' } },
          },
        },
        responses: {
          200: {
            description: 'Delivery address updated, full address list returned',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/AddressListResponse' } },
            },
          },
          400: {
            description: 'Validation error',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } },
            },
          },
          401: {
            description: 'Not authenticated',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } },
            },
          },
          404: {
            description: 'Address not found (or belongs to a different user)',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } },
            },
          },
        },
      },
      delete: {
        tags: ['Users'],
        summary: 'Remove a delivery address',
        description:
          'Same caller-ownership rule as PUT. If the removed address was the default and others remain, the most recently added remaining address is automatically promoted to default. Removing the last address is fine — a user can have zero addresses.',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'addressId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: {
            description: 'Delivery address removed, full address list returned',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/AddressListResponse' } },
            },
          },
          401: {
            description: 'Not authenticated',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } },
            },
          },
          404: {
            description: 'Address not found (or belongs to a different user)',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } },
            },
          },
        },
      },
    },
    '/v1/users/addresses/{addressId}/default': {
      patch: {
        tags: ['Users'],
        summary: 'Explicitly set an address as the default',
        description:
          'Un-defaults every other address for this user — only one isDefault: true at a time, enforced server-side regardless of prior state.',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'addressId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: {
            description: 'Default address updated, full address list returned',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/AddressListResponse' } },
            },
          },
          401: {
            description: 'Not authenticated',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } },
            },
          },
          404: {
            description: 'Address not found (or belongs to a different user)',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } },
            },
          },
        },
      },
    },
    '/v1/users/donations': {
      get: {
        tags: ['Users'],
        summary: "Get the caller's own donation history",
        description:
          'Any authenticated account can have donated (including an organization) — not restricted to role: user. Includes pending/failed attempts, not just completed ones, so status is always present on each item. relatedCampaign is populated one level deep (title + organization), with organization populated one further level for organizationName.',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'status',
            in: 'query',
            required: false,
            schema: { type: 'string', enum: Object.values(PaymentStatus) },
          },
          { name: 'page', in: 'query', required: false, schema: { type: 'integer', default: 1 } },
          {
            name: 'limit',
            in: 'query',
            required: false,
            schema: { type: 'integer', default: 20, maximum: 50 },
          },
        ],
        responses: {
          200: {
            description: 'Donation history retrieved',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/DonationHistoryResponse' },
              },
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
    '/v1/orders/checkout': {
      post: {
        tags: ['Orders'],
        summary: 'Checkout the cart and start payment',
        description:
          'Splits the cart into one Order per seller (linked by a shared checkoutReference), atomically reserves stock for every line, then initializes a single Paystack transaction for the combined total. The cart is NOT cleared here — only once the webhook confirms payment. Note: unlike every other endpoint that returns an Order, this response\'s orders[].buyer/items[].seller are NOT populated (they\'re freshly created in the same request the caller just authenticated as, so populating adds no information) — fetch GET /v1/orders/{orderNumber} afterward for the populated shape.',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/CheckoutRequest' } },
          },
        },
        responses: {
          201: {
            description:
              'Checkout started — orders created at paymentStatus: pending, redirect the buyer to paymentUrl',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/CheckoutSuccessResponse' },
              },
            },
          },
          400: {
            description: 'Empty cart, unavailable item, or insufficient stock',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
                examples: {
                  StockShortage: {
                    value: {
                      status: false,
                      message: 'Fresh Tomatoes is no longer available in the requested quantity',
                      error: { code: ErrorCode.VALIDATION_ERROR },
                    },
                  },
                },
              },
            },
          },
          401: {
            description: 'Not authenticated',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } },
            },
          },
          404: {
            description: 'addressId not found among the caller’s own saved addresses',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } },
            },
          },
          409: {
            description:
              'A checkout is already in progress for this buyer (rapid double-submit) — not queued, rejected immediately',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
                examples: {
                  CheckoutInProgress: {
                    value: {
                      status: false,
                      message: 'A checkout is already in progress',
                      error: { code: ErrorCode.CONFLICT },
                    },
                  },
                },
              },
            },
          },
          429: {
            description: 'Too many checkout attempts',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } },
            },
          },
          502: {
            description:
              'Payment could not be initialized (e.g. Paystack unreachable) — all reserved stock and any created orders are rolled back',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
                examples: {
                  CheckoutFailed: {
                    value: {
                      status: false,
                      message: 'Checkout could not be started, please try again',
                      error: { code: ErrorCode.CHECKOUT_FAILED },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/v1/orders': {
      get: {
        tags: ['Orders'],
        summary: "List the caller's own orders",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'orderStatus',
            in: 'query',
            required: false,
            schema: { type: 'string', enum: Object.values(OrderStatus) },
          },
          { name: 'page', in: 'query', required: false, schema: { type: 'integer', default: 1 } },
          {
            name: 'limit',
            in: 'query',
            required: false,
            schema: { type: 'integer', default: 20, maximum: 50 },
          },
        ],
        responses: {
          200: {
            description: 'Orders retrieved',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/OrderListResponse' } },
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
    '/v1/orders/checkout/{checkoutReference}': {
      get: {
        tags: ['Orders'],
        summary: 'Get all sibling orders from one checkout event',
        description:
          'For the order-confirmation screen, which may need to show a multi-seller checkout as a single event. Buyer (owner) or admin only.',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'checkoutReference', in: 'path', required: true, schema: { type: 'string' } },
        ],
        responses: {
          200: {
            description: 'Sibling orders retrieved',
            content: {
              'application/json': {
                schema: {
                  allOf: [
                    { $ref: '#/components/schemas/SuccessResponse' },
                    {
                      type: 'object',
                      properties: {
                        data: { type: 'array', items: { $ref: '#/components/schemas/Order' } },
                      },
                    },
                  ],
                },
              },
            },
          },
          401: {
            description: 'Not authenticated',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } },
            },
          },
          403: {
            description: 'checkoutReference belongs to a different buyer',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } },
            },
          },
          404: {
            description: 'No orders found for this checkoutReference',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } },
            },
          },
        },
      },
    },
    '/v1/orders/seller/incoming': {
      get: {
        tags: ['Orders'],
        summary: 'List paid orders awaiting fulfillment for the logged-in seller',
        description:
          'Only orders where paymentStatus: completed — unpaid orders never show as "incoming".',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'orderStatus',
            in: 'query',
            required: false,
            schema: { type: 'string', enum: Object.values(OrderStatus) },
          },
          { name: 'page', in: 'query', required: false, schema: { type: 'integer', default: 1 } },
          {
            name: 'limit',
            in: 'query',
            required: false,
            schema: { type: 'integer', default: 20, maximum: 50 },
          },
        ],
        responses: {
          200: {
            description: 'Incoming orders retrieved',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/OrderListResponse' } },
            },
          },
          401: {
            description: 'Not authenticated',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } },
            },
          },
          403: {
            description: 'Not verified, or not a supply-side organization',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
                examples: {
                  NotSupplyOrganization: {
                    value: {
                      status: false,
                      message: 'Only farmer or vendor organizations can perform this action',
                      error: { code: ErrorCode.SUPPLY_ORGANIZATION_REQUIRED },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/v1/orders/{orderNumber}': {
      get: {
        tags: ['Orders'],
        summary: 'Get order detail',
        description:
          'Accessible by the buyer, any seller with an item in it, or admin. 403 otherwise.',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'orderNumber', in: 'path', required: true, schema: { type: 'string' } },
        ],
        responses: {
          200: {
            description: 'Order retrieved',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/OrderSuccessResponse' } },
            },
          },
          401: {
            description: 'Not authenticated',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } },
            },
          },
          403: {
            description: 'Not the buyer, an involved seller, or an admin',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } },
            },
          },
          404: {
            description: 'Order not found',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } },
            },
          },
        },
      },
    },
    '/v1/orders/{orderNumber}/cancel': {
      post: {
        tags: ['Orders'],
        summary: 'Cancel an order (buyer only, pre-payment)',
        description:
          'Only allowed while paymentStatus !== completed. Restores stock for the order’s items. A post-payment cancel attempt is rejected — that’s a refund scenario (out of scope), not a self-cancel.',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'orderNumber', in: 'path', required: true, schema: { type: 'string' } },
        ],
        responses: {
          200: {
            description: 'Order cancelled, stock restored',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/OrderSuccessResponse' } },
            },
          },
          400: {
            description: 'Order has already been paid for',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
                examples: {
                  AlreadyPaid: {
                    value: {
                      status: false,
                      message:
                        'This order has already been paid for and can no longer be self-cancelled. Please contact support.',
                      error: { code: ErrorCode.ORDER_ALREADY_PAID },
                    },
                  },
                },
              },
            },
          },
          401: {
            description: 'Not authenticated',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } },
            },
          },
          404: {
            description: 'Order not found (or not owned by the caller)',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } },
            },
          },
        },
      },
    },
    '/v1/orders/{orderNumber}/confirm-delivery': {
      post: {
        tags: ['Orders'],
        summary: 'Buyer confirms delivery (from in_transit only)',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'orderNumber', in: 'path', required: true, schema: { type: 'string' } },
        ],
        responses: {
          200: {
            description: 'Delivery confirmed, deliveredAt set',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/OrderSuccessResponse' } },
            },
          },
          400: {
            description: 'Order is not currently in_transit',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
                examples: {
                  InvalidTransition: {
                    value: {
                      status: false,
                      message: 'Order must be in_transit to confirm delivery (currently preparing)',
                      error: { code: ErrorCode.INVALID_STATUS_TRANSITION },
                    },
                  },
                },
              },
            },
          },
          401: {
            description: 'Not authenticated',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } },
            },
          },
          404: {
            description: 'Order not found (or not owned by the caller)',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } },
            },
          },
        },
      },
    },
    '/v1/orders/{orderNumber}/status': {
      put: {
        tags: ['Orders'],
        summary: 'Seller advances order status (forward-only, one step at a time)',
        description:
          'pending -> confirmed -> preparing -> in_transit -> delivered. Any backward or skipped transition is rejected. Requires the caller to own at least one item in the order.',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'orderNumber', in: 'path', required: true, schema: { type: 'string' } },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/UpdateOrderStatusRequest' },
              examples: { Advance: { value: { status: 'confirmed' } } },
            },
          },
        },
        responses: {
          200: {
            description: 'Order status updated',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/OrderSuccessResponse' } },
            },
          },
          400: {
            description: 'Backward or skipped transition',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
                examples: {
                  InvalidTransition: {
                    value: {
                      status: false,
                      message: 'Cannot transition order from pending to in_transit',
                      error: { code: ErrorCode.INVALID_STATUS_TRANSITION },
                    },
                  },
                },
              },
            },
          },
          401: {
            description: 'Not authenticated',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } },
            },
          },
          403: {
            description:
              'Not verified, not a supply-side organization, or doesn’t own an item in this order',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } },
            },
          },
          404: {
            description: 'Order not found',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } },
            },
          },
        },
      },
    },
    '/v1/campaigns': {
      get: {
        tags: ['Campaigns'],
        summary: 'Browse active campaigns (public)',
        description:
          'Always filters status: active, sorted by urgencyLevel (critical first) then recency.',
        parameters: [
          {
            name: 'urgencyLevel',
            in: 'query',
            required: false,
            schema: { type: 'string', enum: Object.values(UrgencyLevel) },
          },
          { name: 'state', in: 'query', required: false, schema: { type: 'string' } },
          { name: 'page', in: 'query', required: false, schema: { type: 'integer', default: 1 } },
          {
            name: 'limit',
            in: 'query',
            required: false,
            schema: { type: 'integer', default: 20, maximum: 50 },
          },
        ],
        responses: {
          200: {
            description: 'Campaigns retrieved',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/CampaignListResponse' } },
            },
          },
        },
      },
      post: {
        tags: ['Campaigns'],
        summary: 'Create a campaign (verified campaign organizations only)',
        description:
          'Middleware chain: protect -> requireVerifiedOrganization -> requireCampaignOrganization. organization is always taken from the authenticated user. Created at status: pending_approval; a restricted CampaignFund is created alongside it automatically.',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: { $ref: '#/components/schemas/CreateCampaignRequest' },
            },
          },
        },
        responses: {
          201: {
            description: 'Campaign created — pending admin approval',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/CampaignSuccessResponse' } },
            },
          },
          400: {
            description: 'Validation error (title/description length, invalid dates, etc.)',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } },
            },
          },
          401: {
            description: 'Not authenticated',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } },
            },
          },
          403: {
            description: 'Organization not verified, or not a campaign-side organization',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
                examples: {
                  NotCampaignOrganization: {
                    value: {
                      status: false,
                      message:
                        'Only NGO, foundation, religious body, or agency organizations can perform this action',
                      error: { code: ErrorCode.CAMPAIGN_ORGANIZATION_REQUIRED },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/v1/campaigns/{id}': {
      get: {
        tags: ['Campaigns'],
        summary: 'Get campaign detail',
        description:
          'Public for status: active campaigns. If an authenticated request comes from the owning organization or an admin (bearer token optional on this route), any status is visible — otherwise a non-active campaign 404s the same as if it didn’t exist.',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: {
            description: 'Campaign retrieved',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/CampaignSuccessResponse' } },
            },
          },
          404: {
            description: 'Campaign not found, or not visible to this caller',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } },
            },
          },
        },
      },
      put: {
        tags: ['Campaigns'],
        summary: 'Update a campaign (owner only)',
        description:
          'Only description, distributionPlan, urgencyLevel, and fundingGoal are editable. fundingGoal cannot be changed once currentFunding > 0.',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/UpdateCampaignRequest' } },
          },
        },
        responses: {
          200: {
            description: 'Campaign updated successfully',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/CampaignSuccessResponse' } },
            },
          },
          400: {
            description: 'Validation error, or fundingGoal change after donations have come in',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
                examples: {
                  FundingGoalLocked: {
                    value: {
                      status: false,
                      message: 'fundingGoal cannot be changed once a campaign has received donations',
                      error: { code: ErrorCode.VALIDATION_ERROR },
                    },
                  },
                },
              },
            },
          },
          401: {
            description: 'Not authenticated',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } },
            },
          },
          403: {
            description: 'Not the campaign owner',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } },
            },
          },
          404: {
            description: 'Campaign not found',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } },
            },
          },
        },
      },
    },
    '/v1/campaigns/{id}/donate': {
      post: {
        tags: ['Campaigns'],
        summary: 'Donate to a campaign',
        description:
          'Any authenticated account can donate — not role-restricted. Validates the campaign is active and the amount meets DONATION_MINIMUM_KOBO before ever calling Paystack. Funds are recorded against the CampaignFund only once the webhook confirms payment.',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/DonateRequest' } },
          },
        },
        responses: {
          201: {
            description: 'Donation payment started — redirect the donor to paymentUrl',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/DonateSuccessResponse' } },
            },
          },
          400: {
            description: 'Campaign not active, or amount below the minimum',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
                examples: {
                  BelowMinimum: {
                    value: {
                      status: false,
                      message: 'Minimum donation is ₦500',
                      error: { code: ErrorCode.VALIDATION_ERROR },
                    },
                  },
                  NotActive: {
                    value: {
                      status: false,
                      message: 'This campaign is not currently accepting donations',
                      error: { code: ErrorCode.CAMPAIGN_NOT_ACTIVE },
                    },
                  },
                },
              },
            },
          },
          401: {
            description: 'Not authenticated',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } },
            },
          },
          404: {
            description: 'Campaign not found',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } },
            },
          },
        },
      },
    },
    '/v1/campaigns/{id}/updates': {
      post: {
        tags: ['Campaigns'],
        summary: 'Post a campaign update (owner only)',
        description:
          'Appends to campaignUpdates. Deliberately does NOT email past donors — the Notification domain doesn’t exist yet.',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/PostCampaignUpdateRequest' } },
          },
        },
        responses: {
          201: {
            description: 'Campaign update posted',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/CampaignSuccessResponse' } },
            },
          },
          401: {
            description: 'Not authenticated',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } },
            },
          },
          403: {
            description: 'Not the campaign owner',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } },
            },
          },
        },
      },
    },
    '/v1/campaigns/{id}/distribution-records': {
      post: {
        tags: ['Campaigns'],
        summary: 'Add a distribution record (owner only)',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: { $ref: '#/components/schemas/AddDistributionRecordRequest' },
            },
          },
        },
        responses: {
          201: {
            description: 'Distribution record added',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/CampaignSuccessResponse' } },
            },
          },
          401: {
            description: 'Not authenticated',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } },
            },
          },
          403: {
            description: 'Not the campaign owner',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } },
            },
          },
        },
      },
    },
    '/v1/campaigns/{id}/fund-summary': {
      get: {
        tags: ['Campaigns'],
        summary: 'Get the campaign fund summary (owner only) — restricted-funds enforcement point',
        description:
          'Returns EXACTLY 6 fields: totalDonated, totalAllocatedToFood, totalDelivered, availableForProcurement, donorCount, mealsEquivalent. No cash-suggestive field (cashBalance/withdrawable/bankBalance or similar) is ever present — see BACKEND_RULES.md §20.',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: {
            description: 'Fund summary retrieved',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/CampaignFundSummaryResponse' },
              },
            },
          },
          401: {
            description: 'Not authenticated',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } },
            },
          },
          403: {
            description: 'Not the campaign owner',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } },
            },
          },
          404: {
            description: 'Campaign or fund not found',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } },
            },
          },
        },
      },
    },
    '/v1/campaigns/{id}/donations': {
      get: {
        tags: ['Campaigns'],
        summary: 'List sanitized donations for a campaign (owner only)',
        description:
          'Donor identity is reduced to name only — email/phone are never exposed to the org. Paginated (Phase 16) — a popular campaign\'s donation list has no upper bound, unlike e.g. delivery addresses.',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'page', in: 'query', required: false, schema: { type: 'integer', default: 1 } },
          {
            name: 'limit',
            in: 'query',
            required: false,
            schema: { type: 'integer', default: 20, maximum: 50 },
          },
        ],
        responses: {
          200: {
            description: 'Donations retrieved',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/SanitizedDonationListResponse' },
              },
            },
          },
          401: {
            description: 'Not authenticated',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } },
            },
          },
          403: {
            description: 'Not the campaign owner',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } },
            },
          },
        },
      },
    },
    '/v1/webhooks/paystack': {
      post: {
        tags: ['Webhooks'],
        summary: 'Paystack payment webhook (not called by frontend clients)',
        description:
          'Public endpoint — no bearer auth. The HMAC-SHA512 signature in the x-paystack-signature header (verified against the raw request body) IS the authentication. Always responds 200 once the signature is valid and the event is logged, before async processing runs. Idempotent: replays of the same event are detected and skipped.',
        responses: {
          200: {
            description:
              'Event received (does not imply processing has finished, only that it was accepted)',
          },
          400: {
            description: 'Missing/invalid signature, or invalid JSON payload',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
                examples: {
                  InvalidSignature: {
                    value: {
                      status: false,
                      message: 'Invalid signature',
                      error: { code: ErrorCode.INVALID_WEBHOOK_SIGNATURE },
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
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
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

      User: {
        type: 'object',
        properties: {
          _id: { type: 'string', example: '60d0fe4f54e0d9001c23a4a1' },
          email: { type: 'string', format: 'email', example: 'user@example.com' },
          firstName: { type: 'string', example: 'John', nullable: true },
          lastName: { type: 'string', example: 'Doe', nullable: true },
          phoneNumber: { type: 'string', example: '+1234567890', nullable: true },
          organizationName: { type: 'string', example: 'Acme Farms', nullable: true },
          organizationType: {
            type: 'string',
            enum: Object.values(OrganizationType),
            example: OrganizationType.FARMER,
            nullable: true,
          },
          description: {
            type: 'string',
            nullable: true,
            description:
              'Organization "what we do" / mission statement, optional, set at onboarding time. Absent (not an empty string) for organizations onboarded before this field existed, and for individual (role: user) accounts.',
            example: 'We distribute surplus fresh produce to underserved communities across Lagos.',
          },
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
          rejectionReason: {
            type: 'string',
            nullable: true,
            description:
              'Set only when verificationStatus is rejected. Explicitly cleared back to null if the organization is later approved after a prior rejection — never left stale from an old decision.',
            example: 'Submitted business registration document is expired.',
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
          description: {
            type: 'string',
            maxLength: 1000,
            description:
              'Optional — the organization\'s "what we do" / mission statement. Onboarding-time only for now; there is no edit-after-onboarding endpoint yet.',
            example: 'We distribute surplus fresh produce to underserved communities across Lagos.',
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
      UploadDocumentsRequest: {
        type: 'object',
        required: ['documents', 'documentTypes'],
        properties: {
          documents: {
            type: 'array',
            items: { type: 'string', format: 'binary' },
            description: 'Up to 5 files (PDF, JPG, or PNG), max 10MB each.',
          },
          documentTypes: {
            type: 'array',
            items: { type: 'string' },
            description:
              "One documentType slug per file, same order as documents. Must all be valid for the org's category and cover every mandatory type in this one submission.",
            example: ['government_id', 'proof_of_address', 'business_registration'],
          },
        },
      },
      VerificationDocument: {
        type: 'object',
        properties: {
          _id: { type: 'string' },
          user: { type: 'string' },
          documentType: { type: 'string', example: 'government_id' },
          fileUrl: { type: 'string', format: 'uri' },
          publicId: { type: 'string' },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      DocumentsSuccessResponse: {
        allOf: [
          { $ref: '#/components/schemas/SuccessResponse' },
          {
            type: 'object',
            properties: {
              data: { type: 'array', items: { $ref: '#/components/schemas/VerificationDocument' } },
            },
          },
        ],
      },
      VerificationStatusResponse: {
        allOf: [
          { $ref: '#/components/schemas/SuccessResponse' },
          {
            type: 'object',
            properties: {
              data: {
                type: 'object',
                properties: {
                  verificationStatus: { type: 'string', enum: Object.values(VerificationStatus) },
                  rejectionReason: {
                    type: 'string',
                    nullable: true,
                    description:
                      'Present only when verificationStatus is rejected. Absent/null once a prior rejection has been superseded by approval.',
                    example: 'Submitted business registration document is expired.',
                  },
                  documents: {
                    type: 'array',
                    items: { $ref: '#/components/schemas/VerificationDocument' },
                  },
                },
              },
            },
          },
        ],
      },
      DocumentCatalogEntry: {
        type: 'object',
        properties: {
          type: { type: 'string', example: 'government_id' },
          label: { type: 'string' },
          required: { type: 'boolean' },
        },
      },
      DocumentCatalogResponse: {
        allOf: [
          { $ref: '#/components/schemas/SuccessResponse' },
          {
            type: 'object',
            properties: {
              data: { type: 'array', items: { $ref: '#/components/schemas/DocumentCatalogEntry' } },
            },
          },
        ],
      },
      OrganizationListResponse: {
        allOf: [
          { $ref: '#/components/schemas/SuccessResponse' },
          {
            type: 'object',
            properties: {
              data: {
                type: 'object',
                properties: {
                  data: { type: 'array', items: { $ref: '#/components/schemas/User' } },
                  meta: { $ref: '#/components/schemas/PaginationMeta' },
                },
              },
            },
          },
        ],
      },
      OrganizationDetailResponse: {
        allOf: [
          { $ref: '#/components/schemas/SuccessResponse' },
          {
            type: 'object',
            properties: {
              data: {
                type: 'object',
                properties: {
                  organization: { $ref: '#/components/schemas/User' },
                  documents: {
                    type: 'array',
                    items: { $ref: '#/components/schemas/VerificationDocument' },
                  },
                },
              },
            },
          },
        ],
      },
      ReviewOrganizationRequest: {
        type: 'object',
        required: ['decision'],
        properties: {
          decision: { type: 'string', enum: ['approved', 'rejected'], example: 'approved' },
          rejectionReason: {
            type: 'string',
            description: 'Required when decision is rejected.',
            example: 'Document image was unreadable',
          },
        },
      },
      ProductSeller: {
        type: 'object',
        description: 'Badge-only seller info shown to buyers — never the full user record.',
        properties: {
          _id: { type: 'string' },
          organizationName: { type: 'string', example: 'Acme Farms' },
          organizationType: {
            type: 'string',
            enum: Object.values(OrganizationType),
            example: OrganizationType.FARMER,
          },
          verificationStatus: {
            type: 'string',
            enum: Object.values(VerificationStatus),
            example: VerificationStatus.VERIFIED,
          },
        },
      },
      ProductImage: {
        type: 'object',
        properties: {
          url: { type: 'string', format: 'uri' },
          publicId: { type: 'string' },
        },
      },
      ProductLocation: {
        type: 'object',
        required: ['state', 'lga'],
        properties: {
          state: { type: 'string', example: 'Lagos' },
          lga: { type: 'string', example: 'Ikeja' },
        },
      },
      Product: {
        type: 'object',
        properties: {
          _id: { type: 'string' },
          seller: { $ref: '#/components/schemas/ProductSeller' },
          name: { type: 'string', example: 'Fresh Tomatoes' },
          category: { type: 'string', example: 'Vegetables' },
          description: { type: 'string' },
          price: { type: 'number', example: 5000 },
          unit: { type: 'string', example: 'crate' },
          quantityAvailable: { type: 'number', example: 50 },
          minimumOrder: { type: 'number', example: 2 },
          images: { type: 'array', items: { $ref: '#/components/schemas/ProductImage' } },
          location: { $ref: '#/components/schemas/ProductLocation' },
          isActive: { type: 'boolean', example: true },
          moderationStatus: {
            type: 'string',
            enum: Object.values(ProductModerationStatus),
            example: ProductModerationStatus.PENDING,
            description:
              'New products default to pending — not auto-approved. Only approved products appear in public browse.',
          },
          rejectionReason: {
            type: 'string',
            nullable: true,
            description: 'Only present when moderationStatus is rejected.',
          },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      ProductSuccessResponse: {
        allOf: [
          { $ref: '#/components/schemas/SuccessResponse' },
          {
            type: 'object',
            properties: { data: { $ref: '#/components/schemas/Product' } },
          },
        ],
      },
      PaginationMeta: {
        type: 'object',
        properties: {
          page: { type: 'integer', example: 1 },
          limit: { type: 'integer', example: 20 },
          total: { type: 'integer', example: 42 },
          totalPages: { type: 'integer', example: 3 },
        },
      },
      ProductListResponse: {
        allOf: [
          { $ref: '#/components/schemas/SuccessResponse' },
          {
            type: 'object',
            properties: {
              data: {
                type: 'object',
                properties: {
                  products: { type: 'array', items: { $ref: '#/components/schemas/Product' } },
                  meta: { $ref: '#/components/schemas/PaginationMeta' },
                },
              },
            },
          },
        ],
      },
      CreateProductRequest: {
        type: 'object',
        required: [
          'name',
          'category',
          'description',
          'price',
          'unit',
          'quantityAvailable',
          'minimumOrder',
          'state',
          'lga',
        ],
        properties: {
          name: { type: 'string', example: 'Fresh Tomatoes' },
          category: { type: 'string', example: 'Vegetables' },
          description: { type: 'string', example: 'Farm-fresh tomatoes, harvested weekly.' },
          price: { type: 'number', example: 5000 },
          unit: { type: 'string', example: 'crate' },
          quantityAvailable: { type: 'number', example: 50 },
          minimumOrder: { type: 'number', example: 2 },
          state: { type: 'string', example: 'Lagos' },
          lga: { type: 'string', example: 'Ikeja' },
          images: {
            type: 'array',
            items: { type: 'string', format: 'binary' },
            description: 'Up to 5 images (JPG or PNG), max 10MB each.',
          },
        },
      },
      UpdateProductRequest: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          description: { type: 'string' },
          price: { type: 'number' },
          unit: { type: 'string' },
          quantityAvailable: { type: 'number' },
          minimumOrder: { type: 'number' },
          location: { $ref: '#/components/schemas/ProductLocation' },
          isActive: { type: 'boolean' },
        },
      },
      AddToCartRequest: {
        type: 'object',
        required: ['productId', 'quantity'],
        properties: {
          productId: { type: 'string', example: '60d0fe4f54e0d9001c23a4a1' },
          quantity: {
            type: 'integer',
            minimum: 1,
            description: 'Added to any existing quantity for this product.',
            example: 2,
          },
        },
      },
      UpdateCartRequest: {
        type: 'object',
        required: ['productId', 'quantity'],
        properties: {
          productId: { type: 'string', example: '60d0fe4f54e0d9001c23a4a1' },
          quantity: {
            type: 'integer',
            minimum: 0,
            description: 'Exact quantity to set. 0 removes the item.',
            example: 3,
          },
        },
      },
      AdjustCartQuantityRequest: {
        type: 'object',
        required: ['productId', 'delta'],
        properties: {
          productId: { type: 'string', example: '60d0fe4f54e0d9001c23a4a1' },
          delta: {
            type: 'integer',
            enum: [1, -1],
            description: 'Exactly 1 (increment) or -1 (decrement) — the stepper use case only.',
            example: 1,
          },
        },
      },
      CartProduct: {
        type: 'object',
        nullable: true,
        description: 'null if the referenced product no longer exists at all.',
        properties: {
          _id: { type: 'string' },
          name: { type: 'string', example: 'Fresh Tomatoes' },
          price: { type: 'number', example: 5000 },
          unit: { type: 'string', example: 'crate' },
          image: { type: 'string', format: 'uri', nullable: true },
          seller: {
            type: 'object',
            nullable: true,
            properties: { organizationName: { type: 'string', example: 'Acme Farms' } },
          },
        },
      },
      CartItem: {
        type: 'object',
        properties: {
          product: { $ref: '#/components/schemas/CartProduct' },
          quantity: { type: 'integer', example: 2 },
          unavailable: {
            type: 'boolean',
            description: 'true if the product is no longer active/approved (or was deleted).',
            example: false,
          },
          lineTotal: { type: 'number', description: '0 when unavailable.', example: 10000 },
        },
      },
      Cart: {
        type: 'object',
        properties: {
          items: { type: 'array', items: { $ref: '#/components/schemas/CartItem' } },
          subtotal: {
            type: 'number',
            description: 'Sum of lineTotal across available items only.',
            example: 10000,
          },
          totalItems: {
            type: 'integer',
            description: 'Sum of quantity across available items only.',
            example: 2,
          },
        },
      },
      CartSuccessResponse: {
        allOf: [
          { $ref: '#/components/schemas/SuccessResponse' },
          {
            type: 'object',
            properties: { data: { $ref: '#/components/schemas/Cart' } },
          },
        ],
      },
      DeliveryAddress: {
        type: 'object',
        properties: {
          _id: { type: 'string' },
          label: { type: 'string', example: 'Home' },
          street: { type: 'string', example: '12 Allen Avenue' },
          city: { type: 'string', example: 'Ikeja' },
          state: { type: 'string', enum: NIGERIAN_STATES, example: 'Lagos' },
          phone: { type: 'string', example: '+2348012345678' },
          isDefault: { type: 'boolean', example: true },
        },
      },
      AddressListResponse: {
        allOf: [
          { $ref: '#/components/schemas/SuccessResponse' },
          {
            type: 'object',
            properties: {
              data: { type: 'array', items: { $ref: '#/components/schemas/DeliveryAddress' } },
            },
          },
        ],
      },
      CreateAddressRequest: {
        type: 'object',
        required: ['label', 'street', 'city', 'state', 'phone'],
        properties: {
          label: { type: 'string', example: 'Home' },
          street: { type: 'string', example: '12 Allen Avenue' },
          city: { type: 'string', example: 'Ikeja' },
          state: { type: 'string', enum: NIGERIAN_STATES, example: 'Lagos' },
          phone: { type: 'string', example: '+2348012345678' },
        },
      },
      UpdateAddressRequest: {
        type: 'object',
        description:
          'All fields optional — only what is sent is changed. isDefault is not accepted here.',
        properties: {
          label: { type: 'string', example: 'Office' },
          street: { type: 'string', example: '5 Adeola Odeku Street' },
          city: { type: 'string', example: 'Victoria Island' },
          state: { type: 'string', enum: NIGERIAN_STATES, example: 'Lagos' },
          phone: { type: 'string', example: '+2348012345678' },
        },
      },
      CheckoutRequest: {
        type: 'object',
        required: ['addressId', 'deliveryMethod'],
        properties: {
          addressId: { type: 'string', example: '60d0fe4f54e0d9001c23a4a1' },
          deliveryMethod: {
            type: 'string',
            enum: Object.values(DeliveryMethod),
            example: 'delivery',
          },
        },
      },
      OrderSellerRef: {
        type: 'object',
        description:
          'items[].seller is always populated (Phase 17) — every Order belongs to exactly one seller (Phase 11\'s per-seller checkout split), so this is never a redundant top-level order.seller field, just the populated form of the existing reference.',
        properties: {
          _id: { type: 'string', example: '60d0fe4f54e0d9001c23a4b2' },
          organizationName: { type: 'string', example: 'Acme Farms' },
        },
      },
      OrderItem: {
        type: 'object',
        description:
          'productName/unitPrice are snapshotted at checkout time — opposite of Cart, which stays live.',
        properties: {
          product: { type: 'string', description: 'Not populated — raw Product id.' },
          seller: { $ref: '#/components/schemas/OrderSellerRef' },
          productName: { type: 'string', example: 'Fresh Tomatoes' },
          unitPrice: { type: 'number', example: 5000 },
          quantity: { type: 'integer', example: 2 },
          subtotal: { type: 'number', example: 10000 },
        },
      },
      OrderDeliveryAddress: {
        type: 'object',
        description: 'Snapshot of the saved address at checkout time, not a live reference.',
        properties: {
          label: { type: 'string', example: 'Home' },
          street: { type: 'string', example: '12 Allen Avenue' },
          city: { type: 'string', example: 'Ikeja' },
          state: { type: 'string', example: 'Lagos' },
          phone: { type: 'string', example: '+2348012345678' },
        },
      },
      Order: {
        type: 'object',
        description:
          'buyer and items[].seller are always populated (Phase 17), on every endpoint that returns an Order — one consistent shape, not a special admin-only version.',
        properties: {
          _id: { type: 'string' },
          orderNumber: { type: 'string', example: 'ORD-20260812-3F2A9C' },
          checkoutReference: { type: 'string', example: 'CHF-1755000000000-a1b2c3d4' },
          buyer: {
            type: 'object',
            properties: {
              _id: { type: 'string', example: '60d0fe4f54e0d9001c23a4a1' },
              firstName: { type: 'string', example: 'Jane', nullable: true },
              lastName: { type: 'string', example: 'Doe', nullable: true },
              email: { type: 'string', format: 'email', example: 'jane@example.com' },
            },
          },
          items: { type: 'array', items: { $ref: '#/components/schemas/OrderItem' } },
          deliveryAddress: { $ref: '#/components/schemas/OrderDeliveryAddress' },
          deliveryMethod: { type: 'string', enum: Object.values(DeliveryMethod) },
          subtotal: { type: 'number', example: 10000 },
          deliveryFee: { type: 'number', example: 1500 },
          total: { type: 'number', example: 11500 },
          paymentStatus: {
            type: 'string',
            enum: ['pending', 'completed', 'failed'],
            example: 'pending',
          },
          orderStatus: { type: 'string', enum: Object.values(OrderStatus), example: 'pending' },
          cancellationReason: {
            type: 'string',
            enum: Object.values(CancellationReason),
            nullable: true,
            description: 'Only present when orderStatus is cancelled.',
          },
          deliveredAt: { type: 'string', format: 'date-time', nullable: true },
          proofOfDeliveryImages: {
            type: 'array',
            items: {
              type: 'object',
              properties: { url: { type: 'string' }, publicId: { type: 'string' } },
            },
          },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      OrderSuccessResponse: {
        allOf: [
          { $ref: '#/components/schemas/SuccessResponse' },
          { type: 'object', properties: { data: { $ref: '#/components/schemas/Order' } } },
        ],
      },
      OrderListResponse: {
        allOf: [
          { $ref: '#/components/schemas/SuccessResponse' },
          {
            type: 'object',
            properties: {
              data: {
                type: 'object',
                properties: {
                  orders: { type: 'array', items: { $ref: '#/components/schemas/Order' } },
                  meta: { $ref: '#/components/schemas/PaginationMeta' },
                },
              },
            },
          },
        ],
      },
      CheckoutSuccessResponse: {
        allOf: [
          { $ref: '#/components/schemas/SuccessResponse' },
          {
            type: 'object',
            properties: {
              data: {
                type: 'object',
                properties: {
                  orders: { type: 'array', items: { $ref: '#/components/schemas/Order' } },
                  paymentUrl: {
                    type: 'string',
                    format: 'uri',
                    description: 'Redirect the buyer here to complete payment on Paystack.',
                  },
                  checkoutReference: { type: 'string' },
                },
              },
            },
          },
        ],
      },
      UpdateOrderStatusRequest: {
        type: 'object',
        required: ['status'],
        properties: {
          status: { type: 'string', enum: Object.values(OrderStatus), example: 'confirmed' },
        },
      },
      CampaignImage: {
        type: 'object',
        properties: {
          url: { type: 'string', format: 'uri' },
          publicId: { type: 'string' },
        },
      },
      CampaignFoodGoal: {
        type: 'object',
        properties: {
          description: { type: 'string', example: '500 bags of rice' },
          quantity: { type: 'number', example: 500 },
          unit: { type: 'string', example: 'bags' },
        },
      },
      CampaignLocation: {
        type: 'object',
        properties: {
          state: { type: 'string', example: 'Lagos' },
          lga: { type: 'string', example: 'Ikeja' },
        },
      },
      CampaignOrganization: {
        type: 'object',
        description: 'Badge-only org info shown to donors — never the full user record.',
        properties: {
          _id: { type: 'string' },
          organizationName: { type: 'string', example: 'Hope Foundation' },
          organizationType: { type: 'string', enum: Object.values(OrganizationType) },
        },
      },
      CampaignUpdate: {
        type: 'object',
        properties: {
          message: { type: 'string' },
          postedAt: { type: 'string', format: 'date-time' },
        },
      },
      CampaignDistributionRecord: {
        type: 'object',
        properties: {
          date: { type: 'string', format: 'date-time' },
          quantity: { type: 'number' },
          beneficiaries: { type: 'number' },
          location: { type: 'string' },
          media: { type: 'array', items: { $ref: '#/components/schemas/CampaignImage' } },
        },
      },
      Campaign: {
        type: 'object',
        properties: {
          _id: { type: 'string' },
          organization: { $ref: '#/components/schemas/CampaignOrganization' },
          title: { type: 'string', example: 'Emergency Flood Relief Food Drive' },
          description: { type: 'string' },
          urgencyLevel: { type: 'string', enum: Object.values(UrgencyLevel) },
          fundingGoal: { type: 'number', example: 100000 },
          currentFunding: { type: 'number', example: 25000 },
          donorCount: { type: 'integer', example: 5 },
          foodGoal: { $ref: '#/components/schemas/CampaignFoodGoal' },
          distributionPlan: { type: 'string' },
          location: { $ref: '#/components/schemas/CampaignLocation' },
          images: { type: 'array', items: { $ref: '#/components/schemas/CampaignImage' } },
          status: { type: 'string', enum: Object.values(CampaignStatus) },
          rejectionReason: { type: 'string' },
          startDate: { type: 'string', format: 'date-time' },
          endDate: { type: 'string', format: 'date-time' },
          campaignUpdates: {
            type: 'array',
            items: { $ref: '#/components/schemas/CampaignUpdate' },
          },
          distributionRecords: {
            type: 'array',
            items: { $ref: '#/components/schemas/CampaignDistributionRecord' },
          },
          percentage: {
            type: 'integer',
            description: 'Computed: min(100, round(currentFunding / fundingGoal * 100)).',
            example: 25,
          },
          daysLeft: { type: 'integer', description: 'Computed from endDate.', example: 12 },
          totalDonors: { type: 'integer', description: 'Alias of donorCount.', example: 5 },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      CampaignSuccessResponse: {
        allOf: [
          { $ref: '#/components/schemas/SuccessResponse' },
          { type: 'object', properties: { data: { $ref: '#/components/schemas/Campaign' } } },
        ],
      },
      CampaignListResponse: {
        allOf: [
          { $ref: '#/components/schemas/SuccessResponse' },
          {
            type: 'object',
            properties: {
              data: {
                type: 'object',
                properties: {
                  campaigns: { type: 'array', items: { $ref: '#/components/schemas/Campaign' } },
                  meta: { $ref: '#/components/schemas/PaginationMeta' },
                },
              },
            },
          },
        ],
      },
      AdminCampaignListResponse: {
        allOf: [
          { $ref: '#/components/schemas/SuccessResponse' },
          {
            type: 'object',
            properties: {
              data: {
                type: 'object',
                properties: {
                  campaigns: { type: 'array', items: { $ref: '#/components/schemas/Campaign' } },
                  meta: { $ref: '#/components/schemas/PaginationMeta' },
                },
              },
            },
          },
        ],
      },
      CreateCampaignRequest: {
        type: 'object',
        required: [
          'title',
          'description',
          'urgencyLevel',
          'fundingGoal',
          'foodGoalDescription',
          'foodGoalQuantity',
          'foodGoalUnit',
          'state',
          'lga',
          'startDate',
          'endDate',
        ],
        properties: {
          title: { type: 'string', minLength: 10, maxLength: 100 },
          description: { type: 'string', minLength: 50 },
          urgencyLevel: { type: 'string', enum: Object.values(UrgencyLevel) },
          fundingGoal: { type: 'number', example: 100000 },
          foodGoalDescription: { type: 'string', example: '500 bags of rice' },
          foodGoalQuantity: { type: 'number', example: 500 },
          foodGoalUnit: { type: 'string', example: 'bags' },
          distributionPlan: { type: 'string' },
          state: { type: 'string', example: 'Lagos' },
          lga: { type: 'string', example: 'Ikeja' },
          startDate: { type: 'string', format: 'date' },
          endDate: { type: 'string', format: 'date' },
          images: {
            type: 'array',
            items: { type: 'string', format: 'binary' },
            description: 'Up to 5 images (JPG or PNG), max 10MB each.',
          },
        },
      },
      UpdateCampaignRequest: {
        type: 'object',
        properties: {
          description: { type: 'string' },
          distributionPlan: { type: 'string' },
          urgencyLevel: { type: 'string', enum: Object.values(UrgencyLevel) },
          fundingGoal: {
            type: 'number',
            description: 'Rejected with 400 once currentFunding > 0.',
          },
        },
      },
      PostCampaignUpdateRequest: {
        type: 'object',
        required: ['message'],
        properties: { message: { type: 'string', example: 'We distributed the first batch today.' } },
      },
      AddDistributionRecordRequest: {
        type: 'object',
        required: ['date', 'quantity', 'beneficiaries', 'location'],
        properties: {
          date: { type: 'string', format: 'date' },
          quantity: { type: 'number', example: 100 },
          beneficiaries: { type: 'integer', example: 40 },
          location: { type: 'string', example: 'Ikeja Community Hall' },
          media: {
            type: 'array',
            items: { type: 'string', format: 'binary' },
            description: 'Up to 5 images (JPG or PNG), max 10MB each.',
          },
        },
      },
      DonateRequest: {
        type: 'object',
        required: ['amount'],
        properties: {
          amount: {
            type: 'number',
            description: 'In Naira. Rejected below DONATION_MINIMUM_KOBO (₦500).',
            example: 2500,
          },
        },
      },
      DonateSuccessResponse: {
        allOf: [
          { $ref: '#/components/schemas/SuccessResponse' },
          {
            type: 'object',
            properties: {
              data: {
                type: 'object',
                properties: {
                  paymentUrl: {
                    type: 'string',
                    format: 'uri',
                    description: 'Redirect the donor here to complete payment on Paystack.',
                  },
                  reference: { type: 'string', example: 'CHF-DON-1755000000000-a1b2c3d4' },
                },
              },
            },
          },
        ],
      },
      CampaignFundSummary: {
        type: 'object',
        description:
          'EXACTLY these 6 fields — no cash-suggestive field is ever added here. See BACKEND_RULES.md §20.',
        properties: {
          totalDonated: { type: 'number', example: 25000 },
          totalAllocatedToFood: {
            type: 'number',
            description: 'Stays 0 until the future procurement-conversion phase exists.',
            example: 0,
          },
          totalDelivered: { type: 'number', example: 0 },
          availableForProcurement: { type: 'number', example: 25000 },
          donorCount: { type: 'integer', example: 5 },
          mealsEquivalent: { type: 'integer', description: 'floor(totalDonated / 500).', example: 50 },
        },
      },
      CampaignFundSummaryResponse: {
        allOf: [
          { $ref: '#/components/schemas/SuccessResponse' },
          {
            type: 'object',
            properties: { data: { $ref: '#/components/schemas/CampaignFundSummary' } },
          },
        ],
      },
      SanitizedDonation: {
        type: 'object',
        description: 'Donor identity reduced to name only — no email/phone.',
        properties: {
          donorName: { type: 'string', example: 'Jane Doe' },
          amount: { type: 'number', example: 2500 },
          donatedAt: { type: 'string', format: 'date-time' },
        },
      },
      SanitizedDonationListResponse: {
        allOf: [
          { $ref: '#/components/schemas/SuccessResponse' },
          {
            type: 'object',
            properties: {
              data: {
                type: 'object',
                properties: {
                  donations: {
                    type: 'array',
                    items: { $ref: '#/components/schemas/SanitizedDonation' },
                  },
                  meta: { $ref: '#/components/schemas/PaginationMeta' },
                },
              },
            },
          },
        ],
      },
      ReviewCampaignRequest: {
        type: 'object',
        required: ['decision'],
        properties: {
          decision: { type: 'string', enum: ['approved', 'rejected'], example: 'approved' },
          rejectionReason: {
            type: 'string',
            description: 'Required when decision is rejected.',
            example: 'Missing distribution plan detail',
          },
        },
      },
      SupplyDashboardStats: {
        type: 'object',
        properties: {
          category: { type: 'string', enum: ['supply'] },
          totalProducts: {
            type: 'integer',
            description: 'Count of this org\'s currently-active product listings.',
            example: 12,
          },
          totalOrders: { type: 'integer', example: 34 },
          revenue: {
            type: 'number',
            description:
              'Sum of order.subtotal (NOT order.total) across paymentStatus: completed orders. Deliberately excludes deliveryFee.',
            example: 450000,
          },
        },
      },
      CampaignDashboardStats: {
        type: 'object',
        properties: {
          category: { type: 'string', enum: ['campaign'] },
          activeCampaigns: { type: 'integer', example: 2 },
          totalRaised: {
            type: 'number',
            description: 'Sum of Campaign.currentFunding across this org\'s campaigns.',
            example: 125000,
          },
          familiesReached: {
            type: 'integer',
            description: 'Sum of beneficiaries across every distributionRecords entry on this org\'s campaigns.',
            example: 340,
          },
        },
      },
      DashboardStatsResponse: {
        allOf: [
          { $ref: '#/components/schemas/SuccessResponse' },
          {
            type: 'object',
            properties: {
              data: {
                oneOf: [
                  { $ref: '#/components/schemas/SupplyDashboardStats' },
                  { $ref: '#/components/schemas/CampaignDashboardStats' },
                ],
                discriminator: { propertyName: 'category' },
              },
            },
          },
        ],
      },
      DonationCampaignRef: {
        type: 'object',
        description: 'relatedCampaign populated one level deep, organization one level further.',
        properties: {
          _id: { type: 'string' },
          title: { type: 'string' },
          organization: {
            type: 'object',
            properties: {
              _id: { type: 'string' },
              organizationName: { type: 'string', example: 'Hope Foundation' },
            },
          },
        },
      },
      DonationTransaction: {
        type: 'object',
        properties: {
          _id: { type: 'string' },
          transactionReference: { type: 'string', example: 'CHF-DON-1755000000000-a1b2c3d4' },
          amount: { type: 'number', example: 2500 },
          transactionType: { type: 'string', enum: ['campaign_donation'] },
          status: { type: 'string', enum: Object.values(PaymentStatus) },
          relatedCampaign: { $ref: '#/components/schemas/DonationCampaignRef' },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      ExpireStaleOrdersResponse: {
        allOf: [
          { $ref: '#/components/schemas/SuccessResponse' },
          {
            type: 'object',
            properties: {
              data: {
                type: 'object',
                properties: {
                  expiredCount: { type: 'integer', example: 2 },
                },
              },
            },
          },
        ],
      },
      AdminUserListResponse: {
        allOf: [
          { $ref: '#/components/schemas/SuccessResponse' },
          {
            type: 'object',
            properties: {
              data: {
                type: 'object',
                properties: {
                  users: { type: 'array', items: { $ref: '#/components/schemas/User' } },
                  meta: { $ref: '#/components/schemas/PaginationMeta' },
                },
              },
            },
          },
        ],
      },
      AdminOrderListResponse: {
        allOf: [
          { $ref: '#/components/schemas/SuccessResponse' },
          {
            type: 'object',
            properties: {
              data: {
                type: 'object',
                properties: {
                  orders: { type: 'array', items: { $ref: '#/components/schemas/Order' } },
                  meta: { $ref: '#/components/schemas/PaginationMeta' },
                },
              },
            },
          },
        ],
      },
      AdminProductListResponse: {
        allOf: [
          { $ref: '#/components/schemas/SuccessResponse' },
          {
            type: 'object',
            properties: {
              data: {
                type: 'object',
                properties: {
                  products: { type: 'array', items: { $ref: '#/components/schemas/Product' } },
                  meta: { $ref: '#/components/schemas/PaginationMeta' },
                },
              },
            },
          },
        ],
      },
      AdminDashboardResponse: {
        allOf: [
          { $ref: '#/components/schemas/SuccessResponse' },
          {
            type: 'object',
            properties: {
              data: {
                type: 'object',
                properties: {
                  users: {
                    type: 'object',
                    properties: {
                      total: { type: 'integer', example: 214 },
                      byRole: {
                        type: 'object',
                        description: 'Keyed by UserRole — only roles with at least one user appear.',
                        example: { user: 180, organization: 30, admin: 3, fso: 1 },
                      },
                    },
                  },
                  orders: {
                    type: 'object',
                    properties: {
                      total: { type: 'integer', example: 512, description: 'Count of ALL orders, any status.' },
                      revenue: {
                        type: 'number',
                        example: 4250000,
                        description:
                          'Sum of subtotal (never total/deliveryFee) across paymentStatus: completed orders only — same definition as GET /v1/organizations/dashboard.',
                      },
                    },
                  },
                  campaigns: {
                    type: 'object',
                    properties: {
                      active: { type: 'integer', example: 12 },
                      totalDonated: {
                        type: 'number',
                        example: 980000,
                        description: 'Sum of Campaign.currentFunding across every campaign on the platform.',
                      },
                    },
                  },
                  pendingVerifications: {
                    type: 'integer',
                    example: 7,
                    description: 'Organizations with verificationStatus in pending or under_review.',
                  },
                  recentActivity: {
                    type: 'array',
                    description:
                      'Last 10 orders + campaign submissions combined, sorted by createdAt descending.',
                    items: {
                      type: 'object',
                      properties: {
                        type: { type: 'string', enum: ['order', 'campaign'] },
                        id: { type: 'string' },
                        summary: { type: 'string', example: 'Order ORD-20260814-3F2A9C — ₦11,500 (pending)' },
                        createdAt: { type: 'string', format: 'date-time' },
                      },
                    },
                  },
                },
              },
            },
          },
        ],
      },
      DonationHistoryResponse: {
        allOf: [
          { $ref: '#/components/schemas/SuccessResponse' },
          {
            type: 'object',
            properties: {
              data: {
                type: 'object',
                properties: {
                  donations: {
                    type: 'array',
                    items: { $ref: '#/components/schemas/DonationTransaction' },
                  },
                  meta: { $ref: '#/components/schemas/PaginationMeta' },
                },
              },
            },
          },
        ],
      },
    },
  },
};
