// export const openApiDocument = {
//   openapi: '3.0.3',
//   info: {
//     title: 'Cheepfud API',
//     version: '1.0.0',
//     description: 'Cheepfud Backend API',
//   },
//   servers: [
//     {
//       url: 'http://localhost:5000',
//     },
//   ],
//   paths: {
//     '/v1/otp/request': {
//       post: {
//         tags: ['Onboarding'],
//         summary: 'Request OTP',
//         requestBody: {
//           required: true,
//           content: {
//             'application/json': {
//               schema: {
//                 type: 'object',
//                 required: ['email'],
//                 properties: {
//                   email: {
//                     type: 'string',
//                     format: 'email',
//                   },
//                 },
//               },
//             },
//           },
//         },
//         responses: {
//           200: {
//             description: 'OTP sent successfully',
//           },
//         },
//       },
//     },

//     '/v1/otp/verify': {
//       post: {
//         tags: ['Onboarding'],
//         summary: 'Verify OTP',
//         requestBody: {
//           required: true,
//           content: {
//             'application/json': {
//               schema: {
//                 type: 'object',
//                 required: ['email', 'code'],
//                 properties: {
//                   email: {
//                     type: 'string',
//                     format: 'email',
//                   },
//                   code: {
//                     type: 'string',
//                     example: '123456',
//                   },
//                 },
//               },
//             },
//           },
//         },
//         responses: {
//           200: {
//             description: 'OTP verified successfully',
//           },
//         },
//       },
//     },

//     '/v1/onboarding/account-type': {
//       post: {
//         tags: ['Onboarding'],
//         summary: 'Select account type',
//         requestBody: {
//           required: true,
//           content: {
//             'application/json': {
//               schema: {
//                 type: 'object',
//                 required: ['email', 'accountType'],
//                 properties: {
//                   email: {
//                     type: 'string',
//                     format: 'email',
//                   },
//                   accountType: {
//                     type: 'string',
//                     enum: ['individual', 'organization'],
//                   },
//                 },
//               },
//             },
//           },
//         },
//         responses: {
//           200: {
//             description: 'Account type selected successfully',
//           },
//         },
//       },
//     },

//     '/v1/onboarding/individual': {
//       post: {
//         tags: ['Onboarding'],
//         summary: 'Complete individual onboarding',
//         requestBody: {
//           required: true,
//           content: {
//             'application/json': {
//               schema: {
//                 type: 'object',
//                 required: ['email', 'firstName', 'lastName', 'phoneNumber'],
//                 properties: {
//                   email: {
//                     type: 'string',
//                     format: 'email',
//                   },
//                   firstName: {
//                     type: 'string',
//                   },
//                   lastName: {
//                     type: 'string',
//                   },
//                   phoneNumber: {
//                     type: 'string',
//                   },
//                 },
//               },
//             },
//           },
//         },
//         responses: {
//           200: {
//             description: 'Individual onboarding completed successfully',
//             content: {
//               'application/json': {
//                 schema: {
//                   type: 'object',
//                   properties: {
//                     status: {
//                       type: 'boolean',
//                       example: true,
//                     },
//                     message: {
//                       type: 'string',
//                       example: 'Individual onboarding completed successfully',
//                     },
//                     data: {
//                       type: 'object',
//                     },
//                   },
//                 },
//               },
//             },
//           },
//         },
//       },
//     },

//     '/v1/onboarding/organization': {
//       post: {
//         tags: ['Onboarding'],
//         summary: 'Complete organization onboarding',
//         requestBody: {
//           required: true,
//           content: {
//             'application/json': {
//               schema: {
//                 type: 'object',
//                 required: ['email', 'organizationName', 'organizationType', 'phoneNumber'],
//                 properties: {
//                   email: {
//                     type: 'string',
//                     format: 'email',
//                   },
//                   organizationName: {
//                     type: 'string',
//                   },
//                   organizationType: {
//                     type: 'string',
//                   },
//                   phoneNumber: {
//                     type: 'string',
//                   },
//                 },
//               },
//             },
//           },
//         },
//         responses: {
//           200: {
//             description: 'Organization onboarding completed successfully',
//             content: {
//               'application/json': {
//                 schema: {
//                   type: 'object',
//                   properties: {
//                     status: {
//                       type: 'boolean',
//                       example: true,
//                     },
//                     message: {
//                       type: 'string',
//                       example: 'Organization onboarding completed successfully',
//                     },
//                     data: {
//                       type: 'object',
//                     },
//                   },
//                 },
//               },
//             },
//           },
//         },
//       },
//     },
//   },
// };

// import {
//   AccountType,
//   ErrorCode,
//   OnboardingStatus,
//   UserRole,
//   VerificationStatus,
// } from './types/enums';

import { ErrorCode } from '../errors';
import { AccountType, OnboardingStatus, UserRole, VerificationStatus } from '../types';

export const openApiDocument = {
  openapi: '3.0.3',
  info: {
    title: 'Cheepfud API',
    version: '1.0.0',
    description: 'Cheepfud Backend API',
  },
  servers: [
    {
      url: 'http://localhost:5000/v1', // Base path for API endpoints
      description: 'Local Development Server',
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
        description: 'Verifies the provided OTP for the given email address.',
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
          'Allows a verified user to select their account type (individual or organization).',
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
                  AccountTypeSelected: {
                    value: {
                      status: true,
                      message: 'Account type selected successfully',
                      data: {
                        _id: '60d0fe4f54e0d9001c23a4a1',
                        email: 'test@example.com',
                        accountType: AccountType.INDIVIDUAL,
                        role: UserRole.USER,
                        verificationStatus: VerificationStatus.VERIFIED,
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
        description: 'Completes the onboarding process for an individual user.',
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
        description: 'Completes the onboarding process for an organization user.',
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
                    organizationName: 'Acme Corp',
                    organizationType: 'Technology',
                    phoneNumber: '+1987654321',
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
                        organizationName: 'Acme Corp',
                        organizationType: 'Technology',
                        phoneNumber: '+1987654321',
                        accountType: AccountType.ORGANIZATION,
                        role: UserRole.ADMIN,
                        verificationStatus: VerificationStatus.VERIFIED,
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
          status: {
            type: 'boolean',
            example: true,
          },
          message: {
            type: 'string',
            example: 'Operation successful',
          },
          data: {
            nullable: true,
            // Can be any type, hence 'object' or specific schema reference
            // For now, it's generic, but specific responses will override this.
          },
        },
        required: ['status', 'message', 'data'],
      },
      ErrorResponse: {
        type: 'object',
        properties: {
          status: {
            type: 'boolean',
            example: false,
          },
          message: {
            type: 'string',
            example: 'An error occurred',
          },
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
          organizationName: { type: 'string', example: 'Acme Corp', nullable: true },
          organizationType: { type: 'string', example: 'Technology', nullable: true },
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
              data: {
                $ref: '#/components/schemas/User',
              },
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
        required: ['email', 'firstName', 'lastName', 'phoneNumber'],
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
        },
      },
      OrganizationOnboardingRequest: {
        type: 'object',
        required: ['email', 'organizationName', 'organizationType', 'phoneNumber'],
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
            example: 'Acme Corp',
          },
          organizationType: {
            type: 'string',
            description: 'Type of the organization (e.g., Technology, Retail).',
            example: 'Technology',
          },
          phoneNumber: {
            type: 'string',
            pattern: '^\\+?[1-9]\\d{7,14}$',
            description: 'Organization contact phone number.',
            example: '+1987654321',
          },
        },
      },
    },
  },
};
