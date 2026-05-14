export type HexString = `0x${string}`;
export type AddressString = HexString;
export type WadAmount = bigint;

export type BookingStatus = 'none' | 'booked' | 'completed' | 'cancelled' | 'disputed';

export interface ProviderInventory {
  providerId: string;
  owner: AddressString;
  serviceName: string;
  availableHoursWad: WadAmount;
  paused: boolean;
}

export interface BookingQuote {
  quoteId: HexString;
  buyer: AddressString;
  providerId: bigint;
  hoursWad: WadAmount;
  slotId: bigint;
  expiresAt: bigint;
  nonce: bigint;
  signature: HexString;
}

export interface V4PoolKeyConfig {
  currency0: AddressString;
  currency1: AddressString;
  fee: number;
  tickSpacing: number;
  hooks: AddressString;
}

export interface SwapQuoteResult {
  amountIn: bigint;
  amountOutMinimum: bigint;
  expectedAmountOut: bigint;
  routeDescription: string;
}

export interface BookingQuoteRequest {
  providerId: bigint;
  buyer: AddressString;
  hoursWad: WadAmount;
  slotId: bigint;
}

export interface CheckoutSwapRequest {
  chainId: number;
  poolKey: V4PoolKeyConfig;
  quote: BookingQuote;
  amountIn: bigint;
  amountOutMinimum: bigint;
  zeroForOne: boolean;
}

export interface UniversalRouterCall {
  commands: HexString;
  inputs: HexString[];
  deadline: bigint;
  value: bigint;
}
