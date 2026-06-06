import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService }            from '@nestjs/jwt';
import { UsersService }          from '../users/users.service';
import { FirebaseAdminService }  from '../firebase/firebase-admin.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwt:      JwtService,
    private readonly users:    UsersService,
    private readonly firebase: FirebaseAdminService,
  ) {}

  async signInWithFirebase(idToken: string) {
    let decoded: import('firebase-admin').auth.DecodedIdToken;
    try {
      decoded = await this.firebase.verifyIdToken(idToken);
    } catch {
      throw new UnauthorizedException('Invalid Firebase ID token.');
    }

    const provider = decoded.firebase?.sign_in_provider?.replace('.com', '') ?? 'email';

    const user = await this.users.upsert({
      firebaseUid: decoded.uid,
      email:       decoded.email ?? `${decoded.uid}@unknown.gateml`,
      name:        decoded.name ?? null,
      avatarUrl:   decoded.picture ?? null,
      provider,
    });

    const token = this.jwt.sign({ sub: user.id, email: user.email });
    return {
      token,
      user: { id: user.id, email: user.email, name: user.name, avatarUrl: user.avatarUrl },
    };
  }

  async validatePayload(payload: { sub: string; email: string }) {
    const user = await this.users.findById(payload.sub);
    if (!user) throw new UnauthorizedException('User not found.');
    return user;
  }
}
