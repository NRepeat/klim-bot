import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const ApiToken = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): string | undefined => {
    const request = ctx
      .switchToHttp()
      .getRequest<{ headers: Record<string, string | string[]> }>();
    const headers = request.headers || {};
    return (
      (typeof headers['x-api-token'] === 'string'
        ? headers['x-api-token']
        : Array.isArray(headers['x-api-token'])
          ? headers['x-api-token'][0]
          : undefined) ||
      (typeof headers['X-API-TOKEN'] === 'string'
        ? headers['X-API-TOKEN']
        : Array.isArray(headers['X-API-TOKEN'])
          ? headers['X-API-TOKEN'][0]
          : undefined)
    );
  },
);
