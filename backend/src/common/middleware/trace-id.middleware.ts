import { Injectable, NestMiddleware } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { NextFunction, Request, Response } from 'express';

export interface RequestWithTraceId extends Request {
  traceId: string;
}

/**
 * Assigns a per-request trace ID (honoring an inbound `x-request-id` if a
 * caller/load-balancer already set one), echoes it back as a response
 * header, and stashes it on the request so AllExceptionsFilter can include
 * it in every error envelope (§12.3) without recomputing it.
 */
@Injectable()
export class TraceIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    const traceId =
      (req.headers['x-request-id'] as string | undefined) ?? randomUUID();
    (req as RequestWithTraceId).traceId = traceId;
    res.setHeader('x-request-id', traceId);
    next();
  }
}
