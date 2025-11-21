import { NestFactory } from '@nestjs/core';
import { AppModule } from './app/app.module';
import { Logger } from './app/classes/logger';
import { NestExpressApplication } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.useLogger(app.get(Logger));

  app.use(cookieParser());

  app.enableCors({
    origin: true,
    methods: 'GET,PUT,POST,DELETE',
    credentials: true
  });

  app.setGlobalPrefix('api');
  await app.listen(5094);
}
bootstrap();
