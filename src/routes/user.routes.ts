import { Router } from 'express';

import { userController } from '../controllers/user.controller';
import { protect } from '../middleware/protect.middleware';
import { validateRequest } from '../middleware/validation.middleware';
import {
  addressIdParamValidation,
  createAddressValidation,
  listDonationsValidation,
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

// Any authenticated user can have donated (including an org), so no role restriction beyond
// the router-level protect above.
router.get(
  '/donations',
  listDonationsValidation,
  validateRequest,
  asyncHandler(userController.listDonations)
);

export default router;
