import type { Account, Address, Hex, PublicClient, WalletClient } from 'viem';
import type { BookingQuote, BookingQuoteRequest, ProviderInventory } from '../types/time-market';

export const BOOKING_MANAGER_ABI = [
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

type JsonRecord = Record<string, unknown>;

export class BookingService {
  constructor(private readonly options: BookingServiceOptions = {}) {}

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
