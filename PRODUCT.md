# Time TokenAIzer Product Context

## Register

product

## Product Purpose

Time TokenAIzer is a wallet-connected marketplace for redeemable professional time. It lets skilled people publish limited provider inventory, lets buyers acquire fungible `TIME` credits through a Uniswap v4 `TIME/USDC` pool, and converts those credits into specific bookings through first-party marketplace contracts.

The product core is `BookingManager`. It owns provider inventory, quote validity, slot locking, booking lifecycle, cancellation, refund, completion, and dispute state. Uniswap v4 is the liquidity layer for acquiring or exiting `TIME`; it is not the marketplace of record and it does not fulfill service delivery.

## Primary Users

- Creators who want to sell limited consulting, advisory, coaching, implementation, or review hours without overselling their redeemable capacity.
- Buyers who want onchain checkout, visible inventory, quote clarity, and booking proof before committing real money.
- Liquidity providers who want to support a creator's `TIME/USDC` market while understanding that AMM price is separate from fixed booking terms.
- Operators and future agents who need a clear boundary between marketplace settlement, token accounting, and liquidity infrastructure.

## Product Principles

- Booking state is first-party state. Every successful booking must be represented in `BookingManager`.
- `TIME` credits are redeemable utility, not an abstract social token. A credit must map to real provider capacity.
- AMM liquidity improves acquisition and price discovery, but it cannot guarantee a service price or reserve a slot.
- Inventory and quote checks must be explicit. The UI should never imply that a pool swap alone creates a booking.
- AI assists profile and inventory setup, but server-side contracts and signed quotes are the source of truth.

## Core Workflow

1. Connect wallet.
2. Complete access checks.
3. Build a GPT-5.5 assisted skill, rate, and inventory profile.
4. Publish provider inventory through `BookingManager`.
5. Initialize or join a Uniswap v4 `TIME/USDC` pool.
6. Request or select a signed booking quote for a provider and slot.
7. Buy `TIME` credits through the v4 pool, or use existing `TIME` credits.
8. Book a slot through `BookingManager`.
9. Let `BookingManager` burn or lock the required `TIME` and create booking state.
10. Complete, cancel, refund, or dispute the booking through the marketplace workflow.

## Marketplace And Liquidity Split

`BookingManager` answers marketplace questions:

- Which providers exist?
- How much inventory is redeemable?
- Which quote is valid?
- Which slot is locked?
- Which buyer owns a booking?
- Which bookings are completed, cancelled, refunded, or disputed?

Uniswap v4 answers liquidity questions:

- What is the current `TIME/USDC` execution price?
- Can a buyer acquire credits from the pool?
- Can an LP provide liquidity to the credit market?
- Can hook checks constrain swaps that claim booking intent?

`TimePoolHook` bridges the two only for trading-side validation. It checks inventory and signed quote intent around swaps that include `hookData`, then emits telemetry after swaps. It does not book slots, transfer service rights, or settle marketplace state.

## Anti-Goals

- Do not present Uniswap v4 hooks as the booking marketplace.
- Do not put booking settlement inside `beforeSwap` or `afterSwap`.
- Do not rely on browser-exposed AI keys.
- Do not oversell more `TIME` credits than a provider can redeem.
- Do not make AMM price look like a guaranteed fixed service price.
- Do not treat `TIME` as a speculative token detached from provider inventory.
- Do not use decorative purple or blue crypto gradients as the product identity.
- Do not hide quote expiry, slippage, wallet readiness, or transaction risk behind optimistic copy.
