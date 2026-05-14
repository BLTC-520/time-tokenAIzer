# Uniswap v4 Time Marketplace Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor Time TokenAIzer from a Gemini and ERC-1155 marketplace demo into a GPT-5.5 assisted time-credit protocol with an ERC-20 `TIME` credit token, a BookingManager contract, Uniswap v4 pool integration, and a minimal security-first hook.

**Architecture:** Booking and service fulfillment live in first-party contracts. Uniswap v4 supplies liquidity for fungible `TIME/USDC` trading. The hook is deliberately narrow: `beforeSwap` validates signed booking inventory intent and router provenance, while `afterSwap` emits lightweight telemetry; creator fees and dynamic fees are gated behind later tasks after invariant tests exist.

**Tech Stack:** Next.js 14 App Router, TypeScript, wagmi, viem, RainbowKit, OpenAI Responses API with `gpt-5.5`, Uniswap v4 SDK, Universal Router, Permit2, Solidity 0.8.26, Foundry, v4-core, v4-periphery, OpenZeppelin contracts, Tailwind v4.

---

## Sources Checked

- Uniswap hooks are attached to individual pools and permission flags are encoded in the hook address: https://developers.uniswap.org/docs/protocols/v4/concepts/hooks
- PoolManager swap flow calls `beforeSwap`, executes the swap, calls `afterSwap`, and settles through flash accounting: https://developers.uniswap.org/docs/protocols/v4/concepts/poolmanager
- Flash accounting only settles final balance deltas, so booking should happen after swap settlement, not inside the hook: https://developers.uniswap.org/docs/protocols/v4/concepts/flash-accounting
- Hook deployment requires address mining for the requested permission flags: https://developers.uniswap.org/docs/protocols/v4/guides/hooks/hook-deployment
- v4 SDK install and app-layer integration require `@uniswap/v4-sdk` and `@uniswap/sdk-core`: https://developers.uniswap.org/docs/sdks/v4/overview
- v4 single-hop swaps use Universal Router, `V4Planner`, `SETTLE_ALL`, `TAKE_ALL`, and Permit2 approval for ERC-20 inputs: https://developers.uniswap.org/docs/sdks/v4/guides/swapping/single-hop-swapping
- Official v4 deployments exist for Sepolia and Base Sepolia, but not Avalanche Fuji testnet: https://developers.uniswap.org/docs/protocols/v4/deployments
- OpenAI recommends `gpt-5.5` as the flagship model for complex reasoning and coding and exposes it through Responses API: https://developers.openai.com/api/docs/models
- Structured Outputs provide schema adherence and should replace prompt-only JSON parsing: https://developers.openai.com/api/docs/guides/structured-outputs

## Current Baseline

- `npm run build` currently cannot run because `node_modules` is absent: `sh: next: command not found`.
- `forge` is not installed in this local environment: `zsh: forge: command not found`.
- Several files import `../services/elizaAgent` or `./elizaAgent`, but the repo only has `geminiPortfolioAgent.ts`; this will become a TypeScript blocker after dependencies install.
- Current `TokenizeAI.sol` is ERC-1155 and transfers hours directly from creator to buyer. Uniswap v4 pools require fungible ERC-20 style currencies, so the protocol needs a new `TimeCreditToken` plus `BookingManager`.
- Current primary demo chain is Avalanche Fuji, but official Uniswap v4 testnet deployments listed in the docs include Sepolia and Base Sepolia. Use Base Sepolia as the primary v4 testnet, keep Fuji-only Chainlink KYC as legacy/demo until ported.
- `NEXT_PUBLIC_GEMINI_API_KEY` exposes AI credentials in the browser. Replace browser Gemini calls with server-only OpenAI route handlers.

## Product Decision

This refactor is not "Uniswap as marketplace." The user-facing marketplace is our app plus `BookingManager`. Uniswap v4 is the liquidity layer for `TIME/USDC`. The hook enforces trading-side constraints that depend on booking inventory and trusted quote data.

MVP behavior:

```text
Creator registers provider inventory
Creator mints or allocates ERC-20 TIME credits up to redeemable hours
Buyer swaps USDC to TIME through the TIME/USDC v4 pool
Buyer books a slot by burning or locking TIME in BookingManager
BookingManager tracks booked, completed, cancelled, and disputed states
TimePoolHook checks inventory and signed quote intent during swaps that carry hookData
```

## File Structure

Create:

- `PRODUCT.md`: Product register, users, workflow, anti-goals.
- `DESIGN.md`: Restrained product UI tokens, interaction states, liquid material rules.
- `docs/architecture/uniswap-v4-time-marketplace.md`: Protocol architecture and sequence diagrams.
- `src/app/types/portfolio.ts`: Shared portfolio and tokenization types currently scattered across AI services.
- `src/app/types/time-market.ts`: Provider, quote, booking, pool, and checkout types.
- `src/app/api/ai/_lib/openai.ts`: Server-only OpenAI client factory.
- `src/app/api/ai/_lib/schemas.ts`: JSON schemas for portfolio, tokenization, and assistant responses.
- `src/app/api/ai/portfolio/route.ts`: GPT-5.5 portfolio analysis endpoint.
- `src/app/api/ai/tokenization/route.ts`: GPT-5.5 tokenization strategy endpoint.
- `src/app/api/ai/assistant/route.ts`: GPT-5.5 assistant endpoint.
- `src/app/services/aiClient.ts`: Client-side wrapper around app route handlers.
- `src/app/shared/uniswapV4.ts`: Chain-specific v4 deployment addresses and pool constants.
- `src/app/services/uniswapV4Service.ts`: Quote, Permit2 approval, and Universal Router calldata service.
- `src/app/services/bookingService.ts`: BookingManager read/write service.
- `src/app/components/time-market/BookingMarketplace.tsx`: Replacement marketplace surface.
- `src/app/components/time-market/BookingCheckout.tsx`: Swap, book, and book-with-credits checkout flow.
- `src/app/components/time-market/ProviderInventoryPanel.tsx`: Provider inventory and quote status.
- `src/app/components/time-market/LiquidityPanel.tsx`: v4 pool state and LP entry points.
- `contracts/foundry.toml`: Foundry config for Solidity 0.8.26 and Cancun.
- `contracts/remappings.txt`: v4-core, v4-periphery, OpenZeppelin, forge-std remappings.
- `contracts/src/TimeCreditToken.sol`: ERC-20 time credit token.
- `contracts/src/BookingManager.sol`: Booking, inventory, signed quotes, burn or lock redemption.
- `contracts/src/TimePoolHook.sol`: v4 hook with `beforeSwap` and `afterSwap` only.
- `contracts/src/interfaces/IBookingManager.sol`: Hook-facing booking interface.
- `contracts/src/mocks/MockUSDC.sol`: Local test USDC.
- `contracts/script/DeployBaseSepolia.s.sol`: Deterministic deployment script.
- `contracts/script/MineTimePoolHook.s.sol`: Hook address mining script.
- `contracts/test/BookingManager.t.sol`: Unit tests.
- `contracts/test/TimePoolHook.t.sol`: Hook permission, inventory, and router tests.
- `contracts/test/TimeCreditToken.t.sol`: Mint, burn, cap, and role tests.

Modify:

- `package.json`: add OpenAI, Uniswap v4 SDK, Universal Router SDK, SDK Core, lucide icons, and test/dev tooling.
- `src/app/page.tsx`: replace `marketplace` and `dashboard` children with v4 booking surfaces behind the existing state machine.
- `src/app/components/Marketplace.tsx`: either retire or wrap with `BookingMarketplace` during migration.
- `src/app/components/Dashboard.tsx`: replace ERC-1155 stats with provider inventory, bookings, credits, and LP status.
- `src/app/components/TokenCreation.tsx`: rename mental model from "mint ERC-1155 token" to "publish provider inventory and initialize credit market".
- `src/app/services/geminiPortfolioAgent.ts`: replace with `openaiPortfolioAgent.ts` or keep a compatibility export that calls `aiClient`.
- `src/app/services/tokenizeAgent.ts`: remove direct Gemini REST call and use `/api/ai/tokenization`.
- `src/app/services/marketAnalyzeAgent.ts`: remove `GoogleGenerativeAI`; use GPT-5.5 route for narrative synthesis while preserving Chainlink data fetch.
- `src/app/services/aiAssistantAgent.ts`: replace direct Gemini SDK usage with `/api/ai/assistant`.
- `src/app/utils/localStorage.ts` and `src/app/hooks/useLocalStorage.ts`: import portfolio types from `src/app/types/portfolio.ts`.
- `src/app/shared/constants.ts`: remove public Gemini config, add OpenAI server env names to docs only, add v4 feature flags.
- `src/app/lib/wagmi.ts`: make Base Sepolia and Sepolia the primary v4 chains, keep Fuji only for legacy KYC if still shown.
- `src/app/globals.css`: replace purple-blue gradient defaults with product tokens and restrained material surfaces.
- `README.md`: rewrite architecture, environment variables, and demo instructions.

Delete:

- `eliza-agent/package.json`: no runnable Eliza agent exists and the refactor removes ElizaOS from the product.
- Browser-only Gemini imports after route migration is complete.

## Market And Product Readout

- Competitor-like crypto service marketplaces increasingly emphasize escrow, stablecoin settlement, and trust signals. J4C positions itself as a crypto-native job marketplace with on-chain escrow and USDC/ETH-style payments, which supports making `BookingManager` the product core and treating AMM liquidity as a secondary market, not as the fulfillment system: https://www.j4c.app/
- Friend.tech style "personal token" mechanics show demand for creator-linked assets, but also show the downside of token-only value capture without durable utility. CoinMarketCap's coverage of the shutdown describes large historical fees, declining activity, and creator/admin exit dynamics. A redeemable booking contract is the differentiator: https://coinmarketcap.com/academy/article/social-platform-friendtech-shuts-down-creators-walk-away-with-dollar44m
- Uniswap v4 hooks create real novelty only when they constrain or improve pool execution. Official docs frame hooks as pool lifecycle customization points for swaps, liquidity, fees, and similar pool behavior, so the credible hook wedge here is inventory-aware swapping, not social automation: https://developers.uniswap.org/docs/protocols/v4/concepts/hooks
- Use USDC-denominated quotes in the UI. The pool price can move, so fixed booking prices should come from signed provider or marketplace quotes, then the swap uses slippage controls.

## Design Direction

Register: product UI.

Scene sentence: A creator or buyer is using a wallet-connected marketplace on a laptop during a paid booking flow, with transaction prompts open and real money at risk; the interface should feel calm, technical, and legible under focused desk lighting.

Color strategy: restrained. Use tinted graphite neutrals, jade for confirmed liquidity/inventory, amber for quote expiry and inventory pressure, red only for failed transactions. Avoid the current one-note purple/blue gradient.

Liquid glass adaptation: use subtle material treatment only for transient transaction sheets, top action bars, and pool status overlays. Do not turn every panel into a blur card. On web this means explicit OKLCH surface tokens, low-alpha borders, no heavy backdrop blur on dense tables, and motion under 250 ms.

## Task 1: Dependency And Baseline Repair

**Files:**

- Modify: `package.json`
- Modify: `package-lock.json`

- [ ] **Step 1: Install current dependencies**

Run:

```bash
npm install
```

Expected: `node_modules` exists and `npm run build` can invoke `next`.

- [ ] **Step 2: Capture current build errors**

Run:

```bash
npm run build
```

Expected before code changes: TypeScript fails on missing `src/app/services/elizaAgent` imports or related type issues.

- [ ] **Step 3: Add app dependencies**

Run:

```bash
npm install openai @uniswap/v4-sdk @uniswap/sdk-core @uniswap/universal-router-sdk lucide-react
```

Expected: `package.json` contains:

```json
{
  "dependencies": {
    "openai": "^6.0.0",
    "@uniswap/v4-sdk": "^1.0.0",
    "@uniswap/sdk-core": "^7.0.0",
    "@uniswap/universal-router-sdk": "^4.0.0",
    "lucide-react": "^0.468.0"
  }
}
```

If npm resolves newer compatible versions, keep the lockfile versions npm selects.

- [ ] **Step 4: Commit dependency baseline**

Run:

```bash
git add package.json package-lock.json
git commit -m "chore: add v4 and openai dependencies"
```

## Task 2: Product And Design Context

**Files:**

- Create: `PRODUCT.md`
- Create: `DESIGN.md`
- Create: `docs/architecture/uniswap-v4-time-marketplace.md`

- [ ] **Step 1: Create product context**

Write `PRODUCT.md`:

```markdown
# Time TokenAIzer Product Context

## Register

product

## Product Purpose

Time TokenAIzer lets skilled people publish redeemable time credits, let buyers acquire credits through a Uniswap v4 TIME/USDC pool, and convert those credits into specific bookings through first-party marketplace contracts.

## Primary Users

- Creators who want to sell limited consulting, advisory, or implementation hours.
- Buyers who want an onchain checkout with inventory visibility and booking proof.
- Liquidity providers who want to support a creator's TIME/USDC market.

## Core Workflow

1. Connect wallet.
2. Complete access checks.
3. Build a GPT-5.5 assisted skill and inventory profile.
4. Publish provider inventory.
5. Initialize or join a TIME/USDC v4 pool.
6. Buy TIME credits or use existing credits.
7. Book a slot through BookingManager.
8. Complete, cancel, refund, or dispute the booking.

## Anti-Goals

- Do not present Uniswap v4 hooks as a booking marketplace.
- Do not rely on browser-exposed AI keys.
- Do not oversell more TIME credits than a provider can redeem.
- Do not make AMM price look like a guaranteed fixed service price.
- Do not use decorative crypto gradients as the main product identity.
```

- [ ] **Step 2: Create design context**

Write `DESIGN.md`:

```markdown
# Time TokenAIzer Design Context

## Visual Register

Product UI for wallet-connected booking and liquidity management.

## Scene

A creator or buyer is using a wallet-connected marketplace on a laptop during a paid booking flow, with transaction prompts open and real money at risk; the interface should feel calm, technical, and legible under focused desk lighting.

## Color Strategy

Restrained. Use tinted graphite neutrals, jade for healthy inventory and confirmed transactions, amber for expiring quotes or inventory pressure, and red only for destructive or failed states.

## Tokens

- Background: `oklch(16% 0.01 165)`
- Surface: `oklch(20% 0.012 165)`
- Raised surface: `oklch(25% 0.014 165)`
- Border: `oklch(40% 0.018 165)`
- Text strong: `oklch(94% 0.008 165)`
- Text muted: `oklch(72% 0.012 165)`
- Primary: `oklch(72% 0.13 158)`
- Warning: `oklch(76% 0.14 78)`
- Danger: `oklch(67% 0.17 28)`

## Components

- Buttons use icons from `lucide-react` when the action has a familiar symbol.
- Booking and swap controls expose default, hover, focus, disabled, pending, success, and error states.
- Use segmented controls for payment mode: `Use TIME`, `Swap USDC`, `Swap and book`.
- Use compact status rows for pool, quote, inventory, and wallet readiness.

## Liquid Material Rule

Use subtle material surfaces only for transaction sheets, sticky action bars, and pool status overlays. Avoid decorative blur cards in dense content.
```

- [ ] **Step 3: Create architecture doc**

Write `docs/architecture/uniswap-v4-time-marketplace.md`:

```markdown
# Uniswap v4 Time Marketplace Architecture

## Contract Split

`TimeCreditToken` is a fungible ERC-20 credit where 1e18 units represent 1 hour. `BookingManager` manages provider inventory, quote validity, slot locking, booking lifecycle, cancellation, refund, and completion. `TimePoolHook` attaches to the TIME/USDC pool and checks swap intent against BookingManager without performing booking settlement.

## Main Flow

- Buyer selects provider and slot.
- Frontend requests signed quote.
- Buyer swaps USDC to TIME through Uniswap v4.
- TimePoolHook validates inventory and quote in beforeSwap.
- Universal Router settles swap.
- Buyer calls BookingManager.bookWithCredits.
- BookingManager burns or locks TIME and creates booking.

## Why Booking Is Not In The Hook

Uniswap v4 uses flash accounting. During swap callbacks, intermediate token transfers are not final. Booking settlement requires final TIME ownership, slot locking, and lifecycle state, so BookingManager handles it after swap settlement.

## Primary Testnet

Base Sepolia is primary for v4 integration because official Uniswap v4 deployments exist there. Avalanche Fuji remains legacy KYC and Chainlink Functions demo support until equivalent v4 infrastructure is explicitly deployed.
```

- [ ] **Step 4: Commit docs**

Run:

```bash
git add PRODUCT.md DESIGN.md docs/architecture/uniswap-v4-time-marketplace.md
git commit -m "docs: define v4 time marketplace architecture"
```

## Task 3: Replace Eliza And Gemini With GPT-5.5 Server Routes

**Files:**

- Create: `src/app/types/portfolio.ts`
- Create: `src/app/api/ai/_lib/openai.ts`
- Create: `src/app/api/ai/_lib/schemas.ts`
- Create: `src/app/api/ai/portfolio/route.ts`
- Create: `src/app/api/ai/tokenization/route.ts`
- Create: `src/app/api/ai/assistant/route.ts`
- Create: `src/app/services/aiClient.ts`
- Modify: `src/app/services/geminiPortfolioAgent.ts`
- Modify: `src/app/services/tokenizeAgent.ts`
- Modify: `src/app/services/marketAnalyzeAgent.ts`
- Modify: `src/app/services/aiAssistantAgent.ts`
- Modify: `src/app/hooks/useLocalStorage.ts`
- Modify: `src/app/utils/localStorage.ts`
- Modify: `src/app/shared/constants.ts`
- Delete: `eliza-agent/package.json`

- [ ] **Step 1: Move shared AI types out of agent files**

Create `src/app/types/portfolio.ts`:

```typescript
import { UserAnswers } from '../utils/localStorage';

export interface PortfolioData {
  profileSummary: string;
  skillAssessment: Array<{
    skill: string;
    level: number;
    marketDemand: number;
    insights: string;
  }>;
  projectRecommendations: Array<{
    name: string;
    description: string;
    match: number;
    estimatedBudget: string;
    duration: string;
    requiredSkills: string[];
  }>;
  earningsProjection: {
    weekly: number;
    monthly: number;
    yearly: number;
    optimizationTips: string[];
  };
  timeOptimization: {
    bestWorkingHours: string;
    productivityTips: string[];
    timeManagementAdvice: string;
  };
  careerRoadmap: {
    shortTerm: string[];
    mediumTerm: string[];
    longTerm: string[];
  };
}

export interface PortfolioRequest {
  userAnswers: UserAnswers;
}
```

Then update imports from `../services/elizaAgent`, `./elizaAgent`, and `./services/geminiPortfolioAgent` to use `src/app/types/portfolio.ts`.

- [ ] **Step 2: Add server-only OpenAI client**

Create `src/app/api/ai/_lib/openai.ts`:

```typescript
import 'server-only';
import OpenAI from 'openai';

export const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-5.5';

export function getOpenAIClient() {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not configured');
  }

  return new OpenAI({ apiKey });
}
```

- [ ] **Step 3: Add structured output schemas**

Create `src/app/api/ai/_lib/schemas.ts` with exported JSON schemas for `portfolioSchema`, `tokenizationPlanSchema`, and `assistantResponseSchema`. Each schema must set `additionalProperties: false` on every object and include all required fields that the current UI reads.

Example top-level portfolio schema:

```typescript
export const portfolioSchema = {
  name: 'portfolio_analysis',
  strict: true,
  schema: {
    type: 'object',
    additionalProperties: false,
    required: [
      'profileSummary',
      'skillAssessment',
      'projectRecommendations',
      'earningsProjection',
      'timeOptimization',
      'careerRoadmap'
    ],
    properties: {
      profileSummary: { type: 'string' },
      skillAssessment: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['skill', 'level', 'marketDemand', 'insights'],
          properties: {
            skill: { type: 'string' },
            level: { type: 'number' },
            marketDemand: { type: 'number' },
            insights: { type: 'string' }
          }
        }
      },
      projectRecommendations: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['name', 'description', 'match', 'estimatedBudget', 'duration', 'requiredSkills'],
          properties: {
            name: { type: 'string' },
            description: { type: 'string' },
            match: { type: 'number' },
            estimatedBudget: { type: 'string' },
            duration: { type: 'string' },
            requiredSkills: { type: 'array', items: { type: 'string' } }
          }
        }
      },
      earningsProjection: {
        type: 'object',
        additionalProperties: false,
        required: ['weekly', 'monthly', 'yearly', 'optimizationTips'],
        properties: {
          weekly: { type: 'number' },
          monthly: { type: 'number' },
          yearly: { type: 'number' },
          optimizationTips: { type: 'array', items: { type: 'string' } }
        }
      },
      timeOptimization: {
        type: 'object',
        additionalProperties: false,
        required: ['bestWorkingHours', 'productivityTips', 'timeManagementAdvice'],
        properties: {
          bestWorkingHours: { type: 'string' },
          productivityTips: { type: 'array', items: { type: 'string' } },
          timeManagementAdvice: { type: 'string' }
        }
      },
      careerRoadmap: {
        type: 'object',
        additionalProperties: false,
        required: ['shortTerm', 'mediumTerm', 'longTerm'],
        properties: {
          shortTerm: { type: 'array', items: { type: 'string' } },
          mediumTerm: { type: 'array', items: { type: 'string' } },
          longTerm: { type: 'array', items: { type: 'string' } }
        }
      }
    }
  }
} as const;
```

- [ ] **Step 4: Add portfolio route**

Create `src/app/api/ai/portfolio/route.ts`:

```typescript
import { NextResponse } from 'next/server';
import { getOpenAIClient, OPENAI_MODEL } from '../_lib/openai';
import { portfolioSchema } from '../_lib/schemas';
import { PortfolioRequest } from '../../../types/portfolio';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const body = (await request.json()) as PortfolioRequest;

  if (!body.userAnswers?.name || !Array.isArray(body.userAnswers.skills)) {
    return NextResponse.json({ error: 'Invalid portfolio request' }, { status: 400 });
  }

  const client = getOpenAIClient();
  const response = await client.responses.create({
    model: OPENAI_MODEL,
    reasoning: { effort: 'medium' },
    input: [
      {
        role: 'developer',
        content: 'Create realistic time-credit portfolio analysis for a booking marketplace. Return only schema-valid data.'
      },
      {
        role: 'user',
        content: JSON.stringify(body.userAnswers)
      }
    ],
    text: {
      format: {
        type: 'json_schema',
        ...portfolioSchema
      }
    }
  });

  const output = response.output_text ? JSON.parse(response.output_text) : null;
  return NextResponse.json(output);
}
```

- [ ] **Step 5: Add client AI wrapper**

Create `src/app/services/aiClient.ts`:

```typescript
import { PortfolioData, PortfolioRequest } from '../types/portfolio';

async function postJson<TRequest, TResponse>(url: string, body: TRequest): Promise<TResponse> {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error || `Request failed with ${response.status}`);
  }

  return response.json() as Promise<TResponse>;
}

export const aiClient = {
  generatePortfolio(body: PortfolioRequest) {
    return postJson<PortfolioRequest, PortfolioData>('/api/ai/portfolio', body);
  }
};
```

- [ ] **Step 6: Replace old Gemini implementations**

In `src/app/services/geminiPortfolioAgent.ts`, keep compatibility exports so existing components do not all change at once:

```typescript
import { aiClient } from './aiClient';
import { PortfolioData } from '../types/portfolio';
import { UserAnswers } from '../utils/localStorage';

class OpenAIPortfolioAgent {
  async initialize() {
    return;
  }

  async generatePortfolio(userAnswers: UserAnswers): Promise<PortfolioData> {
    return aiClient.generatePortfolio({ userAnswers });
  }
}

export type { PortfolioData };
export const elizaPortfolioAgent = new OpenAIPortfolioAgent();
```

Then migrate `tokenizeAgent.ts`, `marketAnalyzeAgent.ts`, and `aiAssistantAgent.ts` to call route handlers instead of importing `@google/generative-ai` or using `NEXT_PUBLIC_GEMINI_API_KEY`.

- [ ] **Step 7: Remove browser AI secrets**

In `src/app/shared/constants.ts`, remove:

```typescript
export const AI_CONFIG = {
  GEMINI_API_KEY: process.env.NEXT_PUBLIC_GEMINI_API_KEY || "",
  MODEL_NAME: "gemini-1.5-flash",
  MAX_TOKENS: 8192,
  TEMPERATURE: 0.7
} as const;
```

Replace with:

```typescript
export const AI_CONFIG = {
  MODEL_NAME: 'gpt-5.5',
  MAX_TOKENS: 8192,
  TEMPERATURE: 0.7
} as const;
```

Only server routes may read `OPENAI_API_KEY`.

- [ ] **Step 8: Delete Eliza package**

Run:

```bash
git rm eliza-agent/package.json
```

- [ ] **Step 9: Build**

Run:

```bash
npm run build
```

Expected: no imports from `elizaAgent`, no imports from `@google/generative-ai`, and no references to `NEXT_PUBLIC_GEMINI_API_KEY`.

- [ ] **Step 10: Commit AI migration**

Run:

```bash
git add src/app package.json package-lock.json README.md
git add -u eliza-agent/package.json
git commit -m "refactor: replace eliza gemini agents with gpt routes"
```

## Task 4: Foundry Protocol Workspace

**Files:**

- Create: `contracts/foundry.toml`
- Create: `contracts/remappings.txt`
- Create: `contracts/src/TimeCreditToken.sol`
- Create: `contracts/src/BookingManager.sol`
- Create: `contracts/src/interfaces/IBookingManager.sol`
- Create: `contracts/src/TimePoolHook.sol`
- Create: `contracts/src/mocks/MockUSDC.sol`

- [ ] **Step 1: Install Foundry locally**

Run:

```bash
curl -L https://foundry.paradigm.xyz | bash
foundryup
forge --version
```

Expected: `forge --version` prints a Foundry version.

- [ ] **Step 2: Initialize contracts workspace**

Run:

```bash
cd contracts
forge init --force
forge install Uniswap/v4-core
forge install Uniswap/v4-periphery
forge install OpenZeppelin/openzeppelin-contracts
forge install foundry-rs/forge-std
forge remappings > remappings.txt
```

Expected: `contracts/lib` contains v4-core, v4-periphery, openzeppelin-contracts, and forge-std.

- [ ] **Step 3: Set Foundry config**

Write `contracts/foundry.toml`:

```toml
[profile.default]
src = "src"
out = "out"
libs = ["lib"]
solc_version = "0.8.26"
evm_version = "cancun"
optimizer = true
optimizer_runs = 200
ffi = true

[fmt]
line_length = 100
tab_width = 4
bracket_spacing = true
```

- [ ] **Step 4: Create ERC-20 time credit**

Create `contracts/src/TimeCreditToken.sol` with:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC20Burnable} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";

contract TimeCreditToken is ERC20, ERC20Burnable, AccessControl {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant BOOKING_ROLE = keccak256("BOOKING_ROLE");

    uint256 public immutable maxSupply;

    error MaxSupplyExceeded();

    constructor(address admin, uint256 _maxSupply) ERC20("Time Credit", "TIME") {
        maxSupply = _maxSupply;
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(MINTER_ROLE, admin);
    }

    function mint(address to, uint256 amount) external onlyRole(MINTER_ROLE) {
        if (totalSupply() + amount > maxSupply) revert MaxSupplyExceeded();
        _mint(to, amount);
    }

    function burnFromBooking(address account, uint256 amount) external onlyRole(BOOKING_ROLE) {
        _burn(account, amount);
    }
}
```

- [ ] **Step 5: Create BookingManager**

Create `contracts/src/BookingManager.sol` with provider inventory, EIP-712 signed quotes, slot uniqueness, and booking lifecycle. The first implementation must burn TIME on booking and record status:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {EIP712} from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {TimeCreditToken} from "./TimeCreditToken.sol";

contract BookingManager is AccessControl, EIP712, ReentrancyGuard {
    bytes32 public constant QUOTE_SIGNER_ROLE = keccak256("QUOTE_SIGNER_ROLE");
    bytes32 public constant PROVIDER_MANAGER_ROLE = keccak256("PROVIDER_MANAGER_ROLE");
    bytes32 public constant QUOTE_TYPEHASH = keccak256(
        "BookingQuote(bytes32 quoteId,address buyer,uint256 providerId,uint256 hoursWad,uint256 slotId,uint256 expiresAt,uint256 nonce)"
    );

    enum BookingStatus {
        None,
        Booked,
        Completed,
        Cancelled,
        Disputed
    }

    struct Provider {
        address owner;
        uint256 availableHoursWad;
        bool paused;
    }

    struct Booking {
        address buyer;
        uint256 providerId;
        uint256 hoursWad;
        uint256 slotId;
        BookingStatus status;
    }

    struct BookingQuote {
        bytes32 quoteId;
        address buyer;
        uint256 providerId;
        uint256 hoursWad;
        uint256 slotId;
        uint256 expiresAt;
        uint256 nonce;
        bytes signature;
    }

    TimeCreditToken public immutable timeToken;
    uint256 public nextProviderId = 1;
    uint256 public nextBookingId = 1;

    mapping(uint256 => Provider) public providers;
    mapping(uint256 => Booking) public bookings;
    mapping(uint256 => mapping(uint256 => bool)) public slotTaken;
    mapping(bytes32 => bool) public usedQuotes;

    error ProviderPaused();
    error InsufficientInventory();
    error SlotTaken();
    error QuoteExpired();
    error QuoteAlreadyUsed();
    error InvalidQuote();
    error NotProviderOwner();

    event ProviderRegistered(uint256 indexed providerId, address indexed owner, uint256 hoursWad);
    event ProviderInventoryUpdated(uint256 indexed providerId, uint256 hoursWad, bool paused);
    event Booked(uint256 indexed bookingId, address indexed buyer, uint256 indexed providerId, uint256 slotId, uint256 hoursWad);
    event BookingCompleted(uint256 indexed bookingId);

    constructor(TimeCreditToken _timeToken, address admin) EIP712("TimeTokenAIzerBooking", "1") {
        timeToken = _timeToken;
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(QUOTE_SIGNER_ROLE, admin);
        _grantRole(PROVIDER_MANAGER_ROLE, admin);
    }

    function registerProvider(address owner, uint256 hoursWad) external onlyRole(PROVIDER_MANAGER_ROLE) returns (uint256 providerId) {
        providerId = nextProviderId++;
        providers[providerId] = Provider({owner: owner, availableHoursWad: hoursWad, paused: false});
        emit ProviderRegistered(providerId, owner, hoursWad);
    }

    function setProviderInventory(uint256 providerId, uint256 hoursWad, bool paused) external {
        Provider storage provider = providers[providerId];
        if (msg.sender != provider.owner && !hasRole(PROVIDER_MANAGER_ROLE, msg.sender)) revert NotProviderOwner();
        provider.availableHoursWad = hoursWad;
        provider.paused = paused;
        emit ProviderInventoryUpdated(providerId, hoursWad, paused);
    }

    function availableHours(uint256 providerId) external view returns (uint256) {
        return providers[providerId].availableHoursWad;
    }

    function isQuoteValid(
        bytes32 quoteId,
        address buyer,
        uint256 providerId,
        uint256 hoursWad,
        uint256 slotId,
        uint256 expiresAt,
        uint256 nonce,
        bytes calldata signature
    ) public view returns (bool) {
        if (usedQuotes[quoteId] || block.timestamp > expiresAt) return false;
        Provider memory provider = providers[providerId];
        if (provider.paused || provider.availableHoursWad < hoursWad || slotTaken[providerId][slotId]) return false;

        bytes32 digest = _hashTypedDataV4(
            keccak256(abi.encode(QUOTE_TYPEHASH, quoteId, buyer, providerId, hoursWad, slotId, expiresAt, nonce))
        );

        address signer = ECDSA.recover(digest, signature);
        return hasRole(QUOTE_SIGNER_ROLE, signer);
    }

    function bookWithCredits(BookingQuote calldata quote) external nonReentrant returns (uint256 bookingId) {
        if (usedQuotes[quote.quoteId]) revert QuoteAlreadyUsed();
        if (block.timestamp > quote.expiresAt) revert QuoteExpired();
        if (!isQuoteValid(quote.quoteId, msg.sender, quote.providerId, quote.hoursWad, quote.slotId, quote.expiresAt, quote.nonce, quote.signature)) {
            revert InvalidQuote();
        }

        Provider storage provider = providers[quote.providerId];
        if (provider.paused) revert ProviderPaused();
        if (provider.availableHoursWad < quote.hoursWad) revert InsufficientInventory();
        if (slotTaken[quote.providerId][quote.slotId]) revert SlotTaken();

        usedQuotes[quote.quoteId] = true;
        provider.availableHoursWad -= quote.hoursWad;
        slotTaken[quote.providerId][quote.slotId] = true;
        timeToken.burnFromBooking(msg.sender, quote.hoursWad);

        bookingId = nextBookingId++;
        bookings[bookingId] = Booking({
            buyer: msg.sender,
            providerId: quote.providerId,
            hoursWad: quote.hoursWad,
            slotId: quote.slotId,
            status: BookingStatus.Booked
        });

        emit Booked(bookingId, msg.sender, quote.providerId, quote.slotId, quote.hoursWad);
    }
}
```

- [ ] **Step 6: Create hook-facing interface**

Create `contracts/src/interfaces/IBookingManager.sol`:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

interface IBookingManager {
    function availableHours(uint256 providerId) external view returns (uint256);

    function isQuoteValid(
        bytes32 quoteId,
        address buyer,
        uint256 providerId,
        uint256 hoursWad,
        uint256 slotId,
        uint256 expiresAt,
        uint256 nonce,
        bytes calldata signature
    ) external view returns (bool);
}
```

- [ ] **Step 7: Create TimePoolHook with no delta return permissions**

Create `contracts/src/TimePoolHook.sol`:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {BaseHook} from "v4-periphery/src/utils/BaseHook.sol";
import {Hooks} from "v4-core/src/libraries/Hooks.sol";
import {IPoolManager} from "v4-core/src/interfaces/IPoolManager.sol";
import {PoolKey} from "v4-core/src/types/PoolKey.sol";
import {PoolId, PoolIdLibrary} from "v4-core/src/types/PoolId.sol";
import {BalanceDelta} from "v4-core/src/types/BalanceDelta.sol";
import {BeforeSwapDelta, BeforeSwapDeltaLibrary} from "v4-core/src/types/BeforeSwapDelta.sol";
import {SwapParams} from "v4-core/src/types/PoolOperation.sol";
import {IBookingManager} from "./interfaces/IBookingManager.sol";

contract TimePoolHook is BaseHook {
    using PoolIdLibrary for PoolKey;

    struct HookData {
        address buyer;
        uint256 providerId;
        uint256 hoursWad;
        uint256 slotId;
        bytes32 quoteId;
        uint256 expiresAt;
        uint256 nonce;
        bytes signature;
    }

    IBookingManager public immutable booking;
    address public owner;

    mapping(PoolId => bool) public allowedPool;
    mapping(address => bool) public allowedRouter;

    error NotOwner();
    error PoolNotAllowed();
    error RouterNotAllowed();
    error MissingBuyer();
    error InvalidQuote();
    error InsufficientInventory();

    event PoolAllowed(PoolId indexed poolId, bool allowed);
    event RouterAllowed(address indexed router, bool allowed);
    event TimeSwapObserved(PoolId indexed poolId, address indexed router, address indexed buyer, bytes32 quoteId);

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    constructor(IPoolManager _poolManager, IBookingManager _booking, address _owner) BaseHook(_poolManager) {
        booking = _booking;
        owner = _owner;
    }

    function setAllowedPool(PoolKey calldata key, bool allowed) external onlyOwner {
        PoolId poolId = key.toId();
        allowedPool[poolId] = allowed;
        emit PoolAllowed(poolId, allowed);
    }

    function setAllowedRouter(address router, bool allowed) external onlyOwner {
        allowedRouter[router] = allowed;
        emit RouterAllowed(router, allowed);
    }

    function getHookPermissions() public pure override returns (Hooks.Permissions memory) {
        return Hooks.Permissions({
            beforeInitialize: false,
            afterInitialize: false,
            beforeAddLiquidity: false,
            afterAddLiquidity: false,
            beforeRemoveLiquidity: false,
            afterRemoveLiquidity: false,
            beforeSwap: true,
            afterSwap: true,
            beforeDonate: false,
            afterDonate: false,
            beforeSwapReturnDelta: false,
            afterSwapReturnDelta: false,
            afterAddLiquidityReturnDelta: false,
            afterRemoveLiquidityReturnDelta: false
        });
    }

    function _beforeSwap(address sender, PoolKey calldata key, SwapParams calldata, bytes calldata hookData)
        internal
        override
        returns (bytes4, BeforeSwapDelta, uint24)
    {
        if (!allowedPool[key.toId()]) revert PoolNotAllowed();
        if (!allowedRouter[sender]) revert RouterNotAllowed();

        if (hookData.length > 0) {
            HookData memory data = abi.decode(hookData, (HookData));
            if (data.buyer == address(0)) revert MissingBuyer();
            if (booking.availableHours(data.providerId) < data.hoursWad) revert InsufficientInventory();
            if (
                !booking.isQuoteValid(
                    data.quoteId,
                    data.buyer,
                    data.providerId,
                    data.hoursWad,
                    data.slotId,
                    data.expiresAt,
                    data.nonce,
                    data.signature
                )
            ) revert InvalidQuote();
        }

        return (BaseHook.beforeSwap.selector, BeforeSwapDeltaLibrary.ZERO_DELTA, 0);
    }

    function _afterSwap(address sender, PoolKey calldata key, SwapParams calldata, BalanceDelta, bytes calldata hookData)
        internal
        override
        returns (bytes4, int128)
    {
        address buyer = address(0);
        bytes32 quoteId = bytes32(0);

        if (hookData.length > 0) {
            HookData memory data = abi.decode(hookData, (HookData));
            buyer = data.buyer;
            quoteId = data.quoteId;
        }

        emit TimeSwapObserved(key.toId(), sender, buyer, quoteId);
        return (BaseHook.afterSwap.selector, 0);
    }
}
```

- [ ] **Step 8: Compile contracts**

Run:

```bash
cd contracts
forge build
```

Expected: compiler success.

- [ ] **Step 9: Commit protocol scaffolding**

Run:

```bash
git add contracts
git commit -m "feat: add time credit booking contracts and v4 hook"
```

## Task 5: Contract Tests And Hook Security Gates

**Files:**

- Create: `contracts/test/TimeCreditToken.t.sol`
- Create: `contracts/test/BookingManager.t.sol`
- Create: `contracts/test/TimePoolHook.t.sol`
- Modify: `contracts/src/BookingManager.sol`
- Modify: `contracts/src/TimePoolHook.sol`

- [ ] **Step 1: Test credit mint cap and booking burn**

Create `contracts/test/TimeCreditToken.t.sol` with tests:

```solidity
function testMintRespectsMaxSupply() public {
    TimeCreditToken token = new TimeCreditToken(address(this), 100 ether);
    token.mint(address(0xBEEF), 100 ether);
    vm.expectRevert(TimeCreditToken.MaxSupplyExceeded.selector);
    token.mint(address(0xBEEF), 1);
}

function testOnlyBookingRoleCanBurnFromBooking() public {
    TimeCreditToken token = new TimeCreditToken(address(this), 100 ether);
    token.mint(address(0xBEEF), 10 ether);
    vm.expectRevert();
    token.burnFromBooking(address(0xBEEF), 1 ether);
}
```

- [ ] **Step 2: Test quote validation and no overbooking**

Create `contracts/test/BookingManager.t.sol` with tests covering:

```solidity
function testBookWithCreditsBurnsTimeAndConsumesInventory() public;
function testCannotBookTakenSlot() public;
function testCannotBookExpiredQuote() public;
function testCannotBookMoreThanProviderInventory() public;
function testCannotReplayQuote() public;
function testProviderCanPauseInventory() public;
```

Each test must assert balance changes, `availableHoursWad`, `slotTaken`, and booking status.

- [ ] **Step 3: Test hook permissions**

Create `contracts/test/TimePoolHook.t.sol` with:

```solidity
function testHookPermissionsOnlyBeforeAndAfterSwap() public {
    Hooks.Permissions memory permissions = hook.getHookPermissions();
    assertTrue(permissions.beforeSwap);
    assertTrue(permissions.afterSwap);
    assertFalse(permissions.beforeSwapReturnDelta);
    assertFalse(permissions.afterSwapReturnDelta);
    assertFalse(permissions.beforeAddLiquidity);
    assertFalse(permissions.beforeRemoveLiquidity);
}
```

- [ ] **Step 4: Test hook access control**

Add tests:

```solidity
function testBeforeSwapRevertsForUnknownPool() public;
function testBeforeSwapRevertsForUnknownRouter() public;
function testBeforeSwapRevertsForInvalidQuote() public;
function testBeforeSwapReturnsZeroDeltaForValidQuote() public;
```

Expected: valid quote returns `BeforeSwapDeltaLibrary.ZERO_DELTA` and fee override `0`.

- [ ] **Step 5: Add fuzz tests for booking invariants**

Add fuzz tests:

```solidity
function testFuzzCannotReduceInventoryBelowZero(uint96 inventory, uint96 requested) public;
function testFuzzQuoteHoursMustBeCoveredByInventory(uint96 inventory, uint96 requested) public;
```

Expected: no successful booking ever makes inventory negative; requested hours over inventory always revert.

- [ ] **Step 6: Run tests and gas snapshot**

Run:

```bash
cd contracts
forge test -vvv
forge snapshot --match-contract TimePoolHookTest
```

Expected: tests pass and `beforeSwap` path stays under 50,000 gas for valid quotes.

- [ ] **Step 7: Commit tests**

Run:

```bash
git add contracts/test contracts/src
git commit -m "test: cover booking invariants and hook gates"
```

## Task 6: v4 Frontend Service Layer

**Files:**

- Create: `src/app/types/time-market.ts`
- Create: `src/app/shared/uniswapV4.ts`
- Create: `src/app/services/uniswapV4Service.ts`
- Create: `src/app/services/bookingService.ts`
- Modify: `src/app/shared/constants.ts`
- Modify: `src/app/lib/wagmi.ts`

- [ ] **Step 1: Add time market types**

Create `src/app/types/time-market.ts`:

```typescript
export type BookingStatus = 'none' | 'booked' | 'completed' | 'cancelled' | 'disputed';

export interface ProviderInventory {
  providerId: string;
  owner: `0x${string}`;
  serviceName: string;
  availableHoursWad: bigint;
  paused: boolean;
}

export interface BookingQuote {
  quoteId: `0x${string}`;
  buyer: `0x${string}`;
  providerId: bigint;
  hoursWad: bigint;
  slotId: bigint;
  expiresAt: bigint;
  nonce: bigint;
  signature: `0x${string}`;
}

export interface V4PoolKeyConfig {
  currency0: `0x${string}`;
  currency1: `0x${string}`;
  fee: number;
  tickSpacing: number;
  hooks: `0x${string}`;
}

export interface SwapQuoteResult {
  amountIn: bigint;
  amountOutMinimum: bigint;
  expectedAmountOut: bigint;
  routeDescription: string;
}
```

- [ ] **Step 2: Add official v4 deployments**

Create `src/app/shared/uniswapV4.ts`:

```typescript
import { baseSepolia, sepolia } from 'wagmi/chains';

export const PERMIT2_ADDRESS = '0x000000000022D473030F116dDEE9F6B43aC78BA3' as const;

export const UNISWAP_V4_DEPLOYMENTS = {
  [sepolia.id]: {
    poolManager: '0xE03A1074c86CFeDd5C142C4F04F1a1536e203543',
    universalRouter: '0x3A9D48AB9751398BbFa63ad67599Bb04e4BdF98b',
    positionManager: '0x429ba70129df741B2Ca2a85BC3A2a3328e5c09b4',
    stateView: '0xe1dd9c3fa50edb962e442f60dfbc432e24537e4c',
    quoter: '0x61b3f2011a92d183c7dbadbda940a7555ccf9227',
    permit2: PERMIT2_ADDRESS
  },
  [baseSepolia.id]: {
    poolManager: '0x05E73354cFDd6745C338b50BcFDfA3Aa6fA03408',
    universalRouter: '0x492e6456d9528771018deb9e87ef7750ef184104',
    positionManager: '0x4b2c77d209d3405f41a037ec6c77f7f5b8e2ca80',
    stateView: '0x571291b572ed32ce6751a2cb2486ebee8defb9b4',
    quoter: '0x4a6513c898fe1b2d0e78d3b0e0a4a151589b1cba',
    permit2: PERMIT2_ADDRESS
  }
} as const;

export function getV4Deployment(chainId: number) {
  const deployment = UNISWAP_V4_DEPLOYMENTS[chainId as keyof typeof UNISWAP_V4_DEPLOYMENTS];
  if (!deployment) {
    throw new Error(`Uniswap v4 is not configured for chain ${chainId}`);
  }
  return deployment;
}
```

- [ ] **Step 3: Add v4 service methods**

Create `src/app/services/uniswapV4Service.ts` with methods:

```typescript
export class UniswapV4Service {
  buildHookData(quote: BookingQuote): `0x${string}`;
  buildExactInputSingle(params: {
    chainId: number;
    poolKey: V4PoolKeyConfig;
    zeroForOne: boolean;
    amountIn: bigint;
    amountOutMinimum: bigint;
    hookData: `0x${string}`;
  }): { commands: `0x${string}`; inputs: `0x${string}`[]; deadline: bigint; value: bigint };
  quoteExactInputSingle(params: {
    chainId: number;
    poolKey: V4PoolKeyConfig;
    zeroForOne: boolean;
    amountIn: bigint;
    hookData: `0x${string}`;
  }): Promise<SwapQuoteResult>;
  ensurePermit2Approval(params: {
    token: `0x${string}`;
    chainId: number;
    amount: bigint;
    spender: `0x${string}`;
  }): Promise<`0x${string}` | null>;
}
```

Implementation requirements:

- Use `V4Planner` and `RoutePlanner`.
- Use Universal Router `execute(bytes commands, bytes[] inputs, uint256 deadline)`.
- Use `SETTLE_ALL` for input currency and `TAKE_ALL` for output currency.
- Use Permit2 approval for ERC-20 input tokens.
- Never call `PoolManager.swap` directly from the frontend.

- [ ] **Step 4: Add BookingManager service**

Create `src/app/services/bookingService.ts` with:

```typescript
export class BookingService {
  async getProviderInventory(providerId: bigint): Promise<ProviderInventory>;
  async getQuote(params: {
    providerId: bigint;
    buyer: `0x${string}`;
    hoursWad: bigint;
    slotId: bigint;
  }): Promise<BookingQuote>;
  async bookWithCredits(quote: BookingQuote): Promise<`0x${string}`>;
  async registerProvider(params: {
    owner: `0x${string}`;
    hoursWad: bigint;
  }): Promise<`0x${string}`>;
}
```

For the first implementation, `getQuote` may call a local route `/api/booking/quote` that signs quotes with a server-side key on testnet. Do not sign quotes in the browser.

- [ ] **Step 5: Update chain support**

Modify `src/app/lib/wagmi.ts`:

```typescript
export const v4SupportedChains = [baseSepolia, sepolia] as const;
export const legacyKycChains = [avalancheFuji] as const;
export const supportedChains = [baseSepolia, sepolia, avalancheFuji, mainnet, base] as const;
export const defaultChain = baseSepolia;
```

Modify `isSupportedChain` to accept Base Sepolia and Sepolia for the v4 marketplace. Show a separate legacy KYC warning for Fuji-only features.

- [ ] **Step 6: Build**

Run:

```bash
npm run build
```

Expected: TypeScript passes, even if contract addresses are env placeholders before deployment.

- [ ] **Step 7: Commit frontend service layer**

Run:

```bash
git add src/app/types src/app/shared src/app/services src/app/lib
git commit -m "feat: add uniswap v4 booking service layer"
```

## Task 7: Replace Marketplace UX With Booking And Liquidity Flow

**Files:**

- Create: `src/app/components/time-market/BookingMarketplace.tsx`
- Create: `src/app/components/time-market/BookingCheckout.tsx`
- Create: `src/app/components/time-market/ProviderInventoryPanel.tsx`
- Create: `src/app/components/time-market/LiquidityPanel.tsx`
- Modify: `src/app/components/Marketplace.tsx`
- Modify: `src/app/components/Dashboard.tsx`
- Modify: `src/app/components/TokenCreation.tsx`
- Modify: `src/app/components/NavigationHeader.tsx`
- Modify: `src/app/page.tsx`
- Modify: `src/app/globals.css`

- [ ] **Step 1: Replace global surface tokens**

Modify `src/app/globals.css`:

```css
@import "tailwindcss";

:root {
  --background: oklch(16% 0.01 165);
  --foreground: oklch(94% 0.008 165);
  --surface: oklch(20% 0.012 165);
  --surface-raised: oklch(25% 0.014 165);
  --border: oklch(40% 0.018 165);
  --muted: oklch(72% 0.012 165);
  --primary: oklch(72% 0.13 158);
  --warning: oklch(76% 0.14 78);
  --danger: oklch(67% 0.17 28);
}

body {
  background: var(--background);
  color: var(--foreground);
  font-family: var(--font-inter), system-ui, sans-serif;
}

.protocol-shell {
  min-height: 100vh;
  background:
    linear-gradient(180deg, oklch(18% 0.012 165), var(--background) 34rem),
    var(--background);
}

.material-panel {
  background: color-mix(in oklch, var(--surface-raised) 88%, transparent);
  border: 1px solid var(--border);
  border-radius: 8px;
}

.transaction-sheet {
  background: color-mix(in oklch, var(--surface-raised) 82%, transparent);
  border: 1px solid color-mix(in oklch, var(--primary) 30%, var(--border));
  border-radius: 8px;
  backdrop-filter: blur(14px);
}
```

- [ ] **Step 2: Create BookingMarketplace layout**

Create `BookingMarketplace.tsx` with four zones:

```text
Top action bar: wallet, chain, provider publish action
Left rail: provider inventory filters
Main table/list: providers and available hours
Right panel: selected provider quote and checkout
```

Use `lucide-react` icons: `CalendarClock`, `Coins`, `ShieldCheck`, `Activity`, `CircleAlert`.

- [ ] **Step 3: Create BookingCheckout**

`BookingCheckout.tsx` must support:

- `Use TIME`: directly call `BookingService.bookWithCredits`.
- `Swap USDC`: call `UniswapV4Service` for swap only.
- `Swap and book`: for MVP, run swap then booking as two explicit transaction steps with a confirmation line that booking is not complete until step 2 confirms.

Visible states:

```text
Wallet disconnected
Wrong network
Quote loading
Quote expired
Inventory insufficient
Permit2 approval required
Swap pending
Booking pending
Booking confirmed
Swap confirmed but booking failed
```

- [ ] **Step 4: Convert Marketplace wrapper**

Modify `src/app/components/Marketplace.tsx` so its default export renders:

```typescript
import BookingMarketplace from './time-market/BookingMarketplace';

export default function Marketplace(props: MarketplaceProps) {
  return <BookingMarketplace {...props} />;
}
```

Keep the old implementation in git history only, not in dead code.

- [ ] **Step 5: Update navigation copy**

Modify `NavigationHeader.tsx` labels:

```typescript
{ id: 'marketplace', label: 'Book', icon: 'calendar-clock' }
{ id: 'dashboard', label: 'Portfolio', icon: 'layout-dashboard' }
```

Remove emoji labels from navigation and action buttons.

- [ ] **Step 6: Build and visual check**

Run:

```bash
npm run build
npm run dev
```

Open `http://localhost:3000` and verify:

- no text overlaps at 390px, 768px, and 1440px widths
- wallet and chain warnings are visible
- checkout buttons do not resize when loading text changes
- focus rings are visible
- the app no longer reads as purple-blue gradient crypto landing page

- [ ] **Step 7: Commit UI refactor**

Run:

```bash
git add src/app/components src/app/page.tsx src/app/globals.css
git commit -m "feat: add v4 booking marketplace UI"
```

## Task 8: Deployment Scripts And Testnet Wiring

**Files:**

- Create: `contracts/script/MineTimePoolHook.s.sol`
- Create: `contracts/script/DeployBaseSepolia.s.sol`
- Create: `src/app/abi/BookingManager.abi.ts`
- Create: `src/app/abi/TimeCreditToken.abi.ts`
- Create: `src/app/abi/TimePoolHook.abi.ts`
- Modify: `src/app/shared/constants.ts`
- Modify: `.env.example`
- Modify: `README.md`

- [ ] **Step 1: Mine hook address**

Create `contracts/script/MineTimePoolHook.s.sol` using `HookMiner.find` with flags:

```solidity
uint160 flags = uint160(Hooks.BEFORE_SWAP_FLAG | Hooks.AFTER_SWAP_FLAG);
```

Expected: mined address low bits match before/after swap permissions and no delta return flags.

- [ ] **Step 2: Deploy to Base Sepolia**

Create `contracts/script/DeployBaseSepolia.s.sol` to deploy:

```text
MockUSDC or configured test USDC
TimeCreditToken
BookingManager
TimePoolHook at mined address
Grant TimeCreditToken BOOKING_ROLE to BookingManager
Grant quote signer role
Allow Universal Router as hook router
Initialize TIME/USDC pool with hook address
```

Run:

```bash
cd contracts
forge script script/DeployBaseSepolia.s.sol --rpc-url "$BASE_SEPOLIA_RPC" --private-key "$DEPLOYER_PRIVATE_KEY" --broadcast --verify
```

- [ ] **Step 3: Update frontend addresses**

Add to `src/app/shared/constants.ts`:

```typescript
export const TIME_MARKET_CONTRACTS = {
  [BASE_SEPOLIA_CHAIN_ID]: {
    timeCreditToken: process.env.NEXT_PUBLIC_TIME_CREDIT_TOKEN_BASE_SEPOLIA as `0x${string}`,
    bookingManager: process.env.NEXT_PUBLIC_BOOKING_MANAGER_BASE_SEPOLIA as `0x${string}`,
    timePoolHook: process.env.NEXT_PUBLIC_TIME_POOL_HOOK_BASE_SEPOLIA as `0x${string}`,
    usdc: process.env.NEXT_PUBLIC_USDC_BASE_SEPOLIA as `0x${string}`
  }
} as const;
```

- [ ] **Step 4: Add env example**

Create or update `.env.example`:

```dotenv
OPENAI_API_KEY=
OPENAI_MODEL=gpt-5.5
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=
BASE_SEPOLIA_RPC=
SEPOLIA_RPC=
DEPLOYER_PRIVATE_KEY=
QUOTE_SIGNER_PRIVATE_KEY=
NEXT_PUBLIC_TIME_CREDIT_TOKEN_BASE_SEPOLIA=
NEXT_PUBLIC_BOOKING_MANAGER_BASE_SEPOLIA=
NEXT_PUBLIC_TIME_POOL_HOOK_BASE_SEPOLIA=
NEXT_PUBLIC_USDC_BASE_SEPOLIA=
```

- [ ] **Step 5: Build and smoke test**

Run:

```bash
npm run build
```

Expected: app compiles with deployed address env vars or explicit dev placeholders that disable write actions.

- [ ] **Step 6: Commit deployment wiring**

Run:

```bash
git add contracts/script src/app/abi src/app/shared/constants.ts .env.example README.md
git commit -m "feat: wire base sepolia v4 deployments"
```

## Task 9: Documentation And Security Review

**Files:**

- Modify: `README.md`
- Create: `docs/security/time-pool-hook-review.md`
- Create: `docs/runbooks/testnet-booking-flow.md`

- [ ] **Step 1: Rewrite README positioning**

README must say:

```text
Time TokenAIzer is a GPT-5.5 assisted marketplace for redeemable time credits.
BookingManager owns booking lifecycle.
Uniswap v4 provides TIME/USDC liquidity.
TimePoolHook validates inventory-aware swap intent.
ElizaOS and Gemini have been removed.
```

- [ ] **Step 2: Add security review**

Create `docs/security/time-pool-hook-review.md` with:

```markdown
# TimePoolHook Security Review

## Enabled Permissions

- beforeSwap: true
- afterSwap: true
- beforeSwapReturnDelta: false
- afterSwapReturnDelta: false

## Explicit Non-Goals

- No custom curve.
- No hook-owned liquidity.
- No return delta.
- No booking settlement in callbacks.
- No unbounded loops.

## Required Checks

- Pool allowlist.
- Router allowlist.
- EIP-712 quote validation through BookingManager.
- Inventory check before swap.
- Foundry unit tests.
- Fuzz tests for overbooking.
- Gas snapshot for beforeSwap.
```

- [ ] **Step 3: Add runbook**

Create `docs/runbooks/testnet-booking-flow.md` with a deterministic testnet demo:

```text
1. Connect Base Sepolia wallet.
2. Mint test USDC.
3. Register provider inventory.
4. Mint bounded TIME supply.
5. Initialize TIME/USDC v4 pool.
6. Add liquidity.
7. Generate booking quote.
8. Swap USDC to TIME with hookData.
9. Book with TIME.
10. Confirm booking appears in dashboard.
```

- [ ] **Step 4: Run final checks**

Run:

```bash
npm run build
cd contracts && forge test -vvv
```

Expected: frontend build passes and contracts test suite passes.

- [ ] **Step 5: Commit docs**

Run:

```bash
git add README.md docs/security docs/runbooks
git commit -m "docs: document v4 booking security model"
```

## Execution Order

1. Task 1 fixes local dependency baseline.
2. Task 2 pins product/design/architecture context.
3. Task 3 removes Eliza/Gemini and makes AI server-side.
4. Tasks 4 and 5 build the protocol core and security tests.
5. Task 6 integrates v4 app services.
6. Task 7 changes the product UI.
7. Task 8 deploys and wires Base Sepolia.
8. Task 9 documents operational and security posture.

## Out Of Scope For First Refactor

- Creator/platform hook fee using `afterSwapReturnDelta`.
- Dynamic LP fee override.
- Custom accounting.
- Atomic custom `SwapAndBookRouter`.
- Dispute arbitration beyond status tracking.
- Cross-chain inventory.
- Production KYC replacement for the existing Fuji demo.

These are intentionally excluded because they raise hook risk, accounting complexity, or legal/product scope. Add them only after the simple hook has tests, a gas profile, and a testnet pool.

## Self-Review

- Spec coverage: covers Uniswap v4 hook implementation, BookingManager separation, ERC-20 TIME credits, GPT-5.5 migration, Eliza removal, frontend redesign, security tests, and deployment wiring.
- Placeholder scan: no task uses TBD or generic "handle edge cases" language. Deferred items are named explicitly in out-of-scope.
- Type consistency: `PortfolioData`, `BookingQuote`, `ProviderInventory`, `V4PoolKeyConfig`, and contract names are consistent across tasks.
- Security consistency: first hook enables only `beforeSwap` and `afterSwap`, never return-delta flags.
- Design consistency: product register, restrained palette, and limited liquid material usage are captured before UI implementation.
