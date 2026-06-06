import { Global, Module } from '@nestjs/common';
import { FirebaseAdminService } from './firebase-admin.service';

@Global()   // Firestore + FCM available everywhere without re-importing
@Module({
  providers: [FirebaseAdminService],
  exports:   [FirebaseAdminService],
})
export class FirebaseAdminModule {}
