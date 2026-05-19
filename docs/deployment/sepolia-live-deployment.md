# TIME v4 Showcase — Ethereum Sepolia Live Deployment

Date: 2026-05-19 (Asia/Kuala_Lumpur)
Network: Ethereum Sepolia (`11155111`)

## Deployed contracts

| Component | Address |
| --- | --- |
| TIME token | [`0x45EE4b59E2Df4B2b07415919990E5F95332eA19F`](https://sepolia.etherscan.io/address/0x45EE4b59E2Df4B2b07415919990E5F95332eA19F) |
| Booking manager | [`0xE85c76078385644418783bd182A60F966aa4852B`](https://sepolia.etherscan.io/address/0xE85c76078385644418783bd182A60F966aa4852B) |
| TIME v4 hook | [`0x24DeEADAC18474170a023610BfC471436d7300C0`](https://sepolia.etherscan.io/address/0x24DeEADAC18474170a023610BfC471436d7300C0) |
| Mock USDC | [`0x1EAf39D8EaF6491FBb58fA5aB3047Ff137Faa502`](https://sepolia.etherscan.io/address/0x1EAf39D8EaF6491FBb58fA5aB3047Ff137Faa502) |

## Uniswap v4 config

| Component | Address / value |
| --- | --- |
| PoolManager | [`0xE03A1074c86CFeDd5C142C4F04F1a1536e203543`](https://sepolia.etherscan.io/address/0xE03A1074c86CFeDd5C142C4F04F1a1536e203543) |
| Universal Router | [`0x3A9D48AB9751398BbFa63ad67599Bb04e4BdF98b`](https://sepolia.etherscan.io/address/0x3A9D48AB9751398BbFa63ad67599Bb04e4BdF98b) |
| PositionManager | [`0x429ba70129df741B2Ca2a85BC3A2a3328e5c09b4`](https://sepolia.etherscan.io/address/0x429ba70129df741B2Ca2a85BC3A2a3328e5c09b4) |
| StateView | [`0xE1Dd9c3fA50EDB962E442f60DfBc432e24537E4C`](https://sepolia.etherscan.io/address/0xE1Dd9c3fA50EDB962E442f60DfBc432e24537E4C) |
| Quoter | [`0x61B3f2011A92d183C7dbaDBdA940a7555Ccf9227`](https://sepolia.etherscan.io/address/0x61B3f2011A92d183C7dbaDBdA940a7555Ccf9227) |
| Permit2 | [`0x000000000022D473030F116dDEE9F6B43aC78BA3`](https://sepolia.etherscan.io/address/0x000000000022D473030F116dDEE9F6B43aC78BA3) |
| Pool ID | `0xd2fa7fc47da4fdec875e0eaf18b8fbee6171891c256fb44341ea9c211fed93b7` |
| Currency0 | `0x1EAf39D8EaF6491FBb58fA5aB3047Ff137Faa502` |
| Currency1 | `0x45EE4b59E2Df4B2b07415919990E5F95332eA19F` |
| Fee | `3000` |
| Tick spacing | `60` |
| Initial price | `1:1`, tick `0` |

## Broadcast evidence

Broadcast artifact: `contracts/broadcast/DeployTimeV4Testnet.s.sol/11155111/run-latest.json`
Block: `10876376`

| Action | Tx hash |
| --- | --- |
| Deploy MockUSDC | `0x20f90b95b3e84474327d5d2214beef323bfe224f7329efcc66862b657f271766` |
| Deploy TimeCreditToken | `0x37db30675e0b7fb412726d8997a1afb30608d0a3602a8a4bbdde9b1d89622d7e` |
| Deploy BookingManager | `0x22360fc68618c55c83060b88f893ebbb56d486633f182592b99f3387ddba7c83` |
| Deploy TimePoolHook | `0x3278603d6b91f60d0c8e493d8240ccbf558721cb7a01076c55054a0af4d2037a` |
| Grant TIME booking role | `0xebabea411647c3adcb5a07f038c1c865e34bb21fb51897cb8092becd922cb016` |
| Grant quote signer role | `0x5a3dd52b17faa468454a3fc36a69db4063941aaf29f22f2b47085e9694f95875` |
| Allow Universal Router | `0xf41d0c6902a4d6d0aba189ffbc18b91ab2ec73ee5db502683b3e16001d2a89b9` |
| Trust router quote consumption | `0xa7636ebc5a4ed180cb8ea71ffbe92b9e8e03018060b9d6f97f9bf65c8352f09c` |
| Initialize v4 pool | `0xfd505f38af3948bfbeadfd429bd717b08fd259f44f4fd04f42ca8bbb53170b0e` |
| Allow v4 pool in hook | `0x263b41d01a7960df04bebb91b3d09c68b03d5d05c176ca381d39172cb2e812fe` |

## Verification evidence

Read-only chain checks passed:

- Contract bytecode exists for TIME, BookingManager, TimePoolHook, and MockUSDC.
- `TimeCreditToken.name()` = `Time Credit`; `symbol()` = `TIME`.
- `MockUSDC.symbol()` = `USDC`.
- `TimePoolHook.owner()` = deployer address.
- `TimePoolHook.booking()` = deployed BookingManager.
- `allowedRouter(UniversalRouter)` = `true`.
- `routerCanConsumeQuotes(UniversalRouter)` = `true`.
- `allowedPool(poolId)` = `true`.
- `requireHookDataForSwap()` = `false` for demo-friendly swaps.
- `enforceSingleUseQuote()` = `true`.

Local checks passed after deployment:

```sh
cd contracts && forge test --match-contract TimePoolHookTest -vvv
cd contracts && forge build
npm run contracts:compile
npx tsc --noEmit --pretty false --incremental false
npm run build
```

Known warnings only:

- `BookingManager.sol` uses `block.timestamp` for quote expiry checks.
- Existing React hook dependency warnings during `next build`.
- OpenZeppelin ECDSA identifier warning from solc during JS compile.


## Demo readiness note

The v4 pool is initialized and allowed by the hook, but liquidity is not seeded by `DeployTimeV4Testnet.s.sol`.
For a live swap demo through Universal Router, mint demo TIME/MockUSDC, approve PositionManager/Permit2 as needed, and add liquidity to the deployed pool.
The current app can still show the Sepolia v4 deployment, hook configuration, pool ID, and contract links.

## App environment values

`.env.local` has been updated with these app-facing Sepolia values:

```env
NEXT_PUBLIC_TIME_CREDIT_TOKEN_SEPOLIA=0x45EE4b59E2Df4B2b07415919990E5F95332eA19F
NEXT_PUBLIC_BOOKING_MANAGER_SEPOLIA=0xE85c76078385644418783bd182A60F966aa4852B
NEXT_PUBLIC_TIME_POOL_HOOK_SEPOLIA=0x24DeEADAC18474170a023610BfC471436d7300C0
NEXT_PUBLIC_USDC_SEPOLIA=0x1EAf39D8EaF6491FBb58fA5aB3047Ff137Faa502
NEXT_PUBLIC_V4_POOL_ID=0xd2fa7fc47da4fdec875e0eaf18b8fbee6171891c256fb44341ea9c211fed93b7
NEXT_PUBLIC_POOL_CURRENCY0=0x1EAf39D8EaF6491FBb58fA5aB3047Ff137Faa502
NEXT_PUBLIC_POOL_CURRENCY1=0x45EE4b59E2Df4B2b07415919990E5F95332eA19F
NEXT_PUBLIC_POOL_FEE=3000
NEXT_PUBLIC_POOL_TICK_SPACING=60
```

Do not commit private keys or RPC URLs.
