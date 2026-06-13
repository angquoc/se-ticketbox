import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { AI_BIO_QUEUE } from '../../modules/queue/queue.constants';
import { PrismaService } from '../../database/prisma.service';
import { StorageService } from '../../modules/storage/storage.service';
import { PdfExtractService } from '../services/pdf-extract.service';
import { AiService } from '../services/ai.service';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Processor(AI_BIO_QUEUE)
export class AiBioProcessor extends WorkerHost {
  private readonly logger = new Logger(AiBioProcessor.name);
  private readonly redis: Redis;

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly pdfExtract: PdfExtractService,
    private readonly aiService: AiService,
    private readonly config: ConfigService,
  ) {
    super();
    this.redis = new Redis({
      host: this.config.get<string>('REDIS_HOST', 'localhost'),
      port: Number(this.config.get<string>('REDIS_PORT', '6379')),
      password: this.config.get<string>('REDIS_PASSWORD') || undefined,
    });
  }

  async process(
    job: Job<{
      concertId: string;
      uploadedFileId: string;
      objectKey: string;
    }>,
  ) {
    const { concertId, uploadedFileId, objectKey } = job.data;
    this.logger.log(`Đang xử lý AI Bio cho file ${uploadedFileId}`);

    try {
      await this.prisma.uploadedFile.update({
        where: { id: uploadedFileId },
        data: {
          status: 'PROCESSING',
          errorMessage: null,
        },
      });

      const fileBuffer = await this.storage.downloadFile(objectKey);
      const extractedText = await this.pdfExtract.extractText(fileBuffer);

      if (!extractedText || extractedText.length < 20) {
        throw new Error('PDF_TEXT_EXTRACTION_FAILED');
      }

      const limitedText = extractedText.slice(0, 8000);
      const artistBio = await this.aiService.generateArtistBio(limitedText);

      if (!artistBio || artistBio.trim().length < 20) {
        throw new Error('AI_BIO_EMPTY');
      }

      await this.prisma.$transaction(async (tx) => {
        await tx.concert.update({
          where: { id: concertId },
          data: {
            artistBio,
          },
        });

        await tx.uploadedFile.update({
          where: { id: uploadedFileId },
          data: {
            status: 'COMPLETED',
            errorMessage: null,
          },
        });
      });

      // Xóa bộ nhớ đệm trên Redis để giao diện hiển thị thông tin mới ngay lập tức
      await this.redis.del(`cache:artist-bio:${concertId}`);
      await this.redis.del(`cache:concert:detail:${concertId}`);
      await this.redis.del('cache:concert:list');

      return {
        status: 'COMPLETED',
        concertId,
        uploadedFileId,
      };
    } catch (error) {
      const maxAttempts = job.opts.attempts || 1;
      const isFinalAttempt = job.attemptsMade + 1 >= maxAttempts;

      if (isFinalAttempt) {
        await this.prisma.uploadedFile.update({
          where: { id: uploadedFileId },
          data: {
            status: 'FAILED',
            errorMessage:
              error instanceof Error ? error.message : 'UNKNOWN_AI_BIO_ERROR',
          },
        });
      }

      throw error;
    }
  }
}