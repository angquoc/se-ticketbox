import { Module } from '@nestjs/common';
import { GateController } from './gate.controller';
import { GateService } from './gate.service';
import { PrismaModule } from '../../database/prisma.module';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [PrismaModule, NotificationModule],
  controllers: [GateController],
  providers: [GateService],
  exports: [GateService],
})
export class GateModule {}
