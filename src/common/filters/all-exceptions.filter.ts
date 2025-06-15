/* eslint-disable @typescript-eslint/no-unsafe-assignment */

/* eslint-disable @typescript-eslint/no-unsafe-member-access */

// src/common/filters/all-exceptions.filter.ts
// src/common/filters/all-exceptions.filter.ts

import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { EntityNotFoundError } from 'typeorm';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | string[] = 'Internal server error';

    // Log the full exception stack
    this.logger.error(
      `Exception on ${request.method} ${request.url}`,
      exception?.stack || exception?.message,
    );

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();

      if (typeof res === 'object' && res !== null) {
        const responseBody = res as any;
        message = responseBody.message ?? exception.message;
      } else {
        message = res;
      }

      // Handle JWT expiration
      if (
        exception instanceof UnauthorizedException &&
        exception.message === 'jwt expired'
      ) {
        return response.status(HttpStatus.UNAUTHORIZED).json({
          success: false,
          statusCode: HttpStatus.UNAUTHORIZED,
          path: request.url,
          message: 'Your session has expired. Please log in again.',
        });
      }
    }

    // Specific handling for TypeORM EntityNotFoundError
    else if (exception instanceof EntityNotFoundError) {
      status = HttpStatus.NOT_FOUND;
      message = 'Resource not found';
    }

    // Generic JS Error (e.g. throw new Error())
    else if (exception instanceof Error) {
      message = exception.message;
    }

    // Final structured response
    response.status(status).json({
      success: false,
      statusCode: status,
      path: request.url,
      message,
    });
  }
}
