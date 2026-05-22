import type { Account, Address, Hex, PublicClient, WalletClient } from 'viem';
import type { BookingQuote, BookingQuoteRequest, ProviderInventory } from '../types/time-market';

export const BOOKING_MANAGER_ABI = [
  {
    type: 'function',
    name: 'nextProviderId',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'PROVIDER_MANAGER_ROLE',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'bytes32' }],
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
    name: 'bookWithCredits',
    stateMutability: 'nonpayable',
    inputs: [
      {
        name: 'quote',
        type: 'tuple',
        components: [
          { name: 'quoteId', type: 'bytes32' },
          { name: 'buyer', type: 'address' },
          { name: 'providerId', type: 'uint256' },
          { name: 'hoursWad', type: 'uint256' },
          { name: 'slotId', type: 'uint256' },
          { name: 'expiresAt', type: 'uint256' },
          { name: 'nonce', type: 'uint256' },
          { name: 'signature', type: 'bytes' },
        ],
      },
    ],
    outputs: [{ name: 'bookingId', type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'registerProvider',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'hoursWad', type: 'uint256' },
    ],
    outputs: [{ name: 'providerId', type: 'uint256' }],
  },
] as const;

export interface BookingServiceOptions {
  bookingManagerAddress?: Address;
  publicClient?: PublicClient;
  walletClient?: WalletClient;
  account?: Address | Account;
  fetcher?: typeof fetch;
  quoteMode?: 'auto' | 'real' | 'mock';
}

export interface ProviderInventoryListOptions {
  includePaused?: boolean;
  limit?: number;
}

export interface ProviderInventoryListResult {
  providers: ProviderInventory[];
  warnings: string[];
  scanned: number;
  nextProviderId: bigint;
}

type JsonRecord = Record<string, unknown>;

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
const DEFAULT_PROVIDER_SCAN_LIMIT = 100;
const MAX_PROVIDER_SCAN_LIMIT = 250;
const PROVIDER_SCAN_BATCH_SIZE = 8;

const clampProviderScanLimit = (value: number) =>
  Math.min(MAX_PROVIDER_SCAN_LIMIT, Math.max(1, Math.floor(value)));

const resolveProviderScanLimit = (limit: number | undefined) => {
  if (typeof limit === 'number' && Number.isFinite(limit)) {
    return clampProviderScanLimit(limit);
  }

  const envLimit = Number.parseInt(process.env.NEXT_PUBLIC_PROVIDER_SCAN_LIMIT ?? '', 10);
  if (Number.isFinite(envLimit)) {
    return clampProviderScanLimit(envLimit);
  }

  return DEFAULT_PROVIDER_SCAN_LIMIT;
};

export class BookingService {
  constructor(private readonly options: BookingServiceOptions = {}) {}

  async getNextProviderId(): Promise<bigint> {
    const { publicClient, bookingManagerAddress } = this.options;
    if (!publicClient || !bookingManagerAddress) {
      throw new Error('getNextProviderId requires a viem PublicClient and BookingManager address.');
    }

    return publicClient.readContract({
      address: bookingManagerAddress,
      abi: BOOKING_MANAGER_ABI,
      functionName: 'nextProviderId',
    });
  }

  async hasProviderManagerRole(account: Address): Promise<boolean> {
    const { publicClient, bookingManagerAddress } = this.options;
    if (!publicClient || !bookingManagerAddress) {
      throw new Error(
        'hasProviderManagerRole requires a viem PublicClient and BookingManager address.'
      );
    }

    const providerManagerRole = await publicClient.readContract({
      address: bookingManagerAddress,
      abi: BOOKING_MANAGER_ABI,
      functionName: 'PROVIDER_MANAGER_ROLE',
    });

    return publicClient.readContract({
      address: bookingManagerAddress,
      abi: BOOKING_MANAGER_ABI,
      functionName: 'hasRole',
      args: [providerManagerRole, account],
    });
  }

  async getProviderInventory(providerId: bigint): Promise<ProviderInventory> {
    const { publicClient, bookingManagerAddress } = this.options;
    if (!publicClient || !bookingManagerAddress) {
      throw new Error(
        'getProviderInventory requires a viem PublicClient and BookingManager address.'
      );
    }

    const [owner, availableHoursWad, paused] = await publicClient.readContract({
      address: bookingManagerAddress,
      abi: BOOKING_MANAGER_ABI,
      functionName: 'providers',
      args: [providerId],
    });

    return {
      providerId: providerId.toString(),
      owner,
      serviceName: `Provider ${providerId.toString()}`,
      availableHoursWad,
      paused,
    };
  }

  async listProviderInventories(
    options: ProviderInventoryListOptions = {}
  ): Promise<ProviderInventoryListResult> {
    const nextProviderId = await this.getNextProviderId();
    const scanLimit = resolveProviderScanLimit(options.limit);
    const highestProviderId = nextProviderId > BigInt(1) ? nextProviderId - BigInt(1) : BigInt(0);
    const scanned = Number(
      highestProviderId > BigInt(scanLimit) ? BigInt(scanLimit) : highestProviderId
    );
    const providerIds = Array.from({ length: scanned }, (_, index) => BigInt(index + 1));
    const providers: ProviderInventory[] = [];
    const warnings: string[] = [];

    for (let index = 0; index < providerIds.length; index += PROVIDER_SCAN_BATCH_SIZE) {
      const batch = providerIds.slice(index, index + PROVIDER_SCAN_BATCH_SIZE);
      const batchResults = await Promise.allSettled(
        batch.map((providerId) => this.getProviderInventory(providerId))
      );

      batchResults.forEach((result, batchIndex) => {
        const providerId = batch[batchIndex];
        if (result.status === 'rejected') {
          const message = result.reason instanceof Error ? result.reason.message : String(result.reason);
          warnings.push(`Provider ${providerId.toString()} read failed: ${message}`);
          return;
        }

        const provider = result.value;
        if (provider.owner.toLowerCase() === ZERO_ADDRESS) return;
        if (!options.includePaused && provider.paused) return;
        providers.push(provider);
      });
    }

    return {
      providers,
      warnings,
      scanned,
      nextProviderId,
    };
  }

  async getQuote(params: BookingQuoteRequest): Promise<BookingQuote> {
    const fetcher = this.options.fetcher ?? fetch;
    const response = await fetcher('/api/booking/quote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chainId: params.chainId,
        providerId: params.providerId.toString(),
        buyer: params.buyer,
        hoursWad: params.hoursWad.toString(),
        slotId: params.slotId.toString(),
        quoteMode: params.quoteMode ?? this.options.quoteMode ?? 'auto',
      }),
    });

    if (!response.ok) {
      const message = await response.text();
      throw new Error(message || `Booking quote request failed with ${response.status}`);
    }

    return this.normalizeQuote((await response.json()) as JsonRecord);
  }

  async bookWithCredits(quote: BookingQuote): Promise<Hex> {
    const { bookingManagerAddress, walletClient } = this.options;
    if (!bookingManagerAddress || !walletClient) {
      throw new Error('bookWithCredits requires a viem WalletClient and BookingManager address.');
    }

    const account = this.options.account ?? walletClient.account;
    if (!account) {
      throw new Error('bookWithCredits requires an account or wallet client account.');
    }

    return walletClient.writeContract({
      account,
      chain: walletClient.chain ?? null,
      address: bookingManagerAddress,
      abi: BOOKING_MANAGER_ABI,
      functionName: 'bookWithCredits',
      args: [this.toContractQuote(quote)],
    });
  }

  async registerProvider(params: { owner: Address; hoursWad: bigint }): Promise<Hex> {
    const { bookingManagerAddress, walletClient } = this.options;
    if (!bookingManagerAddress || !walletClient) {
      throw new Error('registerProvider requires a viem WalletClient and BookingManager address.');
    }

    const account = this.options.account ?? walletClient.account;
    if (!account) {
      throw new Error('registerProvider requires an account or wallet client account.');
    }

    return walletClient.writeContract({
      account,
      chain: walletClient.chain ?? null,
      address: bookingManagerAddress,
      abi: BOOKING_MANAGER_ABI,
      functionName: 'registerProvider',
      args: [params.owner, params.hoursWad],
    });
  }

  private normalizeQuote(value: JsonRecord): BookingQuote {
    return {
      quoteId: this.hexField(value.quoteId, 'quoteId'),
      buyer: this.hexField(value.buyer, 'buyer'),
      providerId: this.bigintField(value.providerId, 'providerId'),
      hoursWad: this.bigintField(value.hoursWad, 'hoursWad'),
      slotId: this.bigintField(value.slotId, 'slotId'),
      expiresAt: this.bigintField(value.expiresAt, 'expiresAt'),
      nonce: this.bigintField(value.nonce, 'nonce'),
      signature: this.hexField(value.signature, 'signature'),
    };
  }

  private toContractQuote(quote: BookingQuote) {
    return {
      quoteId: quote.quoteId,
      buyer: quote.buyer,
      providerId: quote.providerId,
      hoursWad: quote.hoursWad,
      slotId: quote.slotId,
      expiresAt: quote.expiresAt,
      nonce: quote.nonce,
      signature: quote.signature,
    };
  }

  private bigintField(value: unknown, field: string): bigint {
    if (typeof value === 'bigint') return value;
    if (typeof value === 'number' && Number.isInteger(value)) return BigInt(value);
    if (typeof value === 'string' && /^\d+$/.test(value)) return BigInt(value);
    throw new Error(`Booking quote response field "${field}" must be an unsigned integer string`);
  }

  private hexField(value: unknown, field: string): Hex {
    if (typeof value === 'string' && /^0x[0-9a-fA-F]*$/.test(value)) {
      return value as Hex;
    }
    throw new Error(`Booking quote response field "${field}" must be a hex string`);
  }
}
