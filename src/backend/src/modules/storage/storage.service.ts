import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { Readable } from 'stream';

@Injectable()
export class StorageService {
  private readonly s3: S3Client;
  private readonly bucket: string;

  constructor(private readonly config: ConfigService) {
    this.bucket = this.config.get<string>('MINIO_BUCKET', 'ticketbox');

    this.s3 = new S3Client({
      region: this.config.get<string>('MINIO_REGION', 'us-east-1'),
      endpoint: this.config.get<string>(
        'MINIO_ENDPOINT',
        'http://localhost:9000',
      ),
      forcePathStyle: true,
      credentials: {
        accessKeyId: this.config.get<string>(
          'MINIO_ACCESS_KEY',
          'ticketbox_admin',
        ),
        secretAccessKey: this.config.get<string>(
          'MINIO_SECRET_KEY',
          'ticketbox_password123',
        ),
      },
    });
  }

  async uploadFile(params: {
    objectKey: string;
    buffer: Buffer;
    mimeType: string;
  }) {
    await this.s3.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: params.objectKey,
        Body: params.buffer,
        ContentType: params.mimeType,
      }),
    );

    return {
      bucket: this.bucket,
      objectKey: params.objectKey,
    };
  }

  async downloadFile(objectKey: string): Promise<Buffer> {
    const result = await this.s3.send(
      new GetObjectCommand({
        Bucket: this.bucket,
        Key: objectKey,
      }),
    );

    const stream = result.Body as Readable;
    const chunks: Uint8Array[] = [];

    for await (const chunk of stream) {
      chunks.push(chunk as Uint8Array);
    }

    return Buffer.concat(chunks);
  }
}
