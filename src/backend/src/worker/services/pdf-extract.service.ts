import { Injectable } from '@nestjs/common';

@Injectable()
export class PdfExtractService {
  async extractText(buffer: Buffer): Promise<string> {
    const pdf = require('pdf-parse');
    const parseFunc = typeof pdf === 'function' ? pdf : pdf.default;

    if (!parseFunc) {
      throw new Error('Không thể khởi tạo thư viện pdf-parse');
    }

    const result = await parseFunc(buffer);
    return this.cleanText(result.text || '');
  }

  private cleanText(text: string) {
    return text
      .replace(/\s+/g, ' ')
      .replace(/\u0000/g, '')
      .trim();
  }
}