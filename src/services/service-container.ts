import { BrevoEmailAdapter } from '../integrations/brevo/brevo.email.adapter';
import { RedisOtpStore } from '../integrations/redis/redis.otp.store';
import { UserRepository } from '../repositories/user.repository';

import { OnboardingService } from './onboarding.service';
import { OtpService } from './otp.service';
import { RedisRefreshTokenStore } from '../integrations/redis/redis.refresh-token.store';
import { RedisTokenBlacklistStore } from '../integrations/redis/redis.token-blacklist.store';
import { AuthService } from './auth.service';
import { PasswordService } from './password.service';
import { CloudinaryDocumentStorage } from '../integrations/cloudinary/cloudinary.document-storage';
import { VerificationDocumentRepository } from '../repositories/verification-document.repository';
import { DocumentService } from './document.service';
import { AdminService } from './admin.service';
import { ProductRepository } from '../repositories/product.repository';
import { ProductService } from './product.service';
import { CartRepository } from '../repositories/cart.repository';
import { CartService } from './cart.service';
import { UserService } from './user.service';
import { PaystackGateway } from '../integrations/paystack/paystack.gateway';
import { TransactionRepository } from '../repositories/transaction.repository';
import { WebhookLogRepository } from '../repositories/webhook-log.repository';
import { OrderRepository } from '../repositories/order.repository';
import { PaymentService } from './payment.service';
import { OrderService } from './order.service';
import { RedisLock } from '../integrations/redis/redis.lock';
import { CampaignRepository } from '../repositories/campaign.repository';
import { CampaignFundRepository } from '../repositories/campaign-fund.repository';
import { CampaignFundService } from './campaign-fund.service';
import { CampaignService } from './campaign.service';

export const refreshTokenStore = new RedisRefreshTokenStore();
export const tokenBlacklistStore = new RedisTokenBlacklistStore();

export const userRepository = new UserRepository();
export const authService = new AuthService(userRepository, refreshTokenStore, tokenBlacklistStore);

export const otpStore = new RedisOtpStore();
export const emailProvider = new BrevoEmailAdapter();

export const otpService = new OtpService(otpStore, emailProvider, userRepository);
export const documentStorage = new CloudinaryDocumentStorage();
export const verificationDocumentRepository = new VerificationDocumentRepository();

export const campaignRepository = new CampaignRepository();
export const campaignFundRepository = new CampaignFundRepository();
export const campaignFundService = new CampaignFundService(
  campaignFundRepository,
  campaignRepository
);

export const adminService = new AdminService(
  userRepository,
  verificationDocumentRepository,
  emailProvider,
  campaignRepository
);
export const documentService = new DocumentService(
  userRepository,
  verificationDocumentRepository,
  documentStorage
);
export const onboardingService = new OnboardingService(userRepository);
export const passwordService = new PasswordService(
  userRepository,
  otpService,
  refreshTokenStore,
  authService
);

export const productRepository = new ProductRepository();
export const productService = new ProductService(
  productRepository,
  userRepository,
  documentStorage
);

export const cartRepository = new CartRepository();
export const cartService = new CartService(cartRepository, productRepository);

export const userService = new UserService(userRepository);

export const paymentGateway = new PaystackGateway();
export const transactionRepository = new TransactionRepository();
export const webhookLogRepository = new WebhookLogRepository();
export const orderRepository = new OrderRepository();

export const paymentService = new PaymentService(
  paymentGateway,
  transactionRepository,
  orderRepository,
  cartRepository,
  webhookLogRepository,
  userRepository,
  emailProvider,
  campaignRepository,
  campaignFundService
);

export const checkoutLock = new RedisLock();

export const orderService = new OrderService(
  orderRepository,
  cartRepository,
  productRepository,
  userRepository,
  paymentService,
  checkoutLock
);

export const campaignService = new CampaignService(
  campaignRepository,
  campaignFundService,
  userRepository,
  documentStorage,
  paymentService
);
