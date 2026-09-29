import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common'
import { Request, Response } from 'express'

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name)

  // Catch all exceptions and handle them in a centralized manner
  catch(exception: unknown, host: ArgumentsHost) {

    // Switch to the HTTP context to access request and response objects
    const ctx = host.switchToHttp()
    const response = ctx.getResponse<Response>()
    const request = ctx.getRequest<Request>()

    // Resolve the exception to get the status code and message
    const { statusCode, message } = this.resolveException(exception)

    // Log 5xx errors with full stack — 4xx are expected and don't need noise
    if (statusCode >= 500) {
      this.logger.error(
        `${request.method} ${request.url} → ${statusCode}`,
        exception instanceof Error ? exception.stack : String(exception),
      )
    }

    // Send the structured error response to the client
    response.status(statusCode).json({
      statusCode,
      error: this.httpStatusText(statusCode),
      message,
      timestamp: new Date().toISOString(),
      path: request.url,
    })
  }

  // Resolve the exception to determine the appropriate HTTP status code and message
  private resolveException(exception: unknown): { statusCode: number; message: string | string[] } {
    if (exception instanceof HttpException) {
      const statusCode = exception.getStatus()
      const body = exception.getResponse()

      // ValidationPipe throws with { message: string[], error: string }
      // extract the array so clients get individual field errors

      // If the exception body is an object with a 'message' property, return that message
      if (typeof body === 'object' && body !== null && 'message' in body) {
        return { statusCode, message: (body as any).message }
      }

      // Otherwise, return the exception's message directly
      return { statusCode, message: exception.message }
    }

    // Unhandled exceptions → 500, don't leak internals
    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'An unexpected error occurred',
    }
  }

  // Map HTTP status codes to their standard text representation
  private httpStatusText(statusCode: number): string {
    const texts: Record<number, string> = {
      400: 'Bad Request',
      401: 'Unauthorized',
      403: 'Forbidden',
      404: 'Not Found',
      409: 'Conflict',
      422: 'Unprocessable Entity',
      429: 'Too Many Requests',
      500: 'Internal Server Error',
    }
    return texts[statusCode] ?? 'Error'
  }
}