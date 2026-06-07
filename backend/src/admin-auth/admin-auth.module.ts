import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AdminAuthService }    from './admin-auth.service';
import { AdminAuthController } from './admin-auth.controller';
import { AdminJwtStrategy }    from './strategies/admin-jwt.strategy';

@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      imports:    [ConfigModule],
      inject:     [ConfigService],
      useFactory: (cfg: ConfigService) => ({
        secret:       cfg.get<string>('ADMIN_JWT_SECRET') ?? cfg.get<string>('JWT_SECRET'),
        signOptions:  { expiresIn: '12h' },
      }),
    }),
  ],
  controllers: [AdminAuthController],
  providers:   [AdminAuthService, AdminJwtStrategy],
  exports:     [AdminAuthService],
})
export class AdminAuthModule {}
