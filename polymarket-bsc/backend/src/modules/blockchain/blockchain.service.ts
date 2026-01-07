import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ethers } from 'ethers';
import { MarketsService } from '../markets/markets.service';
import { TradingService } from '../trading/trading.service';

@Injectable()
export class BlockchainService implements OnModuleInit, OnModuleDestroy {
  private provider: ethers.JsonRpcProvider;
  private contracts: {
    ctf?: ethers.Contract;
    factory?: ethers.Contract;
    amm?: ethers.Contract;
    orderbook?: ethers.Contract;
  } = {};

  constructor(
    private configService: ConfigService,
    private marketsService: MarketsService,
    private tradingService: TradingService,
  ) {}

  async onModuleInit() {
    await this.initializeProvider();
    await this.initializeContracts();
    await this.startEventListeners();
  }

  async onModuleDestroy() {
    // 清理事件监听器
    Object.values(this.contracts).forEach(contract => {
      if (contract) {
        contract.removeAllListeners();
      }
    });
  }

  /**
   * 初始化区块链连接
   */
  private async initializeProvider() {
    const rpcUrl = this.configService.get('BSC_RPC_URL') || 'https://bsc-dataseed.binance.org/';
    this.provider = new ethers.JsonRpcProvider(rpcUrl);

    const network = await this.provider.getNetwork();
    console.log(`✅ Connected to BSC (Chain ID: ${network.chainId})`);
  }

  /**
   * 初始化智能合约实例
   */
  private async initializeContracts() {
    const factoryAddress = this.configService.get('FACTORY_CONTRACT_ADDRESS');
    const ammAddress = this.configService.get('AMM_CONTRACT_ADDRESS');
    const ctfAddress = this.configService.get('CTF_CONTRACT_ADDRESS');

    // 简化的 ABI（实际应该从编译结果导入）
    const factoryAbi = [
      'event MarketCreated(bytes32 indexed conditionId, address indexed creator, string question, string category, uint256 resolutionTime)',
      'event MarketResolved(bytes32 indexed conditionId, uint256 outcome, uint256 timestamp)',
    ];

    const ammAbi = [
      'event Swap(bytes32 indexed conditionId, address indexed trader, bool buyYes, uint256 amountIn, uint256 amountOut, uint256 fee)',
      'event LiquidityAdded(bytes32 indexed conditionId, address indexed provider, uint256 yesAmount, uint256 noAmount, uint256 liquidity)',
    ];

    const ctfAbi = [
      'event ConditionPrepared(bytes32 indexed conditionId, bytes32 indexed questionId, address indexed oracle, uint256 outcomeSlotCount)',
      'event ConditionResolved(bytes32 indexed conditionId, uint256 payoutNumerator)',
      'event PayoutRedeemed(address indexed user, bytes32 indexed conditionId, uint256 amount)',
    ];

    if (factoryAddress) {
      this.contracts.factory = new ethers.Contract(factoryAddress, factoryAbi, this.provider);
    }

    if (ammAddress) {
      this.contracts.amm = new ethers.Contract(ammAddress, ammAbi, this.provider);
    }

    if (ctfAddress) {
      this.contracts.ctf = new ethers.Contract(ctfAddress, ctfAbi, this.provider);
    }

    console.log('✅ Contracts initialized');
  }

  /**
   * 启动事件监听器
   */
  private async startEventListeners() {
    if (this.contracts.factory) {
      this.listenToMarketEvents();
    }

    if (this.contracts.amm) {
      this.listenToAMMEvents();
    }

    if (this.contracts.ctf) {
      this.listenToCTFEvents();
    }

    console.log('✅ Event listeners started');
  }

  /**
   * 监听市场创建事件
   */
  private listenToMarketEvents() {
    this.contracts.factory?.on('MarketCreated', async (
      conditionId: string,
      creator: string,
      question: string,
      category: string,
      resolutionTime: bigint,
      event: any
    ) => {
      try {
        console.log(`📊 New market created: ${question}`);

        await this.marketsService.createFromBlockchain({
          conditionId,
          title: question,
          description: '', // 需要从链下获取
          category,
          creatorAddress: creator,
          settlementTime: new Date(Number(resolutionTime) * 1000),
          resolutionSource: '',
          contractAddress: event.address,
        });
      } catch (error) {
        console.error('Error processing MarketCreated event:', error);
      }
    });

    this.contracts.factory?.on('MarketResolved', async (
      conditionId: string,
      outcome: bigint,
      timestamp: bigint
    ) => {
      try {
        console.log(`✅ Market resolved: ${conditionId}, outcome: ${outcome}`);

        await this.marketsService.resolveMarket(conditionId, outcome === 1n);
      } catch (error) {
        console.error('Error processing MarketResolved event:', error);
      }
    });
  }

  /**
   * 监听 AMM 交易事件
   */
  private listenToAMMEvents() {
    this.contracts.amm?.on('Swap', async (
      conditionId: string,
      trader: string,
      buyYes: boolean,
      amountIn: bigint,
      amountOut: bigint,
      fee: bigint,
      event: any
    ) => {
      try {
        console.log(`💱 Swap executed on ${conditionId}`);

        // 记录交易
        const market = await this.marketsService.findByConditionId(conditionId);

        await this.tradingService.recordTrade({
          marketId: market.id,
          buyerAddress: trader,
          sellerAddress: 'AMM',
          outcome: buyYes ? 'YES' : 'NO',
          price: Number(amountOut) / Number(amountIn),
          size: Number(amountIn),
          txHash: event.log.transactionHash,
          blockNumber: event.log.blockNumber,
        });

        // 更新市场价格（简化版本）
        const yesPrice = buyYes ? Number(amountOut) / Number(amountIn) : 1 - Number(amountOut) / Number(amountIn);
        await this.marketsService.updatePrices(conditionId, yesPrice, 1 - yesPrice);
      } catch (error) {
        console.error('Error processing Swap event:', error);
      }
    });
  }

  /**
   * 监听 CTF 事件
   */
  private listenToCTFEvents() {
    this.contracts.ctf?.on('ConditionResolved', async (
      conditionId: string,
      payoutNumerator: bigint
    ) => {
      try {
        console.log(`🎯 Condition resolved: ${conditionId}`);
        // 更新数据库中的市场状态已在 MarketResolved 中处理
      } catch (error) {
        console.error('Error processing ConditionResolved event:', error);
      }
    });
  }

  /**
   * 获取当前区块号
   */
  async getCurrentBlockNumber(): Promise<number> {
    return await this.provider.getBlockNumber();
  }

  /**
   * 获取交易收据
   */
  async getTransactionReceipt(txHash: string) {
    return await this.provider.getTransactionReceipt(txHash);
  }

  /**
   * 估算 Gas 费用
   */
  async estimateGas(tx: any) {
    return await this.provider.estimateGas(tx);
  }
}
