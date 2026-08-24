import { CallHandler, ExecutionContext, StreamableFile } from '@nestjs/common';
import { of } from 'rxjs';
import { ResponseEnvelopeInterceptor } from './response-envelope.interceptor';

function createHandler(value: unknown): CallHandler {
  return { handle: () => of(value) };
}

describe('ResponseEnvelopeInterceptor', () => {
  const interceptor = new ResponseEnvelopeInterceptor();
  const context = {} as ExecutionContext;

  it('wraps plain data as { success: true, data }', (done) => {
    interceptor
      .intercept(context, createHandler({ status: 'ok' }))
      .subscribe((result) => {
        expect(result).toEqual({ success: true, data: { status: 'ok' } });
        done();
      });
  });

  it('passes through an already-paginated { data, meta } shape', (done) => {
    const paginated = {
      data: [{ id: '1' }],
      meta: { page: 1, pageSize: 20, totalItems: 1, totalPages: 1 },
    };

    interceptor
      .intercept(context, createHandler(paginated))
      .subscribe((result) => {
        expect(result).toEqual({ success: true, ...paginated });
        done();
      });
  });

  it('bypasses StreamableFile responses unwrapped', (done) => {
    const file = new StreamableFile(Buffer.from('pdf-bytes'));

    interceptor.intercept(context, createHandler(file)).subscribe((result) => {
      expect(result).toBe(file);
      done();
    });
  });
});
