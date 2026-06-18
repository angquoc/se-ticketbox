import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors();
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  const configService = app.get(ConfigService);
  const port = Number(configService.get<string>('PORT') || 3001);

  await app.listen(port);
  console.log(`Backend is running on http://localhost:${port}`);
}

bootstrap().catch((err) => {
  console.error(err);
});
