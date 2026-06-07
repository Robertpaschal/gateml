import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { AdminUser } from '@prisma/client';

export const GetAdminUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AdminUser => {
    return ctx.switchToHttp().getRequest().user as AdminUser;
  },
);
