import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Observable, tap, catchError, throwError } from 'rxjs';
import { MetricsBuffer } from '../modules/metrics/metrics.buffer';
import { Request, Response } from 'express';

const SKIP_PATHS = ['/health', '/metrics', '/favicon.ico', '/admin/metrics'];

@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  constructor(private readonly buffer: MetricsBuffer) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const httpContext = context.switchToHttp();

    const req = httpContext.getRequest<Request>();
    const res = httpContext.getResponse<Response>();
    const method = req.method;
    const path = req.path;

    if (SKIP_PATHS.some((p) => path.startsWith(p))) {
      return next.handle();
    }

    const startedAt = Date.now();

    return next.handle().pipe(
      tap(() => {
        this.buffer.push({
          method,
          path: this.normalizePath(path),
          statusCode: res.statusCode,
          durationMs: Date.now() - startedAt,
        });
      }),
      catchError((err: unknown) => {
        const statusCode =
          err instanceof HttpException
            ? err.getStatus()
            : HttpStatus.INTERNAL_SERVER_ERROR;

        this.buffer.push({
          method,
          path: this.normalizePath(path),
          statusCode,
          durationMs: Date.now() - startedAt,
        });

        return throwError(() => err);
      }),
    );
  }

  private normalizePath(path: string): string {
    return path.replace(/\/[0-9a-f-]{8,}/gi, '/:id').replace(/\/\d+/g, '/:id');
  }
}
