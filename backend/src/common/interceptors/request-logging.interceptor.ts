import {
  Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger,
} from '@nestjs/common';
import { Observable, tap, catchError, throwError } from 'rxjs';
import { Request, Response } from 'express';

/**
 * Structured request/response logging interceptor.
 * Logs every HTTP request with correlation-id, method, path, status, and duration.
 * Output is JSON in production so Datadog / CloudWatch can parse it automatically.
 */
@Injectable()
export class RequestLoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') return next.handle();

    const req   = context.switchToHttp().getRequest<Request>();
    const res   = context.switchToHttp().getResponse<Response>();
    const start = Date.now();

    const correlationId = (req.headers['x-correlation-id'] as string) ?? 'none';
    const method  = req.method;
    const url     = req.originalUrl;
    const ip      = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ?? req.socket.remoteAddress;

    return next.handle().pipe(
      tap(() => {
        const duration = Date.now() - start;
        const status   = res.statusCode;
        this.log({ correlationId, method, url, status, duration, ip });
      }),
      catchError(err => {
        const duration = Date.now() - start;
        const status   = err.status ?? 500;
        this.log({ correlationId, method, url, status, duration, ip, error: err.message });
        return throwError(() => err);
      }),
    );
  }

  private log(data: {
    correlationId: string; method: string; url: string;
    status: number; duration: number; ip?: string; error?: string;
  }) {
    const { status, method, url, duration, correlationId, ip, error } = data;
    const msg = `${method} ${url} ${status} ${duration}ms [${correlationId}]${ip ? ` ${ip}` : ''}${error ? ` ERR: ${error}` : ''}`;
    if (status >= 500) {
      this.logger.error(msg);
    } else if (status >= 400) {
      this.logger.warn(msg);
    } else {
      this.logger.log(msg);
    }
  }
}
