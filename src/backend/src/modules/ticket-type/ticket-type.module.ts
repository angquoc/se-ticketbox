import { Module } from '@nestjs/common';
import {
  TicketTypeController,
  TicketTypePublicController,
} from './ticket-type.controller';
import { TicketTypeService } from './ticket-type.service';
import { ConcertModule } from '../concert/concert.module';

@Module({
  imports: [ConcertModule],
  controllers: [TicketTypeController, TicketTypePublicController],
  providers: [TicketTypeService],
  exports: [TicketTypeService],
})
export class TicketTypeModule {}
