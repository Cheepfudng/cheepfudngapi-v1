import { Router } from 'express';

import { userController } from '../controllers/user.controller';
import { protect } from '../middleware/protect.middleware';
import { validateRequest } from '../middleware/validation.middleware';
import {
  addressIdParamValidation,
  createAddressValidation,
  updateAddressValidation,
} from '../validators/user.validator';
import { asyncHandler } from '../utils/async-handler';

const router = Router();

router.use(asyncHandler(protect));

router.get('/addresses', asyncHandler(userController.listAddresses));
router.post(
  '/addresses',
  createAddressValidation,
  validateRequest,
  asyncHandler(userController.addAddress)
);
router.put(
  '/addresses/:addressId',
  updateAddressValidation,
  validateRequest,
  asyncHandler(userController.updateAddress)
);
router.delete(
  '/addresses/:addressId',
  addressIdParamValidation,
  validateRequest,
  asyncHandler(userController.removeAddress)
);
router.patch(
  '/addresses/:addressId/default',
  addressIdParamValidation,
  validateRequest,
  asyncHandler(userController.setDefaultAddress)
);

export default router;
