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
- Explicit router quote-consumption trust before single-use hook quote IDs can be consumed.
- EIP-712 quote validation through BookingManager.
- Inventory check before swap when booking intent is present.
- Empty `hookData` is treated as a generic liquidity swap with no booking guarantee.
- Non-empty `hookData` is treated as booking-aware intent and must decode plus validate through `BookingManager`.
- Malformed non-empty `hookData` must revert instead of silently becoming a generic swap.
- Unit coverage for permission flags and revert paths.
- `npm run contracts:compile:tests` as the local compile gate when Foundry is unavailable.
- Fuzz tests for overbooking, quote replay, and slot collisions.
- Gas snapshot for hook revert and success paths.

## Callback Boundary

`beforeSwap` may validate `hookData` and revert unsafe booking-aware swaps. Empty `hookData` is only a generic `TIME` liquidity swap; it is not a booking reservation, quote acceptance, or service-right transfer. `afterSwap` may emit telemetry only. Neither callback should call `bookWithCredits`, burn `TIME`, reserve a slot, or mutate booking lifecycle state.

Booking settlement must happen after final swap settlement because Uniswap v4 uses flash accounting during pool operations. The user or checkout router must complete the booking with settled `TIME` credits through `BookingManager`. When hook-level single-use quote protection is enabled, only routers explicitly marked with `setRouterQuoteConsumptionTrust(router, true)` may consume quote IDs.

A successful swap, even with valid booking `hookData`, is not a booking confirmation. A booking exists only after `BookingManager.bookWithCredits` succeeds.

## Known Open Items

- Add full marketplace-level slot collision and provider inventory accounting invariants around `BookingManager`; hook-level quote replay and inventory bounds now have regression coverage.
- If the product later needs a strict booking-gated route or pool, add explicit direction and intent tests before rejecting all empty `hookData` swaps.
- Resolve deploy-script compatibility with the npm `forge-std` package before running `forge snapshot` without `--skip script`.
