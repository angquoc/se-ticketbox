import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { RedisIoAdapter } from './common/adapters/redis-io.adapter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors();
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

  const configService = app.get(ConfigService);
  const port = Number(configService.get<string>('PORT') || 3001);

  await app.listen(port);
  console.log(`Backend is running on http://localhost:${port}`);
}

bootstrap().catch((err) => {
  console.error(err);
});
