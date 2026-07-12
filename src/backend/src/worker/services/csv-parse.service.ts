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

    const parsedData = parse(buffer, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });

    // Ép kiểu chặt chẽ để vượt qua strict mode của ESLint
    const records = parsedData as RawCsvRow[];

    const validRecords: CsvRowResult[] = [];
    const errors: string[] = [];

    const seenEmails = new Set<string>();
    const seenPhones = new Set<string>();
    
    // Regex cơ bản
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const phoneRegex = /^[0-9]{10,11}$/;

    for (let i = 0; i < records.length; i++) {
      const row = records[i];

      const fullName = row.fullName || row.name || '';
      if (!fullName) {
        errors.push(`Dòng ${i + 2}: Thiếu thông tin bắt buộc (Họ Tên)`);
        continue;
      }

      const email = row.email?.trim() || null;
      const phone = row.phone?.trim() || null;

      let hasError = false;

      if (email) {
        if (!emailRegex.test(email)) {
          errors.push(`Dòng ${i + 2}: Email sai định dạng (${email})`);
          hasError = true;
        } else if (seenEmails.has(email)) {
          errors.push(`Dòng ${i + 2}: Email bị trùng lặp trong file (${email})`);
          hasError = true;
        }
        seenEmails.add(email);
      }

      if (phone) {
        if (!phoneRegex.test(phone)) {
          errors.push(`Dòng ${i + 2}: Số điện thoại sai định dạng (${phone})`);
          hasError = true;
        } else if (seenPhones.has(phone)) {
          errors.push(`Dòng ${i + 2}: Số điện thoại bị trùng lặp trong file (${phone})`);
          hasError = true;
        }
        seenPhones.add(phone);
      }

      // Vẫn push vào validRecords để frontend có thể hiển thị chúng ở trạng thái "Invalid"
      // nhưng mảng errors vẫn có data để worker set status thành COMPLETED_WITH_ERRORS
      validRecords.push({
        fullName,
        email,
        phone,
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
