import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  StreamableFile,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

interface PaginatedShape {
  data: unknown;
  meta: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
}

function isPaginatedShape(value: unknown): value is PaginatedShape {
  return (
    typeof value === 'object' &&
    value !== null &&
    'data' in value &&
    'meta' in value
  );
}

/**
 * Wraps every success response per §12.1/12.2:
 *   { success: true, data }                — single resource
 *   { success: true, data, meta }          — paginated list
 *
 * so frontend code never branches on response shape per-endpoint.
 */
@Injectable()
export class ResponseEnvelopeInterceptor implements NestInterceptor {
  intercept(
    _context: ExecutionContext,
    next: CallHandler,
  ): Observable<unknown> {
    return next.handle().pipe(
      map((value: unknown) => {
        // File/PDF downloads (Phase 4+) must not be wrapped as JSON.
        if (value instanceof StreamableFile) {
          return value;
        }
        if (isPaginatedShape(value)) {
          return { success: true, data: value.data, meta: value.meta };
        }
        return { success: true, data: value };
      }),
    );
  }
}
