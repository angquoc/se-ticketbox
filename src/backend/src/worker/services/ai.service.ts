import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private genAI: GoogleGenerativeAI | null = null;

  constructor(private readonly config: ConfigService) {
    const apiKey = this.config.get<string>('GEMINI_API_KEY');
    if (apiKey) {
      this.genAI = new GoogleGenerativeAI(apiKey);
    }
  }

  async generateArtistBio(text: string): Promise<string> {
    const cleaned = text.trim();

    if (!cleaned) {
      throw new Error('AI_INPUT_EMPTY');
    }

    if (!this.genAI) {
      this.logger.warn('Không tìm thấy GEMINI_API_KEY. Sử dụng dữ liệu mock.');
      const shortened = cleaned.slice(0, 900);
      return [
        'Đây là phần giới thiệu nghệ sĩ được sinh tự động từ press kit PDF.',
        '',
        `Tóm tắt: ${shortened}`,
        '',
        'Nội dung được rút gọn để phù hợp hiển thị trên trang chi tiết concert.',
      ].join('\n');
    }

    try {
      const model = this.genAI.getGenerativeModel({
        model: 'gemini-2.5-flash',
      });

      const prompt = `
        Bạn là một chuyên gia biên tập nội dung cho các sự kiện âm nhạc.
        Dưới đây là văn bản trích xuất từ press kit của nghệ sĩ.
        Hãy viết một đoạn giới thiệu nghệ sĩ (Artist Bio) thật chuyên nghiệp, cuốn hút, độ dài khoảng 150 đến 200 từ để hiển thị trên trang bán vé.

        Văn bản gốc:
        """
        ${cleaned}
        """
      `;

      const result = await model.generateContent(prompt);
      const response = result.response;
      return response.text().trim();
    } catch (error) {
      this.logger.error('Gọi dịch vụ AI thất bại', error);
      throw error;
    }
  }
}
