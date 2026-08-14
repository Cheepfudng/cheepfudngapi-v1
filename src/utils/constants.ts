export const API_CONFIG = {
  VERSION: 'v1',
  RATE_LIMIT: { WINDOW_MS: 900000, MAX_REQUESTS: 100 },
};

export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
};

export const MESSAGES = {
  SUCCESS: {
    REGISTRATION: 'Registration successful',
    LOGIN: 'Login successful',
  },
  ERROR: {
    UNAUTHORIZED: 'Authentication required',
    NOT_FOUND: 'Resource not found',
  },
};

// All 36 Nigerian states + FCT. Delivery address `state` is validated against this list
// rather than accepted as free text.
export const NIGERIAN_STATES: string[] = [
  'Abia',
  'Adamawa',
  'Akwa Ibom',
  'Anambra',
  'Bauchi',
  'Bayelsa',
  'Benue',
  'Borno',
  'Cross River',
  'Delta',
  'Ebonyi',
  'Edo',
  'Ekiti',
  'Enugu',
  'Gombe',
  'Imo',
  'Jigawa',
  'Kaduna',
  'Kano',
  'Katsina',
  'Kebbi',
  'Kogi',
  'Kwara',
  'Lagos',
  'Nasarawa',
  'Niger',
  'Ogun',
  'Ondo',
  'Osun',
  'Oyo',
  'Plateau',
  'Rivers',
  'Sokoto',
  'Taraba',
  'Yobe',
  'Zamfara',
  'FCT',
];

// Flat delivery fee in Naira, applied when Order.deliveryMethod === 'delivery'. 0 for pickup.
export const DELIVERY_FEE_NGN = 1500;

// ₦500 minimum campaign donation, in kobo (Paystack's unit) — enforced before ever calling
// the gateway, not just as a UI hint.
export const DONATION_MINIMUM_KOBO = 50000;

// Naira cost of one "meal unit" for the donor-facing impact message (`amount / 500`,
// rounded down) — shared by CampaignFundService's summary and PaymentService's donation
// confirmation email so the two never drift apart.
export const MEAL_COST_NGN = 500;

export default {
  API_CONFIG,
  PAGINATION,
  MESSAGES,
  NIGERIAN_STATES,
  DELIVERY_FEE_NGN,
  DONATION_MINIMUM_KOBO,
  MEAL_COST_NGN,
};
