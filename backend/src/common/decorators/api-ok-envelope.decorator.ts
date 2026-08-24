import { applyDecorators, Type } from '@nestjs/common';
import { ApiExtraModels, ApiOkResponse, getSchemaPath } from '@nestjs/swagger';

/**
 * The app's ResponseEnvelopeInterceptor wraps every success response as
 * `{ success: true, data }` (§12.1). Without this decorator, generated
 * Swagger docs show the bare DTO instead of the actual wire shape — wrong
 * from day one. Established now, on the health endpoint, so Phase 1+
 * endpoints reuse it instead of retrofitting it across the API surface.
 */
export function ApiOkEnvelope(model: Type<unknown>) {
  return applyDecorators(
    ApiExtraModels(model),
    ApiOkResponse({
      schema: {
        properties: {
          success: { type: 'boolean', example: true },
          data: { $ref: getSchemaPath(model) },
        },
      },
    }),
  );
}
