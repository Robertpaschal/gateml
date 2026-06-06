import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ApiKeysService } from '../../api-keys/api-keys.service';

/**
 * Guards the /v1/* gateway endpoints.
 * Reads the `Authorization: Bearer gml-sk-*` header, validates the key,
 * and attaches apiKeyContext to the request.
 */
@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private readonly apiKeys: ApiKeysService) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req  = ctx.switchToHttp().getRequest<Request & { apiKeyContext: unknown }>();
    const auth = ((req.headers as unknown) as Record<string, string>)['authorization'] ?? '';

    if (!auth.startsWith('Bearer gml-sk-')) {
      throw new UnauthorizedException('Missing or invalid GateML API key.');
    }

    const key    = auth.slice(7).trim();
    const apiKey = await this.apiKeys.validateAndTouch(key);

    if (!apiKey) throw new UnauthorizedException('Invalid or revoked API key.');

    req.apiKeyContext = {
      apiKeyId: apiKey.id,
      userId:   apiKey.userId,
      keyType:  apiKey.type,
    };
    return true;
  }
}
