export const isDevKycBypassEnabled =
  process.env.NODE_ENV !== 'production' &&
  process.env.NEXT_PUBLIC_DEV_KYC_BYPASS === 'true';
