import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { GlobalExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  await app.listen(process.env.PORT ?? 3000);

  // Global validation pipe to validate incoming requests
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,            // strips unknown fields
      forbidNonWhitelisted: true, // throws an error if unknown fields are present
      transform: true,            // transforms payloads to DTO instances
    }),
  );

  // Global exception filter to handle all exceptions in a centralized manner
  app.useGlobalFilters(new GlobalExceptionFilter())

}
bootstrap();
