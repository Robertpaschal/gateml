import { Module } from '@nestjs/common';
import { NotificationsController } from './notifications.controller';
import { NotificationsService }    from './notifications.service';

// FirebaseAdminModule is @Global() — no import needed

@Module({
  controllers: [NotificationsController],
  providers:   [NotificationsService],
  exports:     [NotificationsService],
})
export class NotificationsModule {}
