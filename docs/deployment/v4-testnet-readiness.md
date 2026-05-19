# v4 Testnet Readiness Matrix

## Purpose

This matrix tracks whether the `TIME` Uniswap v4 showcase can be deployed, configured, quoted, swapped, and demonstrated on either Ethereum Sepolia or Base Sepolia.

The showcase uses Uniswap v4 as liquidity infrastructure only. `TimePoolHook` validates booking-aware swap intent when non-empty `hookData` is supplied, but a successful swap is not a booking confirmation. Booking state is created only by `BookingManager.bookWithCredits` after settled `TIME` credits exist.

## Official v4 addresses

Verified against current Uniswap v4 deployment docs.

| Contract | Ethereum Sepolia | Base Sepolia |
| --- | --- | --- |
| PoolManager | `0xE03A1074c86CFeDd5C142C4F04F1a1536e203543` | `0x05E73354cFDd6745C338b50BcFDfA3Aa6fA03408` |
| Universal Router | `0x3A9D48AB9751398BbFa63ad67599Bb04e4BdF98b` | `0x492e6456d9528771018deb9e87ef7750ef184104` |
| PositionManager | `0x429ba70129df741B2Ca2a85BC3A2a3328e5c09b4` | `0x4b2c77d209d3405f41a037ec6c77f7f5b8e2ca80` |
| StateView | `0xe1dd9c3fa50edb962e442f60dfbc432e24537e4c` | `0x571291b572ed32ce6751a2cb2486ebee8defb9b4` |
| Quoter | `0x61b3f2011a92d183c7dbadbda940a7555ccf9227` | `0x4a6513c898fe1b2d0e78d3b0e0a4a151589b1cba` |
| Permit2 | `0x000000000022D473030F116dDEE9F6B43aC78BA3` | `0x000000000022D473030F116dDEE9F6B43aC78BA3` |

## Required environment

Pick one target chain and set the generic `V4_*` variables to that chain's official addresses.

```bash
TESTNET_RPC=
DEPLOYER_PRIVATE_KEY=
QUOTE_SIGNER_ADDRESS=
V4_POOL_MANAGER=
V4_UNIVERSAL_ROUTER=
V4_POSITION_MANAGER=
V4_STATE_VIEW=
V4_QUOTER=
V4_PERMIT2=0x000000000022D473030F116dDEE9F6B43aC78BA3
TEST_USDC=
```

If `TEST_USDC` is empty, `DeployTimeV4Testnet.s.sol` deploys `MockUSDC` and prints its address.

## Deploy command

```bash
cd contracts
forge script script/DeployTimeV4Testnet.s.sol \
  --rpc-url "$TESTNET_RPC" \
  --broadcast
```

For a dry-run, omit `--broadcast`.

## Deployment output checklist

After running the deploy script, copy these values from terminal output:

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

For Ethereum Sepolia app config, use:

```bash
NEXT_PUBLIC_TIME_CREDIT_TOKEN_SEPOLIA=<TIME_TOKEN_TESTNET>
NEXT_PUBLIC_BOOKING_MANAGER_SEPOLIA=<BOOKING_MANAGER_TESTNET>
NEXT_PUBLIC_TIME_POOL_HOOK_SEPOLIA=<TIME_POOL_HOOK_TESTNET>
NEXT_PUBLIC_USDC_SEPOLIA=<TEST_USDC>
```

For Base Sepolia app config, use:

```bash
NEXT_PUBLIC_TIME_CREDIT_TOKEN_BASE_SEPOLIA=<TIME_TOKEN_TESTNET>
NEXT_PUBLIC_BOOKING_MANAGER_BASE_SEPOLIA=<BOOKING_MANAGER_TESTNET>
NEXT_PUBLIC_TIME_POOL_HOOK_BASE_SEPOLIA=<TIME_POOL_HOOK_TESTNET>
NEXT_PUBLIC_USDC_BASE_SEPOLIA=<TEST_USDC>
```

## Readiness matrix

| Area | Required evidence | Status | Next action |
| --- | --- | --- | --- |
| Contract tests | `cd contracts && forge test -vvv` | Ready: 34 passed after hook hardening | Keep green after every contract edit |
| Hook gas snapshot | `cd contracts && forge snapshot --match-contract TimePoolHookTest --skip script` | Ready: 26 hook tests passed | Keep scoped snapshot green |
| Hook policy | Empty `hookData` generic; non-empty booking intent validates; malformed non-empty reverts | Ready | Preserve docs/tests |
| v4 addresses | PoolManager, Universal Router, PositionManager, StateView, Quoter, Permit2 listed above | Ready | Pick target chain and set generic `V4_*` vars |
| Deployment script | Deploys `TimeCreditToken`, `BookingManager`, mined `TimePoolHook`, roles, router allowlist, quote-consumption trust, pool init, pool allowlist | Build-ready; needs RPC rehearsal | Run dry-run, then broadcast when funded |
| Deployment outputs | Script prints token, manager, hook, USDC, v4 addresses, pool id, pool key values | Ready in script | Capture output into demo evidence |
| Pool liquidity | Non-zero demo liquidity seeded through PositionManager | Needs live funded wallet | Seed before quote/swap smoke |
| Frontend quote path | `quoteExactInputSingle` calls configured Quoter | Ready by build/typecheck | Smoke against deployed liquid pool |
| Permit2/wallet flow | ERC-20 approval to Permit2, Permit2 approval to Universal Router | Needs live wallet smoke | Run after deploy |
| Frontend build | `npm run build` | Ready with existing hook dependency warnings | Keep green |
| Type safety | `npx tsc --noEmit --pretty false --incremental false` | Ready | Keep green |
| Demo fallback | tx hashes, event logs, screenshots, route/quote output, or documented blocked-live evidence | Runbook ready; live evidence pending credentials/funds/liquidity | Capture after first successful dry-run/live run |

## Known caveat

Use `forge snapshot --match-contract TimePoolHookTest --skip script` for the gas snapshot until the deployment script layer is aligned with the installed `forge-std` API.

## Demo runbook

See `docs/demo/time-v4-showcase-runbook.md` for the happy path, fallback evidence checklist, and demo talk track.
