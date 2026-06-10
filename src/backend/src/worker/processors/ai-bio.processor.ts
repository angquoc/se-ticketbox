import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { AI_BIO_QUEUE } from '../../modules/queue/queue.constants';
import { PrismaService } from '../../database/prisma.service';
import { StorageService } from '../../modules/storage/storage.service';
import { PdfExtractService } from '../services/pdf-extract.service';
import { AiService } from '../services/ai.service';

@Processor(AI_BIO_QUEUE)
export class AiBioProcessor extends WorkerHost {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly pdfExtract: PdfExtractService,
    private readonly aiService: AiService,
  ) {
    super();
  }

  async process(
    job: Job<{
      concertId: string;
      uploadedFileId: string;
      objectKey: string;
    }>,
  ) {
    const { concertId, uploadedFileId, objectKey } = job.data;

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

      const limitedText = extractedText.slice(0, 6000);
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

      return {
        status: 'COMPLETED',
        concertId,
        uploadedFileId,
      };
    } catch (error) {
      await this.prisma.uploadedFile.update({
        where: { id: uploadedFileId },
        data: {
          status: 'FAILED',
          errorMessage:
            error instanceof Error ? error.message : 'UNKNOWN_AI_BIO_ERROR',
        },
      });

      throw error;
    }
  }
}