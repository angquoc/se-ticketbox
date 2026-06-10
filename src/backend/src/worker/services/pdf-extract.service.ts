import { Injectable } from '@nestjs/common';

const pdfParse = require('pdf-parse');

@Injectable()
export class PdfExtractService {
  async extractText(buffer: Buffer): Promise<string> {
    const result = await pdfParse(buffer);
    return this.cleanText(result.text || '');
  }

  private cleanText(text: string) {
    return text
      .replace(/\s+/g, ' ')
      .replace(/\u0000/g, '')
      .trim();
  }
}