import crypto from 'crypto';

export const generateOtp = (length: number): string => {
  const min = 10 ** (length - 1);
  const max = 10 ** length;

  return crypto.randomInt(min, max).toString().padStart(length, '0');
};
