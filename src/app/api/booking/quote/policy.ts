import {
  Address,
  Hex,
  isAddress,
  keccak256,
  toBytes,
} from 'viem';

export type QuoteMode = 'auto' | 'real' | 'mock';
export type ResolvedQuoteMode = 'real' | 'mock';

export const QUOTE_DOMAIN_NAME = 'TimeTokenAIzerBooking';
export const QUOTE_DOMAIN_VERSION = '1';
export const QUOTE_SIGNER_ROLE = keccak256(toBytes('QUOTE_SIGNER_ROLE'));
export const MOCK_SIGNATURE = `0x${'00'.repeat(65)}` as Hex;

export class BookingQuoteConfigError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly status = 500
  ) {
    super(message);
    this.name = 'BookingQuoteConfigError';
  }
}

export const normalizeQuoteMode = (value: unknown): QuoteMode => {
  if (value === 'real' || value === 'mock' || value === 'auto') {
    return value;
  }
  return 'auto';
};

export const resolveQuoteMode = ({
  envMode,
  requestedMode,
  nodeEnv,
}: {
  envMode: unknown;
  requestedMode: unknown;
  nodeEnv?: string;
}): ResolvedQuoteMode => {
  const normalizedEnvMode = normalizeQuoteMode(envMode);
  const normalizedRequestedMode = normalizeQuoteMode(requestedMode);

  if (normalizedRequestedMode === 'mock' && normalizedEnvMode !== 'mock') {
    throw new BookingQuoteConfigError(
      'Mock booking quote mode is disabled on this server.',
      'MOCK_MODE_DISABLED',
      403
    );
  }

  if (normalizedEnvMode === 'mock') {
    if (nodeEnv === 'production') {
      throw new BookingQuoteConfigError(
        'Mock booking quote mode is not allowed in production.',
        'MOCK_MODE_PRODUCTION_DISABLED',
        500
      );
    }
    return 'mock';
  }

  return 'real';
};

export const requireQuoteSignerPrivateKey = (value: string | undefined): Hex => {
  if (!value) {
    throw new BookingQuoteConfigError(
      'QUOTE_SIGNER_PRIVATE_KEY is required for real booking quote mode.',
      'QUOTE_SIGNER_PRIVATE_KEY_MISSING',
      500
    );
  }

  const normalized = value.startsWith('0x') ? value : `0x${value}`;
  if (!/^0x[0-9a-fA-F]{64}$/.test(normalized)) {
    throw new BookingQuoteConfigError(
      'QUOTE_SIGNER_PRIVATE_KEY must be a 32-byte hex private key.',
      'QUOTE_SIGNER_PRIVATE_KEY_INVALID',
      500
    );
  }

  return normalized as Hex;
};

export const parseExpectedQuoteSignerAddress = (value: string | undefined): Address | null => {
  if (!value) return null;
  if (!isAddress(value)) {
    throw new BookingQuoteConfigError(
      'QUOTE_SIGNER_ADDRESS must be a valid EVM address when configured.',
      'QUOTE_SIGNER_ADDRESS_INVALID',
      500
    );
  }
  return value as Address;
};

export const assertExpectedQuoteSignerAddress = (
  derivedSigner: Address,
  expectedSigner: Address | null
) => {
  if (!expectedSigner) return;
  if (derivedSigner.toLowerCase() !== expectedSigner.toLowerCase()) {
    throw new BookingQuoteConfigError(
      'QUOTE_SIGNER_ADDRESS does not match QUOTE_SIGNER_PRIVATE_KEY.',
      'QUOTE_SIGNER_ADDRESS_MISMATCH',
      500
    );
  }
};

export const assertQuoteSignerRole = ({
  hasRole,
  signerAddress,
  bookingManagerAddress,
}: {
  hasRole: boolean;
  signerAddress: Address;
  bookingManagerAddress: Address;
}) => {
  if (hasRole) return;
  throw new BookingQuoteConfigError(
    `Configured signer ${signerAddress} does not have QUOTE_SIGNER_ROLE on ${bookingManagerAddress}.`,
    'QUOTE_SIGNER_ROLE_MISSING',
    500
  );
};

export const providerChecksEnabled = (value: string | undefined): boolean => {
  if (!value) return true;
  return !['0', 'false', 'no', 'off'].includes(value.toLowerCase());
};

export const shouldStrictlyValidateProvider = (
  resolvedMode: ResolvedQuoteMode,
  strictProviderCheck: string | undefined
): boolean => {
  if (resolvedMode === 'real') return true;
  return providerChecksEnabled(strictProviderCheck);
};

export const quoteTtlSeconds = (value: string | undefined): bigint => {
  const parsed = Number.parseInt(value ?? '600', 10);
  if (!Number.isFinite(parsed) || parsed < 30) {
    return BigInt(600);
  }
  return BigInt(parsed);
};
