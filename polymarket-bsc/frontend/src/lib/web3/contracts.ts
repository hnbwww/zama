import { Address } from 'viem'
import { CONTRACTS } from './config'

// Contract ABIs (simplified - import full ABIs from compiled contracts)
export const CONDITIONAL_TOKENS_ABI = [
  {
    name: 'prepareCondition',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'questionId', type: 'bytes32' },
      { name: 'oracle', type: 'address' },
    ],
    outputs: [{ name: '', type: 'bytes32' }],
  },
  {
    name: 'splitPosition',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'conditionId', type: 'bytes32' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [],
  },
  {
    name: 'mergePositions',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'conditionId', type: 'bytes32' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [],
  },
  {
    name: 'redeemPositions',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'conditionId', type: 'bytes32' }],
    outputs: [],
  },
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'account', type: 'address' },
      { name: 'id', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const

export const MARKET_FACTORY_ABI = [
  {
    name: 'createMarket',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'question', type: 'string' },
      { name: 'description', type: 'string' },
      { name: 'category', type: 'string' },
      { name: 'resolutionTime', type: 'uint256' },
      { name: 'resolutionSource', type: 'string' },
      { name: 'initialLiquidity', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bytes32' }],
  },
  {
    name: 'getMarket',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'conditionId', type: 'bytes32' }],
    outputs: [
      {
        name: '',
        type: 'tuple',
        components: [
          { name: 'conditionId', type: 'bytes32' },
          { name: 'question', type: 'string' },
          { name: 'description', type: 'string' },
          { name: 'category', type: 'string' },
          { name: 'creator', type: 'address' },
          { name: 'createdAt', type: 'uint256' },
          { name: 'resolutionTime', type: 'uint256' },
          { name: 'resolutionSource', type: 'string' },
          { name: 'status', type: 'uint8' },
          { name: 'totalVolume', type: 'uint256' },
          { name: 'yesLiquidity', type: 'uint256' },
          { name: 'noLiquidity', type: 'uint256' },
        ],
      },
    ],
  },
] as const

export const AMM_ABI = [
  {
    name: 'swap',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'conditionId', type: 'bytes32' },
      { name: 'buyYes', type: 'bool' },
      { name: 'amountIn', type: 'uint256' },
      { name: 'minAmountOut', type: 'uint256' },
    ],
    outputs: [{ name: 'amountOut', type: 'uint256' }],
  },
  {
    name: 'getAmountOut',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'conditionId', type: 'bytes32' },
      { name: 'buyYes', type: 'bool' },
      { name: 'amountIn', type: 'uint256' },
    ],
    outputs: [{ name: 'amountOut', type: 'uint256' }],
  },
  {
    name: 'getCurrentPrice',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'conditionId', type: 'bytes32' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'addLiquidity',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'conditionId', type: 'bytes32' },
      { name: 'yesAmount', type: 'uint256' },
      { name: 'noAmount', type: 'uint256' },
    ],
    outputs: [{ name: 'liquidity', type: 'uint256' }],
  },
] as const

export const ERC20_ABI = [
  {
    name: 'approve',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'allowance',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const

// Contract instances configuration
export const getContractConfig = (contractName: keyof typeof CONTRACTS) => {
  return {
    address: CONTRACTS[contractName] as Address,
    abi: getABI(contractName),
  }
}

function getABI(contractName: keyof typeof CONTRACTS) {
  switch (contractName) {
    case 'ConditionalTokens':
      return CONDITIONAL_TOKENS_ABI
    case 'MarketFactory':
      return MARKET_FACTORY_ABI
    case 'AMM':
      return AMM_ABI
    case 'USDC':
      return ERC20_ABI
    default:
      return []
  }
}
