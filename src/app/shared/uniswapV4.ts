import { baseSepolia, sepolia } from 'wagmi/chains';

export const PERMIT2_ADDRESS = '0x000000000022D473030F116dDEE9F6B43aC78BA3' as const;

export const UNISWAP_V4_DEPLOYMENTS = {
  [sepolia.id]: {
    poolManager: '0xE03A1074c86CFeDd5C142C4F04F1a1536e203543',
    universalRouter: '0x3A9D48AB9751398BbFa63ad67599Bb04e4BdF98b',
    positionManager: '0x429ba70129df741B2Ca2a85BC3A2a3328e5c09b4',
    stateView: '0xe1dd9c3fa50edb962e442f60dfbc432e24537e4c',
    quoter: '0x61b3f2011a92d183c7dbadbda940a7555ccf9227',
    permit2: PERMIT2_ADDRESS,
  },
  [baseSepolia.id]: {
    poolManager: '0x05E73354cFDd6745C338b50BcFDfA3Aa6fA03408',
    universalRouter: '0x492e6456d9528771018deb9e87ef7750ef184104',
    positionManager: '0x4b2c77d209d3405f41a037ec6c77f7f5b8e2ca80',
    stateView: '0x571291b572ed32ce6751a2cb2486ebee8defb9b4',
    quoter: '0x4a6513c898fe1b2d0e78d3b0e0a4a151589b1cba',
    permit2: PERMIT2_ADDRESS,
  },
} as const;

export type V4SupportedChainId = keyof typeof UNISWAP_V4_DEPLOYMENTS;
export type V4Deployment = (typeof UNISWAP_V4_DEPLOYMENTS)[V4SupportedChainId];

export const v4SupportedChains = [baseSepolia, sepolia] as const;
export const V4_SUPPORTED_CHAIN_IDS = v4SupportedChains.map((chain) => chain.id) as V4SupportedChainId[];

export function isV4SupportedChainId(chainId: number): chainId is V4SupportedChainId {
  return chainId in UNISWAP_V4_DEPLOYMENTS;
}

export function isV4SupportedChain(chain: { id: number }): chain is (typeof v4SupportedChains)[number] {
  return isV4SupportedChainId(chain.id);
}

export function getV4Deployment(chainId: number): V4Deployment {
  const deployment = UNISWAP_V4_DEPLOYMENTS[chainId as V4SupportedChainId];
  if (!deployment) {
    throw new Error(`Uniswap v4 is not configured for chain ${chainId}`);
  }
  return deployment;
}
