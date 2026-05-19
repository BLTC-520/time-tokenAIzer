import { randomBytes } from 'crypto';
import { NextResponse } from 'next/server';
import {
  Address,
  Hex,
  createPublicClient,
  encodeAbiParameters,
  http,
  isAddress,
  keccak256,
  toBytes,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { getTimeMarketContracts, RPC_URLS } from '../../../shared/constants';

export const runtime = 'nodejs';

type QuoteMode = 'auto' | 'real' | 'mock';

const QUOTE_DOMAIN_NAME = 'TimeTokenAIzerBooking';
const QUOTE_DOMAIN_VERSION = '1';
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
const QUOTE_SIGNER_ROLE = keccak256(toBytes('QUOTE_SIGNER_ROLE'));
const MOCK_SIGNATURE = `0x${'00'.repeat(65)}` as Hex;

const bookingManagerReadAbi = [
  {
    type: 'function',
    name: 'providers',
    stateMutability: 'view',
    inputs: [{ name: 'providerId', type: 'uint256' }],
    outputs: [
      { name: 'owner', type: 'address' },
      { name: 'availableHoursWad', type: 'uint256' },
      { name: 'paused', type: 'bool' },
    ],
  },
  {
    type: 'function',
    name: 'slotTaken',
    stateMutability: 'view',
    inputs: [
      { name: 'providerId', type: 'uint256' },
      { name: 'slotId', type: 'uint256' },
    ],
    outputs: [{ name: 'taken', type: 'bool' }],
  },
  {
    type: 'function',
    name: 'hasRole',
    stateMutability: 'view',
    inputs: [
      { name: 'role', type: 'bytes32' },
      { name: 'account', type: 'address' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
] as const;

const bookingQuoteTypes = {
  BookingQuote: [
    { name: 'quoteId', type: 'bytes32' },
    { name: 'buyer', type: 'address' },
    { name: 'providerId', type: 'uint256' },
    { name: 'hoursWad', type: 'uint256' },
    { name: 'slotId', type: 'uint256' },
    { name: 'expiresAt', type: 'uint256' },
    { name: 'nonce', type: 'uint256' },
  ],
} as const;

const parseUnsignedBigInt = (value: unknown, field: string): bigint => {
  if (typeof value === 'number' && Number.isSafeInteger(value) && value >= 0) {
    return BigInt(value);
  }
  if (typeof value === 'string' && /^\d+$/.test(value)) {
    return BigInt(value);
  }

  throw new Error(`Field "${field}" must be an unsigned integer string.`);
};

const normalizeQuoteMode = (value: unknown): QuoteMode => {
  if (value === 'real' || value === 'mock' || value === 'auto') {
    return value;
  }
  return 'auto';
};

const normalizePrivateKey = (value: string | undefined): Hex | null => {
  if (!value) return null;
  const normalized = value.startsWith('0x') ? value : `0x${value}`;
  if (!/^0x[0-9a-fA-F]{64}$/.test(normalized)) return null;
  return normalized as Hex;
};

const providerChecksEnabled = (): boolean => {
  const raw = process.env.BOOKING_QUOTE_STRICT_PROVIDER_CHECK;
  if (!raw) return true;
  return !['0', 'false', 'no', 'off'].includes(raw.toLowerCase());
};

const quoteTtlSeconds = (): bigint => {
  const parsed = Number.parseInt(process.env.BOOKING_QUOTE_TTL_SECONDS ?? '600', 10);
  if (!Number.isFinite(parsed) || parsed < 30) {
    return BigInt(600);
  }
  return BigInt(parsed);
};

const buildQuoteId = (
  buyer: Address,
  providerId: bigint,
  hoursWad: bigint,
  slotId: bigint,
  expiresAt: bigint,
  nonce: bigint,
  bookingManager: Address,
  chainId: number
): Hex => {
  return keccak256(
    encodeAbiParameters(
      [
        { type: 'address' },
        { type: 'uint256' },
        { type: 'uint256' },
        { type: 'uint256' },
        { type: 'uint256' },
        { type: 'uint256' },
        { type: 'address' },
        { type: 'uint256' },
      ],
      [
        buyer,
        providerId,
        hoursWad,
        slotId,
        expiresAt,
        nonce,
        bookingManager,
        BigInt(chainId),
      ]
    )
  );
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const chainIdNumber = Number(body.chainId);
    if (!Number.isInteger(chainIdNumber) || chainIdNumber <= 0) {
      return NextResponse.json({ error: 'Field "chainId" must be a positive integer.' }, { status: 400 });
    }

    const contracts = getTimeMarketContracts(chainIdNumber);
    if (!contracts || contracts.bookingManager === ZERO_ADDRESS) {
      return NextResponse.json(
        { error: `BookingManager is not configured for chain ${chainIdNumber}.` },
        { status: 400 }
      );
    }

    const buyerRaw = body.buyer;
    if (typeof buyerRaw !== 'string' || !isAddress(buyerRaw)) {
      return NextResponse.json({ error: 'Field "buyer" must be a valid address.' }, { status: 400 });
    }

    const buyer = buyerRaw as Address;
    const providerId = parseUnsignedBigInt(body.providerId, 'providerId');
    const hoursWad = parseUnsignedBigInt(body.hoursWad, 'hoursWad');
    const slotId = parseUnsignedBigInt(body.slotId, 'slotId');
    if (hoursWad === BigInt(0)) {
      return NextResponse.json({ error: 'Field "hoursWad" must be greater than 0.' }, { status: 400 });
    }

    const envMode = normalizeQuoteMode(process.env.BOOKING_QUOTE_MODE);
    const requestedMode = normalizeQuoteMode(body.quoteMode);
    const privateKey = normalizePrivateKey(process.env.QUOTE_SIGNER_PRIVATE_KEY);
    const resolvedMode: 'real' | 'mock' = (() => {
      if (requestedMode === 'real') return 'real';
      if (requestedMode === 'mock') return 'mock';
      if (envMode === 'real') return 'real';
      if (envMode === 'mock') return 'mock';
      return privateKey ? 'real' : 'mock';
    })();

    const bookingManagerAddress = contracts.bookingManager as Address;
    const warnings: string[] = [];
    const strictProviderCheck = providerChecksEnabled() && resolvedMode === 'real';
    const rpcUrl = RPC_URLS[chainIdNumber as keyof typeof RPC_URLS];
    if (!rpcUrl) {
      return NextResponse.json(
        { error: `RPC URL is not configured for chain ${chainIdNumber}.` },
        { status: 500 }
      );
    }

    const publicClient = createPublicClient({
      transport: http(rpcUrl),
    });

    try {
      const [owner, availableHoursWad, paused] = await publicClient.readContract({
        address: bookingManagerAddress,
        abi: bookingManagerReadAbi,
        functionName: 'providers',
        args: [providerId],
      });

      if (owner.toLowerCase() === ZERO_ADDRESS) {
        return NextResponse.json(
          { error: `Provider ${providerId.toString()} is not registered on BookingManager.` },
          { status: 409 }
        );
      }
      if (paused) {
        return NextResponse.json(
          { error: `Provider ${providerId.toString()} is paused.` },
          { status: 409 }
        );
      }
      if (availableHoursWad < hoursWad) {
        return NextResponse.json(
          {
            error:
              `Provider inventory is insufficient. Requested ${hoursWad.toString()} but available ` +
              `${availableHoursWad.toString()}.`,
          },
          { status: 409 }
        );
      }

      const taken = await publicClient.readContract({
        address: bookingManagerAddress,
        abi: bookingManagerReadAbi,
        functionName: 'slotTaken',
        args: [providerId, slotId],
      });
      if (taken) {
        return NextResponse.json(
          { error: `Slot ${slotId.toString()} is already taken for provider ${providerId.toString()}.` },
          { status: 409 }
        );
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (strictProviderCheck) {
        return NextResponse.json(
          { error: `Provider validation failed against BookingManager: ${message}` },
          { status: 502 }
        );
      }
      warnings.push(`Provider validation skipped: ${message}`);
    }

    const nowSeconds = BigInt(Math.floor(Date.now() / 1000));
    const expiresAt = nowSeconds + quoteTtlSeconds();
    const nonce =
      (BigInt(Date.now()) << BigInt(64)) | BigInt(`0x${randomBytes(8).toString('hex')}`);
    const quoteId = buildQuoteId(
      buyer,
      providerId,
      hoursWad,
      slotId,
      expiresAt,
      nonce,
      bookingManagerAddress,
      chainIdNumber
    );

    let signature: Hex = MOCK_SIGNATURE;
    let signerAddress: Address | null = null;

    if (resolvedMode === 'real') {
      if (!privateKey) {
        return NextResponse.json(
          { error: 'QUOTE_SIGNER_PRIVATE_KEY is required for real quote mode.' },
          { status: 500 }
        );
      }

      const signer = privateKeyToAccount(privateKey);
      signerAddress = signer.address;

      const hasSignerRole = await publicClient.readContract({
        address: bookingManagerAddress,
        abi: bookingManagerReadAbi,
        functionName: 'hasRole',
        args: [QUOTE_SIGNER_ROLE, signer.address],
      });
      if (!hasSignerRole) {
        return NextResponse.json(
          {
            error:
              `Configured signer ${signer.address} does not have QUOTE_SIGNER_ROLE on ` +
              `${bookingManagerAddress}.`,
          },
          { status: 500 }
        );
      }

      signature = await signer.signTypedData({
        domain: {
          name: QUOTE_DOMAIN_NAME,
          version: QUOTE_DOMAIN_VERSION,
          chainId: chainIdNumber,
          verifyingContract: bookingManagerAddress,
        },
        primaryType: 'BookingQuote',
        types: bookingQuoteTypes,
        message: {
          quoteId,
          buyer,
          providerId,
          hoursWad,
          slotId,
          expiresAt,
          nonce,
        },
      });
    } else {
      warnings.push('Mock quote mode enabled. Signature will fail on-chain BookingManager validation.');
    }

    return NextResponse.json({
      quoteMode: resolvedMode,
      signerAddress,
      quoteId,
      buyer,
      providerId: providerId.toString(),
      hoursWad: hoursWad.toString(),
      slotId: slotId.toString(),
      expiresAt: expiresAt.toString(),
      nonce: nonce.toString(),
      signature,
      warnings,
    });
  } catch (error) {
    console.error('Booking quote route failed:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Booking quote route failed.' },
      { status: 500 }
    );
  }
}
