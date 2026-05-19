# Time TokenAIzer

Time TokenAIzer is a Next.js marketplace for redeemable professional time credits. Creators publish limited service inventory, buyers acquire fungible `TIME` credits through a Uniswap v4 `TIME/USDC` pool, and confirmed bookings settle through first-party marketplace contracts.

The important boundary is deliberate: Uniswap v4 is the liquidity layer, not the booking marketplace. Booking state, quote validity, slot locking, cancellation, completion, and disputes belong to `BookingManager`.

## Current Status

- **GPT-5.5 server routes** replace browser-exposed Gemini and the unused Eliza agent package.
- **ERC-20 TIME credits** replace the old ERC-1155 marketplace mental model for fungible hours.
- **BookingManager** owns provider inventory, signed quotes, slot uniqueness, and booking lifecycle state.
- **Uniswap v4 TIME/USDC pool** provides credit liquidity and price discovery.
- **TimePoolHook** performs pool-side checks for booking-aware swap intent, optional single-use quote consumption, and telemetry; it does not book slots.
- **Booking checkout** now requests signed booking quotes through `/api/booking/quote`, can register provider inventory, can run the Permit2 + Universal Router swap path, and keeps final booking as a separate `BookingManager.bookWithCredits` transaction.
- **Ethereum Sepolia** has a recorded live deployment in `docs/deployment/sepolia-live-deployment.md`. Base Sepolia remains a supported v4 target.

## Ethereum Sepolia Deployment

| Component | Address |
| --- | --- |
| TIME token | [`0x45EE4b59E2Df4B2b07415919990E5F95332eA19F`](https://sepolia.etherscan.io/address/0x45EE4b59E2Df4B2b07415919990E5F95332eA19F) |
| BookingManager | [`0xE85c76078385644418783bd182A60F966aa4852B`](https://sepolia.etherscan.io/address/0xE85c76078385644418783bd182A60F966aa4852B) |
| TimePoolHook | [`0x24DeEADAC18474170a023610BfC471436d7300C0`](https://sepolia.etherscan.io/address/0x24DeEADAC18474170a023610BfC471436d7300C0) |
| Mock USDC | [`0x1EAf39D8EaF6491FBb58fA5aB3047Ff137Faa502`](https://sepolia.etherscan.io/address/0x1EAf39D8EaF6491FBb58fA5aB3047Ff137Faa502) |
| v4 PoolManager | [`0xE03A1074c86CFeDd5C142C4F04F1a1536e203543`](https://sepolia.etherscan.io/address/0xE03A1074c86CFeDd5C142C4F04F1a1536e203543) |
| v4 Universal Router | [`0x3A9D48AB9751398BbFa63ad67599Bb04e4BdF98b`](https://sepolia.etherscan.io/address/0x3A9D48AB9751398BbFa63ad67599Bb04e4BdF98b) |
| v4 Quoter | [`0x61B3f2011A92d183C7dbaDBdA940a7555Ccf9227`](https://sepolia.etherscan.io/address/0x61B3f2011A92d183C7dbaDBdA940a7555Ccf9227) |

Pool ID: `0xd2fa7fc47da4fdec875e0eaf18b8fbee6171891c256fb44341ea9c211fed93b7`

## Architecture

```text
Frontend marketplace
  -> /api/booking/quote
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
5. Request a signed `BookingQuote` from `/api/booking/quote`.
6. Acquire `TIME` credits through a v4 pool, or use existing credits.
7. Book a slot with the signed quote through `BookingManager`.
8. `BookingManager` burns or locks the required `TIME` and records booking state.

See [PRODUCT.md](./PRODUCT.md), [DESIGN.md](./DESIGN.md), and [docs/architecture/uniswap-v4-time-marketplace.md](./docs/architecture/uniswap-v4-time-marketplace.md) for the product, design, and protocol context.
See [docs/security/time-pool-hook-review.md](./docs/security/time-pool-hook-review.md), [docs/deployment/v4-testnet-readiness.md](./docs/deployment/v4-testnet-readiness.md), [docs/deployment/sepolia-live-deployment.md](./docs/deployment/sepolia-live-deployment.md), and [docs/demo/time-v4-showcase-runbook.md](./docs/demo/time-v4-showcase-runbook.md) for the hook security checklist, v4 deployment evidence, and demo flow.

## Repository Layout

| Area | Role |
| --- | --- |
| `src/app/` | Next.js App Router UI and route handlers |
| `src/app/api/ai/` | Server-side OpenAI route handlers |
| `src/app/api/booking/quote/` | Server-side booking quote signer with real/mock quote modes |
| `src/app/services/` | Client service wrappers for AI, booking, contracts, and v4 swap preparation |
| `src/app/shared/uniswapV4.ts` | Uniswap v4 deployment constants |
| `src/app/types/` | Shared portfolio and time-market types |
| `contracts/src/TimeCreditToken.sol` | ERC-20 `TIME` credit token used for redeemable service hours |
| `contracts/src/BookingManager.sol` | Provider inventory, quote validation, slot locking, and booking lifecycle |
| `contracts/src/TimePoolHook.sol` | v4 hook with pool/router allowlists, booking-aware hook data validation, quote replay protection, and telemetry |
| `contracts/src/mocks/MockUSDC.sol` | Testnet/demo USDC used when no external test token is configured |
| `contracts/script/DeployTimeV4Testnet.s.sol` | Testnet deployment script for TIME, BookingManager, mined hook, pool init, and router trust |
| `docs/deployment/` | v4 readiness and live deployment records |
| `docs/demo/` | Showcase runbook and evidence checklist |
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

# Booking quote API
BOOKING_QUOTE_MODE=auto
QUOTE_SIGNER_PRIVATE_KEY=your-quote-signer-private-key
BOOKING_QUOTE_TTL_SECONDS=600
BOOKING_QUOTE_STRICT_PROVIDER_CHECK=true

# App RPCs
SEPOLIA_RPC=your-ethereum-sepolia-rpc
BASE_SEPOLIA_RPC=your-base-sepolia-rpc

# Ethereum Sepolia app contracts
NEXT_PUBLIC_TIME_CREDIT_TOKEN_SEPOLIA=0x45EE4b59E2Df4B2b07415919990E5F95332eA19F
NEXT_PUBLIC_BOOKING_MANAGER_SEPOLIA=0xE85c76078385644418783bd182A60F966aa4852B
NEXT_PUBLIC_TIME_POOL_HOOK_SEPOLIA=0x24DeEADAC18474170a023610BfC471436d7300C0
NEXT_PUBLIC_USDC_SEPOLIA=0x1EAf39D8EaF6491FBb58fA5aB3047Ff137Faa502
NEXT_PUBLIC_V4_POOL_ID=0xd2fa7fc47da4fdec875e0eaf18b8fbee6171891c256fb44341ea9c211fed93b7
NEXT_PUBLIC_POOL_CURRENCY0=0x1EAf39D8EaF6491FBb58fA5aB3047Ff137Faa502
NEXT_PUBLIC_POOL_CURRENCY1=0x45EE4b59E2Df4B2b07415919990E5F95332eA19F
NEXT_PUBLIC_POOL_FEE=3000
NEXT_PUBLIC_POOL_TICK_SPACING=60

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

The latest recorded local checks in the deployment notes passed `npx tsc --noEmit --pretty false --incremental false` and `npm run build`. WalletConnect may still print non-fatal hook dependency or browser-storage warnings during static generation.

## Contract Workspace

The contract workspace lives in `contracts/`. The repo includes npm-installed Solidity dependencies for OpenZeppelin and Uniswap v4, plus a `solc` compile fallback for environments without Foundry:

```bash
npm run contracts:compile
npm run contracts:compile:tests
```

For execution-level tests and gas snapshots, install Foundry and run:

```bash
cd contracts
forge test -vvv
forge snapshot --match-contract TimePoolHookTest --skip script
```

The current hook hardening coverage includes malformed hook data, missing required hook data, invalid buyers/hours, insufficient inventory, quote replay, trusted-router quote consumption, and invariant checks for narrow hook permissions. Use `--skip script` for the snapshot until the deployment script layer is aligned with the installed `forge-std` API.

## Testnet Deployment

Set the target chain's official Uniswap v4 addresses as generic `V4_*` variables, then dry-run or broadcast the deploy script:

```bash
cd contracts
forge script script/DeployTimeV4Testnet.s.sol --rpc-url "$TESTNET_RPC"
forge script script/DeployTimeV4Testnet.s.sol --rpc-url "$TESTNET_RPC" --broadcast
```

The script deploys or reuses demo USDC, deploys `TimeCreditToken` and `BookingManager`, mines a hook address with `beforeSwap` and `afterSwap` permissions, grants roles, trusts the Universal Router for quote consumption, initializes the v4 pool, and prints the app-facing deployment values.

## Security Posture

- The hook never creates bookings.
- Empty `hookData` is a generic liquidity swap with no booking guarantee.
- Non-empty `hookData` is booking-aware intent and must decode and validate through `BookingManager`.
- Malformed non-empty `hookData` reverts instead of becoming a generic swap.
- Single-use hook quote consumption is allowed only through routers marked with `setRouterQuoteConsumptionTrust`.
- Signed quote validity is delegated to `BookingManager`.
- Fixed booking quote terms are separate from AMM execution price and slippage.
- Creator/platform fee hooks are deferred until invariant tests cover accounting and refunds.
