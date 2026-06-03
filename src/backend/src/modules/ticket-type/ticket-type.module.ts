import { Module } from '@nestjs/common';
import { TicketTypeController, TicketTypePublicController } from './ticket-type.controller';
import { TicketTypeService } from './ticket-type.service';

@Module({
  controllers: [TicketTypeController, TicketTypePublicController],
  providers: [TicketTypeService],
  exports: [TicketTypeService],
})
export class TicketTypeModule {}
