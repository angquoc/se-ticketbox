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
      await this.prisma.uploadedFile.update({
        where: { id: uploadedFileId },
        data: { status: 'PROCESSING', errorMessage: null },
      });

      const fileBuffer = await this.storage.downloadFile(objectKey);
      const { total, validRecords, errors } = this.csvParse.parseBuffer(fileBuffer);

      if (total === 0) {
        throw new Error('File CSV rỗng hoặc không đúng định dạng cột.');
      }

      let insertedCount = 0;
      let duplicateCount = 0;

      if (validRecords.length > 0) {
        // Lấy danh sách email hợp lệ trong mảng (loại bỏ null)
        const emailsToCheck = validRecords
          .map((r) => r.email)
          .filter((e) => e !== null) as string[];

        // Truy vấn CSDL xem email nào đã tồn tại trong Concert này
        const existingEntries = await this.prisma.guestListEntry.findMany({
          where: {
            concertId,
            email: { in: emailsToCheck },
          },
          select: { email: true },
        });

        // Tạo Set để check trùng nhanh (O(1))
        const existingEmailsSet = new Set(
          existingEntries.map((e) => e.email).filter(Boolean),
        );

        // Lọc mảng validRecords: Chỉ lấy những người không có email, hoặc email CHƯA CÓ trong Set
        const recordsToInsert = validRecords.filter((row) => {
          if (row.email && existingEmailsSet.has(row.email)) {
            duplicateCount++;
            errors.push(`Bỏ qua: Email ${row.email} đã tồn tại trong danh sách.`);
            return false;
          }
          return true;
        });

        // Insert vào DB
        if (recordsToInsert.length > 0) {
          const dataToInsert = recordsToInsert.map((record) => ({
            concertId,
            fullName: record.fullName,
            email: record.email,
            phone: record.phone,
            sponsorName: record.sponsorName,
            sourceFile: objectKey,
          }));

          await this.prisma.guestListEntry.createMany({
            data: dataToInsert,
          });
          insertedCount = recordsToInsert.length;
        }
      }

      const finalStatus = errors.length > 0 ? 'COMPLETED_WITH_ERRORS' : 'COMPLETED';
      // Lưu log lỗi tối đa 50 dòng để không làm phình cột DB
      const errorMsg = errors.length > 0 ? JSON.stringify(errors.slice(0, 50)) : null;

      await this.prisma.uploadedFile.update({
        where: { id: uploadedFileId },
        data: {
          status: finalStatus,
          errorMessage: errorMsg,
        },
      });

      this.logger.log(
        `Import xong! Tổng: ${total}, Đã thêm mới: ${insertedCount}, Trùng lặp: ${duplicateCount}, Lỗi data: ${errors.length - duplicateCount}`,
      );

      return { status: finalStatus, insertedCount, duplicateCount };

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

      throw error;
    }
  }
}