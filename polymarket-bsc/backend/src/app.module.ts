import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './database/prisma.module';
import { MarketsModule } from './modules/markets/markets.module';
import { TradingModule } from './modules/trading/trading.module';
import { OrderbookModule } from './modules/orderbook/orderbook.module';
import { BlockchainModule } from './modules/blockchain/blockchain.module';
import { WebsocketModule } from './modules/websocket/websocket.module';
import { OracleModule } from './modules/oracle/oracle.module';
import { CommentsModule } from './modules/comments/comments.module';
import { CacheModule } from './modules/cache/cache.module';
import { AdminModule } from './modules/admin/admin.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    CacheModule,
    PrismaModule,
    MarketsModule,
    TradingModule,
    OrderbookModule,
    BlockchainModule,
    WebsocketModule,
    OracleModule,
    CommentsModule,
    AdminModule,
  ],
})
export class AppModule {}
