import { Actions, V4Planner } from '@uniswap/v4-sdk';
import { CommandType, RoutePlanner } from '@uniswap/universal-router-sdk';
import type { Account, Address, Hex, PublicClient, WalletClient } from 'viem';
import { encodeAbiParameters, maxUint256, zeroAddress } from 'viem';
import type {
  BookingQuote,
  SwapQuoteResult,
  UniversalRouterCall,
  V4PoolKeyConfig,
} from '../types/time-market';
import { getV4Deployment, PERMIT2_ADDRESS } from '../shared/uniswapV4';

const ZERO_BIGINT = BigInt(0);
const UINT128_MAX = (BigInt(1) << BigInt(128)) - BigInt(1);
const MAX_UINT160 = (BigInt(1) << BigInt(160)) - BigInt(1);
const PERMIT2_EXPIRATION_SECONDS = BigInt(60 * 60 * 24 * 30);

const erc20Abi = [
  {
    type: 'function',
    name: 'allowance',
    stateMutability: 'view',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'approve',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
] as const;

const permit2Abi = [
  {
    type: 'function',
    name: 'allowance',
    stateMutability: 'view',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'token', type: 'address' },
      { name: 'spender', type: 'address' },
    ],
    outputs: [
      { name: 'amount', type: 'uint160' },
      { name: 'expiration', type: 'uint48' },
      { name: 'nonce', type: 'uint48' },
    ],
  },
  {
    type: 'function',
    name: 'approve',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'token', type: 'address' },
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint160' },
      { name: 'expiration', type: 'uint48' },
    ],
    outputs: [],
  },
] as const;

export interface BuildExactInputSingleParams {
  chainId: number;
  poolKey: V4PoolKeyConfig;
  zeroForOne: boolean;
  amountIn: bigint;
  amountOutMinimum: bigint;
  hookData: Hex;
  deadlineSeconds?: number;
}

export interface QuoteExactInputSingleParams {
  chainId: number;
  poolKey: V4PoolKeyConfig;
  zeroForOne: boolean;
  amountIn: bigint;
  hookData: Hex;
}

export interface EnsurePermit2ApprovalParams {
  token: Address;
  chainId: number;
  amount: bigint;
  spender: Address;
  owner?: Address | Account;
}

export interface UniswapV4ServiceOptions {
  publicClient?: PublicClient;
  walletClient?: WalletClient;
  account?: Address | Account;
}

export class UniswapV4Service {
  constructor(private readonly options: UniswapV4ServiceOptions = {}) {}

  buildHookData(quote: BookingQuote): Hex {
    this.assertBytes32(quote.quoteId, 'quote.quoteId');

    return encodeAbiParameters(
      [
        {
          type: 'tuple',
          components: [
            { name: 'buyer', type: 'address' },
            { name: 'providerId', type: 'uint256' },
            { name: 'hoursWad', type: 'uint256' },
            { name: 'slotId', type: 'uint256' },
            { name: 'quoteId', type: 'bytes32' },
            { name: 'expiresAt', type: 'uint256' },
            { name: 'nonce', type: 'uint256' },
            { name: 'signature', type: 'bytes' },
          ],
        },
      ],
      [
        {
          buyer: quote.buyer,
          providerId: quote.providerId,
          hoursWad: quote.hoursWad,
          slotId: quote.slotId,
          quoteId: quote.quoteId,
          expiresAt: quote.expiresAt,
          nonce: quote.nonce,
          signature: quote.signature,
        },
      ]
    );
  }

  buildExactInputSingle(params: BuildExactInputSingleParams): UniversalRouterCall {
    getV4Deployment(params.chainId);
    this.assertUint128(params.amountIn, 'amountIn');
    this.assertUint128(params.amountOutMinimum, 'amountOutMinimum');

    const inputCurrency = params.zeroForOne ? params.poolKey.currency0 : params.poolKey.currency1;
    const outputCurrency = params.zeroForOne ? params.poolKey.currency1 : params.poolKey.currency0;

    const v4Planner = new V4Planner();
    v4Planner.addAction(Actions.SWAP_EXACT_IN_SINGLE, [
      {
        poolKey: params.poolKey,
        zeroForOne: params.zeroForOne,
        amountIn: params.amountIn.toString(),
        amountOutMinimum: params.amountOutMinimum.toString(),
        hookData: params.hookData,
      },
    ]);
    v4Planner.addAction(Actions.SETTLE_ALL, [inputCurrency, params.amountIn.toString()]);
    v4Planner.addAction(Actions.TAKE_ALL, [outputCurrency, params.amountOutMinimum.toString()]);

    const routePlanner = new RoutePlanner();
    routePlanner.addCommand(CommandType.V4_SWAP, [v4Planner.finalize()]);

    const deadline = BigInt(
      Math.floor(Date.now() / 1000) + (params.deadlineSeconds ?? 20 * 60)
    );
    const value = inputCurrency.toLowerCase() === zeroAddress ? params.amountIn : ZERO_BIGINT;

    return {
      commands: routePlanner.commands as Hex,
      inputs: routePlanner.inputs as Hex[],
      deadline,
      value,
    };
  }

  async quoteExactInputSingle(params: QuoteExactInputSingleParams): Promise<SwapQuoteResult> {
    getV4Deployment(params.chainId);

    if (!this.options.publicClient) {
      throw new Error(
        'quoteExactInputSingle requires a viem PublicClient wired to the Uniswap v4 Quoter. This service intentionally does not call PoolManager or sign in the browser.'
      );
    }

    throw new Error(
      'quoteExactInputSingle is waiting on the app Quoter ABI/client wiring. Use a server route or viem PublicClient simulation against the configured v4 Quoter before enabling live quotes.'
    );
  }

  async ensurePermit2Approval(params: EnsurePermit2ApprovalParams): Promise<Hex | null> {
    const deployment = getV4Deployment(params.chainId);
    const spender = params.spender || deployment.universalRouter;

    if (params.token.toLowerCase() === zeroAddress) {
      return null;
    }

    const { publicClient, walletClient } = this.options;
    if (!publicClient || !walletClient) {
      throw new Error(
        'ensurePermit2Approval requires viem public and wallet clients. ERC-20 v4 swaps need token approval to Permit2, then Permit2 approval to the Universal Router.'
      );
    }

    const account = params.owner ?? this.options.account ?? walletClient.account;
    if (!account) {
      throw new Error('ensurePermit2Approval requires an owner account or wallet client account.');
    }

    const owner = this.accountAddress(account);
    const tokenAllowance = await publicClient.readContract({
      address: params.token,
      abi: erc20Abi,
      functionName: 'allowance',
      args: [owner, PERMIT2_ADDRESS],
    });

    let latestHash: Hex | null = null;
    if (tokenAllowance < params.amount) {
      latestHash = await walletClient.writeContract({
        account,
        chain: walletClient.chain ?? null,
        address: params.token,
        abi: erc20Abi,
        functionName: 'approve',
        args: [PERMIT2_ADDRESS, maxUint256],
      });
      await publicClient.waitForTransactionReceipt({ hash: latestHash });
    }

    const [permitAmount, permitExpiration] = await publicClient.readContract({
      address: deployment.permit2,
      abi: permit2Abi,
      functionName: 'allowance',
      args: [owner, params.token, spender],
    });
    const now = BigInt(Math.floor(Date.now() / 1000));

    if (permitAmount < params.amount || BigInt(permitExpiration) <= now) {
      const expiration = now + PERMIT2_EXPIRATION_SECONDS;
      latestHash = await walletClient.writeContract({
        account,
        chain: walletClient.chain ?? null,
        address: deployment.permit2,
        abi: permit2Abi,
        functionName: 'approve',
        args: [params.token, spender, MAX_UINT160, Number(expiration)],
      });
    }

    return latestHash;
  }

  private assertUint128(value: bigint, label: string) {
    if (value < ZERO_BIGINT || value > UINT128_MAX) {
      throw new Error(`${label} must fit in uint128`);
    }
  }

  private assertBytes32(value: Hex, label: string) {
    if (!/^0x[0-9a-fA-F]{64}$/.test(value)) {
      throw new Error(`${label} must be a bytes32 hex string`);
    }
  }

  private accountAddress(account: Address | Account): Address {
    return typeof account === 'string' ? account : account.address;
  }
}
