import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './database/prisma.module';
import { MarketsModule } from './modules/markets/markets.module';
import { TradingModule } from './modules/trading/trading.module';
import { OrderbookModule } from './modules/orderbook/orderbook.module';
import { BlockchainModule } from './modules/blockchain/blockchain.module';
import { WebsocketModule } from './modules/websocket/websocket.module';
import { OracleModule } from './modules/oracle/oracle.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    PrismaModule,
    MarketsModule,
    TradingModule,
    OrderbookModule,
    BlockchainModule,
    WebsocketModule,
    OracleModule,
  ],
})
export class AppModule {}
