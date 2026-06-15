import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { CSV_IMPORT_QUEUE } from '../../modules/queue/queue.constants';
import { PrismaService } from '../../database/prisma.service';
import { StorageService } from '../../modules/storage/storage.service';
import { CsvParseService } from '../services/csv-parse.service';

@Processor(CSV_IMPORT_QUEUE)
export class CsvImportProcessor extends WorkerHost {
  private readonly logger = new Logger(CsvImportProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly csvParse: CsvParseService,
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
    this.logger.log(`Bắt đầu Import CSV cho file: ${uploadedFileId}`);

    try {
      // 1. Cập nhật status
      await this.prisma.uploadedFile.update({
        where: { id: uploadedFileId },
        data: { status: 'PROCESSING', errorMessage: null },
      });

      // 2. Tải file từ MinIO
      const fileBuffer = await this.storage.downloadFile(objectKey);

      // 3. Parse và Validate dữ liệu
      const { total, validRecords, errors } = this.csvParse.parseBuffer(fileBuffer);

      if (total === 0) {
        throw new Error('File CSV rỗng hoặc không đúng định dạng cột (cần fullName).');
      }

      // 4. Lưu dữ liệu hợp lệ vào Database
      if (validRecords.length > 0) {
        const dataToInsert = validRecords.map((record) => ({
          concertId,
          fullName: record.fullName,
          email: record.email,
          phone: record.phone,
          sponsorName: record.sponsorName,
          sourceFile: objectKey, // Lưu vết từ file nào
        }));

        await this.prisma.guestListEntry.createMany({
          data: dataToInsert,
          skipDuplicates: true, // Prisma hỗ trợ bỏ qua nếu dính Unique Key (nếu có set)
        });
      }

      // 5. Xác định trạng thái hoàn tất
      const finalStatus = errors.length > 0 ? 'COMPLETED_WITH_ERRORS' : 'COMPLETED';
      const errorMsg = errors.length > 0 ? JSON.stringify(errors.slice(0, 50)) : null; // Lưu log 50 lỗi đầu tiên

      await this.prisma.uploadedFile.update({
        where: { id: uploadedFileId },
        data: {
          status: finalStatus,
          errorMessage: errorMsg,
        },
      });

      this.logger.log(`Import xong! Tổng: ${total}, Thành công: ${validRecords.length}, Lỗi: ${errors.length}`);
      
      // Ở đây có thể kích hoạt Queue bắn Notification Email báo cho Admin
      
      return { status: finalStatus, successCount: validRecords.length, errorCount: errors.length };

    } catch (error) {
      const maxAttempts = job.opts.attempts || 1;
      const isFinalAttempt = job.attemptsMade + 1 >= maxAttempts;

      if (isFinalAttempt) {
        await this.prisma.uploadedFile.update({
          where: { id: uploadedFileId },
          data: {
            status: 'FAILED',
            errorMessage: error instanceof Error ? error.message : 'UNKNOWN_CSV_ERROR',
          },
        });
      }

      this.logger.error('Lỗi khi Import CSV:', error);
      throw error;
    }
  }
}