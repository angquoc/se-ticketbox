import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../database/prisma.service';
import { StorageService } from '../storage/storage.service';
import { AI_BIO_QUEUE, CSV_IMPORT_QUEUE } from '../queue/queue.constants';

export interface MulterFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

@Injectable()
export class UploadsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,

    @InjectQueue(AI_BIO_QUEUE)
    private readonly aiBioQueue: Queue,

    @InjectQueue(CSV_IMPORT_QUEUE)
    private readonly csvImportQueue: Queue,
  ) {}

  async uploadGuestListCsv(params: {
    concertId: string;
    file: MulterFile;
    userId: string;
    role: string;
  }) {
    const { concertId, file, userId, role } = params;

    // Chấp nhận text/csv hoặc mimetypes của Excel xuất ra
    if (!file.mimetype.includes('csv') && !file.mimetype.includes('excel')) {
      throw new BadRequestException('File phải là định dạng CSV');
    }

    const maxSizeInBytes = 5 * 1024 * 1024; // Giới hạn 5MB cho CSV
    if (file.size > maxSizeInBytes) {
      throw new BadRequestException('File CSV không được vượt quá 5MB');
    }

    const concert = await this.prisma.concert.findUnique({
      where: { id: concertId },
    });

    if (!concert) throw new NotFoundException('Không tìm thấy concert');

    if (role !== 'ADMIN' && concert.organizerId !== userId) {
      throw new ForbiddenException(
        'Bạn không có quyền import danh sách cho concert này',
      );
    }

    const safeFileName = file.originalname.replace(/[^\w.-]+/g, '_');
    const objectKey = `concerts/${concertId}/guest-list/${randomUUID()}-${safeFileName}`;

    // Lưu MinIO
    await this.storage.uploadFile({
      objectKey,
      buffer: file.buffer,
      mimeType: file.mimetype,
    });

    // Lưu metadata
    const uploadedFile = await this.prisma.uploadedFile.create({
      data: {
        concertId,
        objectKey,
        fileName: file.originalname,
        mimeType: file.mimetype,
        purpose: 'GUEST_LIST_CSV',
        status: 'PENDING',
      },
    });

    // Đẩy Job vào BullMQ
    const job = await this.csvImportQueue.add(
      'process-csv-import',
      {
        concertId,
        uploadedFileId: uploadedFile.id,
        objectKey,
      },
      {
        attempts: 3,
        backoff: { type: 'exponential', delay: 3000 },
        removeOnComplete: true,
        removeOnFail: false,
      },
    );

    return {
      message: 'CSV uploaded successfully',
      jobStatus: uploadedFile.status,
      jobId: job.id,
      uploadedFileId: uploadedFile.id,
    };
  }

  async uploadArtistPdf(params: {
    concertId: string;
    file: MulterFile;
    userId: string;
    role: string;
  }) {
    const { concertId, file, userId, role } = params;

    if (file.mimetype !== 'application/pdf') {
      throw new BadRequestException('File phải là PDF');
    }

    const maxSizeInBytes = 10 * 1024 * 1024;

    if (file.size > maxSizeInBytes) {
      throw new BadRequestException('File PDF không được vượt quá 10MB');
    }

    const concert = await this.prisma.concert.findUnique({
      where: { id: concertId },
    });

    if (!concert) {
      throw new NotFoundException('Không tìm thấy concert');
    }

    if (role !== 'ADMIN' && concert.organizerId !== userId) {
      throw new ForbiddenException(
        'Bạn không có quyền upload PDF cho concert này',
      );
    }

    const safeFileName = file.originalname.replace(/[^\w.-]+/g, '_');
    const objectKey = `concerts/${concertId}/artist-bio/${randomUUID()}-${safeFileName}`;

    await this.storage.uploadFile({
      objectKey,
      buffer: file.buffer,
      mimeType: file.mimetype,
    });

    const uploadedFile = await this.prisma.uploadedFile.create({
      data: {
        concertId,
        objectKey,
        fileName: file.originalname,
        mimeType: file.mimetype,
        purpose: 'ARTIST_PRESS_KIT',
        status: 'PENDING',
      },
    });

    const job = await this.aiBioQueue.add(
      'generate-artist-bio',
      {
        concertId,
        uploadedFileId: uploadedFile.id,
        objectKey,
      },
      {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 3000,
        },
        removeOnComplete: true,
        removeOnFail: false,
      },
    );

    return {
      message: 'PDF đã được upload, AI Bio sẽ được xử lý nền',
      uploadedFileId: uploadedFile.id,
      jobId: job.id,
      status: uploadedFile.status,
    };
  }

  async getUploadStatus(uploadedFileId: string) {
    const uploadedFile = await this.prisma.uploadedFile.findUnique({
      where: { id: uploadedFileId },
    });

    if (!uploadedFile) {
      throw new NotFoundException('Không tìm thấy file upload');
    }

    return uploadedFile;
  }
}
