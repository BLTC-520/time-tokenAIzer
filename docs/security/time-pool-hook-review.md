# TimePoolHook Security Review

## Enabled Permissions

- beforeSwap: true
- afterSwap: true
- beforeSwapReturnDelta: false
- afterSwapReturnDelta: false
- beforeAddLiquidity: false
- afterAddLiquidity: false
- beforeRemoveLiquidity: false
- afterRemoveLiquidity: false

## Explicit Non-Goals

- No custom curve.
- No hook-owned liquidity.
- No return delta.
- No booking settlement in callbacks.
- No unbounded loops.
- No creator or platform fee in the MVP hook.
- No trust in router `sender` as the final buyer.

## Required Checks

- Pool allowlist.
- Router allowlist.
- EIP-712 quote validation through BookingManager.
- Inventory check before swap when booking intent is present.
- Unit coverage for permission flags and revert paths.
- `npm run contracts:compile:tests` as the local compile gate when Foundry is unavailable.
- Fuzz tests for overbooking, quote replay, and slot collisions.
- Gas snapshot for hook revert and success paths.

## Callback Boundary

`beforeSwap` may validate `hookData` and revert unsafe booking-aware swaps. `afterSwap` may emit telemetry only. Neither callback should call `bookWithCredits`, burn `TIME`, reserve a slot, or mutate booking lifecycle state.

Booking settlement must happen after final swap settlement because Uniswap v4 uses flash accounting during pool operations. The user or checkout router must complete the booking with settled `TIME` credits through `BookingManager`.

## Known Open Items

- Add invariant and fuzz tests for quote replay, slot collision, and provider inventory accounting.
- Decide whether ordinary secondary-market swaps without `hookData` should remain allowed or become quote-gated.
- Resolve deploy-script compatibility with the npm `forge-std` package before running `forge snapshot` without `--skip script`.
