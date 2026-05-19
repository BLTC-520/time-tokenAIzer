# TIME Uniswap v4 Testnet Showcase Runbook

## Goal

Run an Ethereum Sepolia or Base Sepolia demo where `TIME` can be quoted and swapped through a Uniswap v4 pool with `TimePoolHook`, then show that booking state is created separately through `BookingManager` after the user owns settled `TIME` credits.

This keeps the architecture boundary clear:

- **Uniswap v4 path:** liquidity, quoting, swap execution, and hook-side intent validation/telemetry.
- **Booking path:** signed quote authorization and final booking state in `BookingManager`.
- **Important:** a successful v4 swap is not itself a booking confirmation.

## Preflight

```bash
# Contract regression gate
cd contracts
forge test -vvv
forge snapshot --match-contract TimePoolHookTest --skip script
forge build

# App regression gate
cd ..
npm run build
npx tsc --noEmit --pretty false --incremental false
```

Confirm the deployer wallet has testnet ETH before any broadcast.

## Required environment

Use `.env.local` for app/runtime values and shell exports for Foundry commands:

```bash
export TESTNET_RPC=<testnet-rpc-url>
export DEPLOYER_PRIVATE_KEY=<funded-deployer-private-key>
export QUOTE_SIGNER_ADDRESS=<quote-signer-or-deployer>
export V4_POOL_MANAGER=<target-chain-pool-manager>
export V4_UNIVERSAL_ROUTER=<target-chain-universal-router>
export V4_POSITION_MANAGER=<target-chain-position-manager>
export V4_STATE_VIEW=<target-chain-state-view>
export V4_QUOTER=<target-chain-quoter>
export V4_PERMIT2=0x000000000022D473030F116dDEE9F6B43aC78BA3
export TEST_USDC= # optional; empty deploys MockUSDC
```

## 1. Dry-run deployment

```bash
cd contracts
forge script script/DeployTimeV4Testnet.s.sol --rpc-url "$TESTNET_RPC"
```

Expected output includes:

- `TIME_TOKEN_TESTNET`
- `BOOKING_MANAGER_TESTNET`
- `TIME_POOL_HOOK_TESTNET`
- `TEST_USDC`
- `V4_POOL_MANAGER`
- `V4_UNIVERSAL_ROUTER`
- `V4_POSITION_MANAGER`
- `V4_STATE_VIEW`
- `V4_QUOTER`
- `V4_PERMIT2`
- `V4_POOL_ID`
- `POOL_CURRENCY0`
- `POOL_CURRENCY1`
- `POOL_FEE`
- `POOL_TICK_SPACING`

If the dry-run fails, do not broadcast. Fix the revert/config issue and rerun the dry-run.

## 2. Broadcast deployment

```bash
cd contracts
forge script script/DeployTimeV4Testnet.s.sol \
  --rpc-url "$TESTNET_RPC" \
  --broadcast
```

Copy the printed deployment output into `.env.local`. For Ethereum Sepolia:

```bash
NEXT_PUBLIC_TIME_CREDIT_TOKEN_SEPOLIA=<TIME_TOKEN_TESTNET>
NEXT_PUBLIC_BOOKING_MANAGER_SEPOLIA=<BOOKING_MANAGER_TESTNET>
NEXT_PUBLIC_TIME_POOL_HOOK_SEPOLIA=<TIME_POOL_HOOK_TESTNET>
NEXT_PUBLIC_USDC_SEPOLIA=<TEST_USDC>
NEXT_PUBLIC_V4_POOL_ID=<V4_POOL_ID>
NEXT_PUBLIC_POOL_CURRENCY0=<POOL_CURRENCY0>
NEXT_PUBLIC_POOL_CURRENCY1=<POOL_CURRENCY1>
NEXT_PUBLIC_POOL_FEE=3000
NEXT_PUBLIC_POOL_TICK_SPACING=60
```

For Base Sepolia, use `NEXT_PUBLIC_TIME_CREDIT_TOKEN_BASE_SEPOLIA`, `NEXT_PUBLIC_BOOKING_MANAGER_BASE_SEPOLIA`, `NEXT_PUBLIC_TIME_POOL_HOOK_BASE_SEPOLIA`, and `NEXT_PUBLIC_USDC_BASE_SEPOLIA`.

## 3. Seed demo liquidity

Before the quote/swap demo, seed the initialized `TIME/USDC` pool with enough test liquidity through the configured PositionManager. Capture the liquidity transaction hash and position details. Without liquidity, the Quoter path is expected to return an actionable pool/liquidity error, which is fallback evidence rather than a happy-path swap.

Minimum evidence to capture:

- PositionManager transaction hash.
- Pool id/key used for the position.
- Input token amounts.
- Confirmation that the pool has non-zero liquidity before quoting.

## 4. Quote and hookData flow

1. Connect a wallet on the target testnet, e.g. Ethereum Sepolia for chain `11155111`.
2. Select a provider/slot and request a signed `BookingQuote` from the app/API.
3. Build hookData with `UniswapV4Service.buildHookData(quote)`.
4. Build the pool key from deployment output:
   - `currency0`
   - `currency1`
   - `fee`
   - `tickSpacing`
   - `hooks = TIME_POOL_HOOK_TESTNET`
5. Call `quoteExactInputSingle` with:
   - `chainId = 11155111` for Ethereum Sepolia, or `84532` for Base Sepolia
   - `poolKey`
   - `zeroForOne` matching the token direction
   - `amountIn`
   - `hookData`
6. A valid booking-aware quote should return:
   - `expectedAmountOut`
   - `amountOutMinimum`
   - route description including the configured Quoter address.

Fallback if booking quote generation is unavailable: demo a generic swap with `hookData = 0x` and label it clearly as **generic TIME liquidity only, no booking guarantee**.

## 5. ERC-20 and Permit2 approvals

For ERC-20 input swaps, use the two-step Permit2 flow:

1. ERC-20 `approve(V4_PERMIT2, MaxUint256)` if token allowance to Permit2 is too low.
2. Permit2 `approve(inputToken, V4_UNIVERSAL_ROUTER, MAX_UINT160, expiration)` if Permit2 allowance is too low or expired.

`UniswapV4Service.ensurePermit2Approval` performs these checks when wired with viem public and wallet clients.

## 6. Build and submit the swap

Use `UniswapV4Service.buildExactInputSingle` to produce the Universal Router call:

- `V4_SWAP` command
- `SWAP_EXACT_IN_SINGLE`
- `SETTLE_ALL`
- `TAKE_ALL`
- deadline
- ETH value only when the input currency is native ETH

Submit the returned `commands`, `inputs`, `deadline`, and `value` to the configured Universal Router.

Expected on-chain evidence:

- Universal Router transaction hash.
- Successful receipt on the target testnet.
- `TimeSwapObserved(poolId, router, buyer, quoteId)` from `TimePoolHook`.
- For booking-aware hookData while single-use protection is enabled, the Universal Router was trusted through `setRouterQuoteConsumptionTrust`.
- If booking-aware hookData was used, `buyer` and `quoteId` match the signed quote.

## 7. Final booking step

After the swap settles and the user owns enough `TIME`, create booking state separately:

1. Call `BookingManager.bookWithCredits` with the same signed booking quote fields.
2. Capture the booking transaction hash.
3. Confirm the booking status from `BookingManager`.

This proves the intended split: v4 handles liquidity and hook validation; `BookingManager` owns the final service booking.

## Demo evidence checklist

Use this as the evidence bundle for judges/team demo:

| Evidence | Required for happy path | Fallback when live tx is blocked |
| --- | --- | --- |
| Deployed contract addresses | Deployment script output | Dry-run output plus config screenshot |
| Pool id/key | `V4_POOL_ID`, currencies, fee, tick spacing | Same from dry-run/logs |
| Liquidity seed | PositionManager tx hash and non-zero liquidity check | Recorded blocker proving no funded seeding wallet/liquidity |
| Quote result | Quoter return values in app/logs | Recorded error proving missing liquidity/config blocker |
| Approval tx | ERC-20 and Permit2 tx hashes | Wallet screenshot showing pending/missing funded wallet |
| Swap tx | Universal Router tx hash + explorer link | Generated calldata plus blocked reason |
| Hook event | `TimeSwapObserved` log | Expected event signature and test evidence |
| Booking tx | `BookingManager.bookWithCredits` tx hash | Unit test evidence and UI/API mock transcript |
| Screenshots | Wallet, app state, explorer receipts | Dry-run terminal, app config, local build |

## Demo talk track

1. “This is a composable TIME/USDC Uniswap v4 pool.”
2. “Generic swaps can pass empty hookData and are just liquidity.”
3. “Booking-aware swaps pass signed hookData; the hook validates quote shape, inventory, signer validity, trusted-router quote consumption, and single-use quote policy.”
4. “The swap emits hook telemetry, but booking state is not mutated by the hook.”
5. “After TIME settles, `BookingManager.bookWithCredits` creates the actual service booking.”

## Current readiness

The repo is rehearsal-ready: contracts build, hook tests pass locally, the app build/typecheck passes, deployment outputs are documented, and the demo path is scripted. A live testnet proof still requires a funded deployer, RPC URL, seeded pool liquidity, approval transactions, swap evidence, and booking evidence.
