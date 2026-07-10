import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { RedisIoAdapter } from './common/adapters/redis-io.adapter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  // 1. Cấu hình CORS đọc từ biến môi trường
  const appBaseUrl = configService.get<string>('APP_BASE_URL');
  app.enableCors({
    origin: appBaseUrl ? appBaseUrl.split(',') : '*',
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  // Set up Socket.io Redis adapter for WebSocket horizontal scaling
  const redisIoAdapter = new RedisIoAdapter(app);
  await redisIoAdapter.connectToRedis();
  app.useWebSocketAdapter(redisIoAdapter);

  const port = Number(configService.get<string>('PORT') || 3001);

  // 2. Ép buộc bind vào 0.0.0.0 để thoát khỏi container
  await app.listen(port, '0.0.0.0');
  console.log(`Backend is running on port ${port}`);
}

bootstrap().catch((err) => {
  console.error(err);
});
