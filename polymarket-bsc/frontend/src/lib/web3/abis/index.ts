import ConditionalTokensABI from './ConditionalTokens.json';
import AMMABI from './AMM.json';
import OrderBookABI from './OrderBook.json';
import ERC20ABI from './ERC20.json';

export { ConditionalTokensABI, AMMABI, OrderBookABI, ERC20ABI };

export const ABIS = {
  ConditionalTokens: ConditionalTokensABI,
  AMM: AMMABI,
  OrderBook: OrderBookABI,
  ERC20: ERC20ABI,
} as const;
