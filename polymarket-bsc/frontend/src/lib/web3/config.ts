import { createConfig, http } from 'wagmi'
import { bsc, bscTestnet } from 'wagmi/chains'
import { injected, walletConnect } from 'wagmi/connectors'

// BSC Contract Addresses (update after deployment)
export const CONTRACTS = {
  ConditionalTokens: process.env.NEXT_PUBLIC_CTF_ADDRESS || '',
  MarketFactory: process.env.NEXT_PUBLIC_FACTORY_ADDRESS || '',
  AMM: process.env.NEXT_PUBLIC_AMM_ADDRESS || '',
  OrderBook: process.env.NEXT_PUBLIC_ORDERBOOK_ADDRESS || '',
  USDC: process.env.NEXT_PUBLIC_USDC_ADDRESS || '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56',
}

// Chain configuration
const chains = [bsc, bscTestnet] as const

// Wagmi configuration
export const config = createConfig({
  chains,
  connectors: [
    injected({
      shimDisconnect: true,
    }),
    walletConnect({
      projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || '',
    }),
  ],
  transports: {
    [bsc.id]: http(),
    [bscTestnet.id]: http(),
  },
})

// Helper function to get current chain
export const getCurrentChain = () => {
  const chainId = Number(process.env.NEXT_PUBLIC_CHAIN_ID || 56)
  return chains.find(chain => chain.id === chainId) || bsc
}

export { bsc, bscTestnet }
