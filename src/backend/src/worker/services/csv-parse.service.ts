import { Injectable, Logger } from '@nestjs/common';
import { parse } from 'csv-parse/sync';

export interface CsvRowResult {
  fullName: string;
  email: string | null;
  phone: string | null;
  sponsorName: string | null;
}

// Khai báo kiểu dữ liệu cho một dòng CSV thô
type RawCsvRow = Record<string, string | undefined>;

@Injectable()
export class CsvParseService {
  private readonly logger = new Logger(CsvParseService.name);

  parseBuffer(buffer: Buffer) {
    this.logger.log('Bắt đầu parse nội dung CSV...');

    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment
    const parsedData = parse(buffer, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });

    // Ép kiểu chặt chẽ để vượt qua strict mode của ESLint
    const records = parsedData as RawCsvRow[];

    const validRecords: CsvRowResult[] = [];
    const errors: string[] = [];

    for (let i = 0; i < records.length; i++) {
      const row = records[i];

      const fullName = row.fullName || row.name || '';

      if (!fullName) {
        errors.push(`Dòng ${i + 2}: Thiếu thông tin bắt buộc (Họ Tên)`);
        continue;
      }

      validRecords.push({
        fullName,
        email: row.email || null,
        phone: row.phone || null,
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