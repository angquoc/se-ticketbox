import { Injectable } from '@nestjs/common';

@Injectable()
export class AiService {
  async generateArtistBio(text: string): Promise<string> {
    const cleaned = text.trim();

    if (!cleaned) {
      throw new Error('AI_INPUT_EMPTY');
    }

    const shortened = cleaned.slice(0, 900);

    return [
      'Đây là phần giới thiệu nghệ sĩ được sinh tự động từ press kit PDF.',
      '',
      `Tóm tắt: ${shortened}`,
      '',
      'Nội dung được rút gọn để phù hợp hiển thị trên trang chi tiết concert.',
    ].join('\n');
  }
}