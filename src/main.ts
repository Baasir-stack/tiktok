/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/no-floating-promises */
/* eslint-disable prettier/prettier */
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { ValidationPipe } from '@nestjs/common';
import { ResponseFormatInterceptor } from './common/interceptors/response-format.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalFilters(new AllExceptionsFilter());

  // 🔐 Enable validation globally
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // strip unknown properties
      forbidNonWhitelisted: true, // error on unknown properties
      transform: true, // auto-transform payloads to DTO classes
      transformOptions: {
        enableImplicitConversion: true,
      },
      // 👇 THIS enables helpful validation error messages
      validationError: {
        target: false,
        value: false,
      },
    }),
  );

  app.enableCors({
    origin: 'http://localhost:3000', // your frontend’s URL
    credentials: true, // <-- allows Set-Cookie and sending cookies
  });

  // Global interceptor for response formatting
  app.useGlobalInterceptors(new ResponseFormatInterceptor());
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
