# TIME v4 Hook Implementation Analysis Notes

Generated for the Excalidraw + PPTX artifact set on 2026-05-19.

## Current Implementation Boundary

`TimePoolHook` is a narrow Uniswap v4 pool lifecycle guard and telemetry hook. It is not the marketplace and it does not create bookings. Marketplace state remains in `BookingManager`.

## Hook Permissions

`getHookPermissions()` enables only:

- `beforeSwap: true`
- `afterSwap: true`

It disables return-delta callbacks and liquidity callbacks:

- `beforeSwapReturnDelta: false`
- `afterSwapReturnDelta: false`
- `beforeAddLiquidity/afterAddLiquidity: false`
- `beforeRemoveLiquidity/afterRemoveLiquidity: false`

## `beforeSwap` Behavior

`_beforeSwap(sender, key, params, hookData)`:

1. Validates pool allowlist with `allowedPool[key.toId()]`.
2. Validates router allowlist with `allowedRouter[sender]`.
3. Allows empty `hookData` unless `requireHookDataForSwap` is enabled.
4. For non-empty `hookData`, decodes `HookData` and checks:
   - buyer is non-zero,
   - hours are non-zero,
   - `BookingManager.availableHours(providerId)` covers requested hours,
   - `BookingManager.isQuoteValid(...)` accepts quote terms/signature/state.
5. If `enforceSingleUseQuote` is enabled, only a router trusted through `setRouterQuoteConsumptionTrust` may consume hook quote IDs, and `consumedHookQuote[quoteId]` prevents replay at hook level.
6. Returns `ZERO_DELTA`; it does not change swap amounts.

## `afterSwap` Behavior

`_afterSwap(sender, key, params, delta, hookData)`:

1. Revalidates pool/router allowlists.
2. Decodes non-empty hookData only to recover buyer + quoteId for observability.
3. Emits `TimeSwapObserved(poolId, router, buyer, quoteId)`.
4. Returns zero delta and does not call booking settlement.

## Marketplace Settlement

`BookingManager` owns:

- provider registration and inventory,
- provider pause state,
- EIP-712 quote validation,
- quote replay protection via `usedQuotes`,
- slot collision protection via `slotTaken`,
- TIME burn on `bookWithCredits`,
- booking lifecycle status.

A successful v4 swap is therefore not a booking confirmation. The booking exists only after `BookingManager.bookWithCredits(quote)` succeeds with settled TIME credits.

## Frontend Flow

1. UI requests a booking quote through `/api/booking/quote`.
2. `BookingService` normalizes the response into `BookingQuote`.
3. `UniswapV4Service.buildHookData(quote)` ABI-encodes the quote tuple for v4 hookData.
4. `UniswapV4Service.buildExactInputSingle(...)` prepares Universal Router v4 swap calldata.
5. Swap executes through PoolManager and `TimePoolHook`.
6. UI then calls `BookingService.bookWithCredits(quote)` after the swap path settles.

## Verification Evidence in Repo

- `contracts/test/TimePoolHook.t.sol` covers permission flags, owner-only configuration, pool/router allowlists, missing/malformed hookData, invalid buyer/hours, inventory checks, invalid quotes, hook quote replay, untrusted quote-consuming routers, and telemetry-only afterSwap.
- `docs/security/time-pool-hook-review.md` records the callback boundary and required checks.
- `docs/architecture/uniswap-v4-time-marketplace.md` records the architecture split and sequence diagrams.

## Key Explanation Message

TIME v4 checkout is two-phase:

1. v4 swap phase: acquire TIME while the hook validates booking-aware intent and emits telemetry.
2. marketplace settlement phase: call BookingManager to burn/lock settled TIME and create the actual booking.

## Mock Quote Mode Caveat

`/api/booking/quote` can return mock quotes for UI/demo progress when no real signer is configured, but mock signatures are not valid for on-chain `BookingManager` validation. Treat mock mode as a dev/UI fallback only, not a valid booking-aware swap + settlement path.
