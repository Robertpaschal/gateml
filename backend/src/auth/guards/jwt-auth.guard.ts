import { Injectable } from '@nestjs/common';
import { AuthGuard }   from '@nestjs/passport';

/** Requires a valid GateML JWT (issued by POST /auth/firebase). */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
