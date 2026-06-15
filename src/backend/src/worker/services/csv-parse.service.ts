import { Injectable, Logger } from '@nestjs/common';
import { parse } from 'csv-parse/sync';

export interface CsvRowResult {
  fullName: string;
  email: string | null;
  phone: string | null;
  sponsorName: string | null;
}

@Injectable()
export class CsvParseService {
  private readonly logger = new Logger(CsvParseService.name);

  parseBuffer(buffer: Buffer) {
    this.logger.log('Bắt đầu parse nội dung CSV...');
    
    // Đọc CSV bỏ qua dòng tiêu đề, tự động trim khoảng trắng
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
    const records = parse(buffer, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });

    const validRecords: CsvRowResult[] = [];
    const errors: string[] = [];

    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    for (let i = 0; i < records.length; i++) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      const row = records[i];
      
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      const fullName = row.fullName || row.name || '';
      
      if (!fullName) {
        errors.push(`Dòng ${i + 2}: Thiếu thông tin bắt buộc (Họ Tên)`);
        continue;
      }

      validRecords.push({
        fullName,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        email: row.email || null,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        phone: row.phone || null,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        sponsorName: row.sponsorName || row.sponsor || null,
      });
    }

    return {
      total: records.length,
      validRecords,
      errors,
    };
  }
}