import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface ApiKeyContext {
  apiKeyId: string;
  userId:   string;
  keyType:  'TEST' | 'LIVE';
}

/** Extracts the API key context set by ApiKeyGuard from the request. */
export const ApiKeyCtx = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): ApiKeyContext => {
    return ctx.switchToHttp().getRequest().apiKeyContext as ApiKeyContext;
  },
);
