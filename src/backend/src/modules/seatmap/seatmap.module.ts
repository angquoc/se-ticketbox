import { Module } from '@nestjs/common';
import { SeatmapController } from './seatmap.controller';
import { SeatmapService } from './seatmap.service';
import { SeatmapGateway } from './seatmap.gateway';
import { SeatmapBroadcastService } from './seatmap-broadcast.service';
import { PrismaModule } from '../../database/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [SeatmapController],
  providers: [SeatmapService, SeatmapGateway, SeatmapBroadcastService],
  exports: [SeatmapBroadcastService],
})
export class SeatmapModule {}
