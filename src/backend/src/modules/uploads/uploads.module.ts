import { Module } from '@nestjs/common';
import { UploadsController } from './uploads.controller';
import { UploadsService } from './uploads.service';
import { PrismaModule } from '../../database/prisma.module';
import { StorageModule } from '../storage/storage.module';
import { QueueModule } from '../queue/queue.module';

@Module({
  imports: [PrismaModule, StorageModule, QueueModule],
  controllers: [UploadsController],
  providers: [UploadsService],
})
export class UploadsModule {}
