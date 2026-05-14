# Time TokenAIzer

Time TokenAIzer is a Next.js marketplace for redeemable professional time credits. Creators publish limited service inventory, buyers acquire fungible `TIME` credits through a Uniswap v4 `TIME/USDC` pool, and confirmed bookings settle through first-party marketplace contracts.

The important boundary is deliberate: Uniswap v4 is the liquidity layer, not the booking marketplace. Booking state, quote validity, slot locking, cancellation, completion, and disputes belong to `BookingManager`.

## Current Refactor Direction

- **GPT-5.5 server routes** replace browser-exposed Gemini and the unused Eliza agent package.
- **ERC-20 TIME credits** replace the old ERC-1155 marketplace mental model for fungible hours.
- **BookingManager** owns provider inventory, signed quotes, slot uniqueness, and booking lifecycle state.
- **Uniswap v4 TIME/USDC pool** provides credit liquidity and price discovery.
- **TimePoolHook** performs narrow pool-side checks for swap intent and emits telemetry; it does not book slots.
- **Base Sepolia and Sepolia** are the primary Uniswap v4 integration targets. Avalanche Fuji remains legacy Chainlink/KYC demo support.

## Architecture

```text
Frontend marketplace
  -> BookingManager
  -> TimeCreditToken
  -> Uniswap v4 TIME/USDC pool
  -> TimePoolHook
```

Core flow:

1. Connect wallet.
2. Complete access checks.
3. Generate a GPT-assisted skill and inventory profile.
4. Register provider inventory.
5. Acquire `TIME` credits through a v4 pool, or use existing credits.
6. Book a slot with a signed quote through `BookingManager`.
7. `BookingManager` burns or locks the required `TIME` and records booking state.

See [PRODUCT.md](./PRODUCT.md), [DESIGN.md](./DESIGN.md), and [docs/architecture/uniswap-v4-time-marketplace.md](./docs/architecture/uniswap-v4-time-marketplace.md) for the product, design, and protocol context.
See [docs/security/time-pool-hook-review.md](./docs/security/time-pool-hook-review.md) and [docs/runbooks/testnet-booking-flow.md](./docs/runbooks/testnet-booking-flow.md) for the hook security checklist and Base Sepolia demo flow.

## Repository Layout

| Area | Role |
| --- | --- |
| `src/app/` | Next.js App Router UI and route handlers |
| `src/app/api/ai/` | Server-side OpenAI route handlers |
| `src/app/services/` | Client service wrappers for AI, booking, contracts, and v4 swap preparation |
| `src/app/shared/uniswapV4.ts` | Uniswap v4 deployment constants |
| `src/app/types/` | Shared portfolio and time-market types |
| `contracts/src/` | Time credit, booking, mock token, and security-first v4 hook contracts |
| `docs/superpowers/plans/` | Refactor implementation plan |

## Environment

```bash
# Server-side AI only. Do not expose this with NEXT_PUBLIC_.
OPENAI_API_KEY=your-openai-api-key
OPENAI_MODEL=gpt-5.5

# Wallet UI
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your-walletconnect-id

# Local development only. Enables the "Grant Dev KYC Access" button.
NEXT_PUBLIC_DEV_KYC_BYPASS=false

# Legacy Chainlink Functions / KYC demo support
CHAINLINK_SUBSCRIPTION_ID=15603
CHAINLINK_SECRETS_SLOT_ID=0
CHAINLINK_SECRETS_VERSION=1750362435
CHAINLINK_DON_ID=fun-avalanche-fuji-1
```

## Install And Run

```bash
npm install
npm run dev
```

The default Next.js dev URL is [http://localhost:3000](http://localhost:3000).

To bypass KYC locally for development, set `NEXT_PUBLIC_DEV_KYC_BYPASS=true` in `.env.local`, restart `npm run dev`, connect a wallet, then click **Grant Dev KYC Access** on the KYC screen. The bypass is ignored in production builds.

## Verification

```bash
npx tsc --noEmit --pretty false
npm run build
```

The current build succeeds. WalletConnect may still print a non-fatal `indexedDB is not defined` warning during static generation because it probes browser storage while Next prerenders.

## Contract Workspace

The contract workspace lives in `contracts/`. The repo includes npm-installed Solidity dependencies for OpenZeppelin and Uniswap v4, plus a `solc` compile fallback for environments without Foundry:

```bash
npm run contracts:compile
npm run contracts:compile:tests
```

For execution-level tests and gas snapshots, install Foundry and run:

```bash
cd contracts
forge test
forge snapshot --match-contract TimePoolHookTest --skip script
```

This local workspace has been verified with Foundry `1.7.1`; the current suite passes `20` tests. The `--skip script` flag is used for the snapshot because the npm-distributed `forge-std` package has an older `Vm` interface than modern deployment scripts expect.

## Security Posture

- The hook never creates bookings.
- `hookData` buyer and quote intent must be validated, because hook `sender` is usually a router.
- Signed quote validity is delegated to `BookingManager`.
- Fixed booking quote terms are separate from AMM execution price and slippage.
- Creator/platform fee hooks are deferred until invariant tests cover accounting and refunds.
