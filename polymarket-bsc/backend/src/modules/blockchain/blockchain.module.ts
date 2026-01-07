import { Module } from '@nestjs/common';
import { BlockchainService } from './blockchain.service';
import { MarketsModule } from '../markets/markets.module';
import { TradingModule } from '../trading/trading.module';

@Module({
  imports: [MarketsModule, TradingModule],
  providers: [BlockchainService],
  exports: [BlockchainService],
})
export class BlockchainModule {}
