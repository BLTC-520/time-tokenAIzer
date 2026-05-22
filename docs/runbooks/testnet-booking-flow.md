# Testnet Booking Flow Runbook

## Network

Use Base Sepolia for the Uniswap v4 path. Avalanche Fuji remains legacy Chainlink Functions and KYC demo support.

## Prerequisites

1. Install Foundry.
2. Populate `.env` from `.env.example`.
3. Fund the deployer wallet with Base Sepolia ETH.
4. Set `OPENAI_API_KEY` for GPT-assisted portfolio and quote strategy routes.
5. Create a server-only quote signer key. Store `QUOTE_SIGNER_PRIVATE_KEY` only in local/server env, never as `NEXT_PUBLIC_*`, and never commit `.env.local`.
6. Set `QUOTE_SIGNER_ADDRESS` to the address derived from `QUOTE_SIGNER_PRIVATE_KEY`; the quote API fails closed if they do not match.

## Deterministic Demo

1. Connect a Base Sepolia wallet.
2. Mint or configure test USDC.
3. Deploy `TimeCreditToken`.
4. Deploy `BookingManager`.
5. Mine and deploy `TimePoolHook` with beforeSwap and afterSwap flags only.
6. Grant `TimeCreditToken.BOOKING_ROLE` to `BookingManager`.
7. Grant `BookingManager.QUOTE_SIGNER_ROLE` to `QUOTE_SIGNER_ADDRESS`.
8. Allow the Base Sepolia Universal Router in `TimePoolHook`.
9. Initialize the `TIME/USDC` Uniswap v4 pool with the hook address.
10. Register provider inventory in `BookingManager` from a wallet with `PROVIDER_MANAGER_ROLE`.
11. Mint bounded `TIME` supply that does not exceed redeemable provider capacity.
12. Add liquidity to the `TIME/USDC` pool.
13. Generate a signed booking quote from the server-side quote signer.
14. Swap USDC to TIME with `hookData` containing the quote intent.
15. Confirm the swap produced settled `TIME` credits.
16. Call `BookingManager.bookWithCredits`.
17. Confirm the booking appears in the dashboard.

## Safety Checks

- The swap confirmation is not a booking confirmation.
- A booking is only complete after `bookWithCredits` confirms.
- Expired quotes must fail.
- Reused quote IDs must fail.
- Low inventory must fail before booking.
- Hook telemetry should show swap intent without changing booking state.
- `BOOKING_QUOTE_MODE=auto` and `real` require a configured role-bearing signer and must not fall back to mock signatures.
- `BOOKING_QUOTE_MODE=mock` is only for local/dev tests. Production rejects mock mode.
- Provider registration in the UI is manager-only; normal buyer wallets should not see it as an available booking action.
