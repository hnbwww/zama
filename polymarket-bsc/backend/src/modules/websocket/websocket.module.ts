import { Module } from '@nestjs/common';
import { WebsocketGateway } from './websocket.gateway';
import { OrderbookModule } from '../orderbook/orderbook.module';
import { MarketsModule } from '../markets/markets.module';

@Module({
  imports: [OrderbookModule, MarketsModule],
  providers: [WebsocketGateway],
  exports: [WebsocketGateway],
})
export class WebsocketModule {}
