import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class PdfExtractService {
  private readonly logger = new Logger(PdfExtractService.name);

  async extractText(buffer: Buffer): Promise<string> {
    let timer: NodeJS.Timeout | undefined;

    try {
      this.logger.log('Đang bắt đầu parse PDF...');
      
      // VŨ KHÍ TỐI THƯỢNG: Ép Node.js chạy require nguyên thủy, 
      // cấm TypeScript can thiệp hay bọc lại thành object.
      const pdfParse = eval('require("pdf-parse")');

      if (typeof pdfParse !== 'function') {
        throw new Error(`Thư viện vẫn bị lỗi nạp. Kiểu thực tế: ${typeof pdfParse}`);
      }

      // Tạo một promise báo lỗi sau 5 giây
      const timeoutPromise = new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error('PDF_PARSE_TIMEOUT')), 5000);
      });

      // Gọi hàm trực tiếp
      const parsePromise = pdfParse(buffer);
      
      // Chạy đua giữa việc đọc file và bộ đếm thời gian
      const result = await Promise.race([parsePromise, timeoutPromise]) as { text: string };
      
      if (timer) clearTimeout(timer); // Hủy bộ đếm thời gian
      
      this.logger.log(`Parse PDF thành công! Độ dài text: ${result.text?.length || 0}`);
      return this.cleanText(result.text || '');
    } catch (error) {
      if (timer) clearTimeout(timer); // Hủy bộ đếm thời gian
      this.logger.error('Lỗi tại PdfExtractService:', error);
      throw error;
    }
  }

  private cleanText(text: string) {
    return text
      .replace(/\s+/g, ' ')
      .replace(/\u0000/g, '')
      .trim();
  }
}