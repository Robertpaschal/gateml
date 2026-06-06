/**
 * FirebaseAdminService
 *
 * Single source of truth for Firebase Admin SDK in the backend.
 * Used by:
 *  - AuthService          → verifyIdToken()
 *  - GatewayService       → writeUserPulse()  (real-time dashboard feed)
 *  - NotificationsService → sendFcm()         (push alerts)
 *  - SystemStatusService  → setStatus()       (sidebar status indicator)
 *  - ChangelogService     → seedChangelog()   (dynamic changelog)
 */
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService }                    from '@nestjs/config';
import * as admin from 'firebase-admin';

@Injectable()
export class FirebaseAdminService implements OnModuleInit {
  private readonly logger = new Logger(FirebaseAdminService.name);
  private ready = false;

  constructor(private readonly config: ConfigService) {}

  onModuleInit() {
    if (admin.apps.length) {
      this.ready = true;
      return;
    }

    const projectId   = this.config.get<string>('FIREBASE_PROJECT_ID');
    const clientEmail = this.config.get<string>('FIREBASE_CLIENT_EMAIL');
    const privateKey  = this.config.get<string>('FIREBASE_PRIVATE_KEY')?.replace(/\\n/g, '\n');

    if (!projectId || !clientEmail || !privateKey) {
      this.logger.warn('Firebase credentials missing — real-time features disabled.');
      return;
    }

    admin.initializeApp({ credential: admin.credential.cert({ projectId, clientEmail, privateKey }) });
    this.ready = true;
    this.logger.log('Firebase Admin SDK initialised.');
  }

  // ── Auth ───────────────────────────────────────────────────────────────────

  async verifyIdToken(idToken: string): Promise<admin.auth.DecodedIdToken> {
    this.assertReady();
    return admin.auth().verifyIdToken(idToken);
  }

  // ── Firestore ──────────────────────────────────────────────────────────────

  firestore(): admin.firestore.Firestore {
    this.assertReady();
    return admin.firestore();
  }

  /**
   * Write a condensed "pulse" document for a user.
   * The frontend listens to this document with onSnapshot() instead of polling.
   *
   * Collection: userPulse/{userId}
   * This is updated (merge: true) on every gateway request — cheap, because it's
   * always the same single document being overwritten, not a new document per request.
   */
  async writeUserPulse(userId: string, pulse: UserPulse): Promise<void> {
    if (!this.ready) return;
    try {
      await this.firestore()
        .collection('userPulse')
        .doc(userId)
        .set({ ...pulse, updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
    } catch (err) {
      this.logger.warn(`Failed to write user pulse: ${String(err)}`);
    }
  }

  // ── Routing Config ─────────────────────────────────────────────────────────
  // Stored in routingConfig/{userId} to eliminate a PostgreSQL hit per gateway call.

  async getRoutingConfig(userId: string): Promise<RoutingConfigDoc | null> {
    if (!this.ready) return null;
    try {
      const snap = await this.firestore().collection('routingConfig').doc(userId).get();
      return snap.exists ? (snap.data() as RoutingConfigDoc) : null;
    } catch (err) {
      this.logger.warn(`Failed to read routing config: ${String(err)}`);
      return null;
    }
  }

  async setRoutingConfig(userId: string, config: RoutingConfigDoc): Promise<void> {
    if (!this.ready) return;
    try {
      await this.firestore().collection('routingConfig').doc(userId).set(config);
    } catch (err) {
      this.logger.warn(`Failed to write routing config: ${String(err)}`);
    }
  }

  // ── User Settings (FCM token) ──────────────────────────────────────────────
  // Stored in userSettings/{userId} — only accessed server-side via Admin SDK.

  async getFcmToken(userId: string): Promise<string | null> {
    if (!this.ready) return null;
    try {
      const snap = await this.firestore().collection('userSettings').doc(userId).get();
      return snap.exists ? ((snap.data()?.fcmToken as string | undefined) ?? null) : null;
    } catch (err) {
      this.logger.warn(`Failed to read FCM token: ${String(err)}`);
      return null;
    }
  }

  async setFcmToken(userId: string, token: string): Promise<void> {
    if (!this.ready) return;
    try {
      await this.firestore()
        .collection('userSettings')
        .doc(userId)
        .set({ fcmToken: token }, { merge: true });
    } catch (err) {
      this.logger.warn(`Failed to set FCM token: ${String(err)}`);
    }
  }

  async clearFcmToken(userId: string): Promise<void> {
    if (!this.ready) return;
    try {
      await this.firestore()
        .collection('userSettings')
        .doc(userId)
        .set({ fcmToken: null }, { merge: true });
    } catch (err) {
      this.logger.warn(`Failed to clear FCM token: ${String(err)}`);
    }
  }

  /** Write a system-wide status document the dashboard sidebar subscribes to. */
  async setSystemStatus(status: SystemStatus): Promise<void> {
    if (!this.ready) return;
    try {
      await this.firestore()
        .collection('meta')
        .doc('systemStatus')
        .set({ ...status, updatedAt: admin.firestore.FieldValue.serverTimestamp() });
    } catch (err) {
      this.logger.warn(`Failed to set system status: ${String(err)}`);
    }
  }

  /** Upsert a changelog entry so the public changelog page reads live data. */
  async upsertChangelogEntry(id: string, entry: ChangelogEntry): Promise<void> {
    if (!this.ready) return;
    try {
      await this.firestore().collection('changelog').doc(id).set(entry, { merge: true });
    } catch (err) {
      this.logger.warn(`Failed to upsert changelog: ${String(err)}`);
    }
  }

  // ── FCM (Cloud Messaging) ──────────────────────────────────────────────────

  /**
   * Send a push notification to a single FCM token.
   * Returns true on success, false if the token is invalid (caller should clear it).
   */
  async sendFcm(token: string, notification: FcmPayload): Promise<boolean> {
    if (!this.ready) return false;
    try {
      await admin.messaging().send({
        token,
        notification: { title: notification.title, body: notification.body },
        webpush: {
          notification: {
            icon:  '/icon-192.png',
            badge: '/badge-72.png',
            data:  notification.data ?? {},
          },
          fcmOptions: { link: notification.link ?? 'https://gateml.io/dashboard' },
        },
      });
      return true;
    } catch (err: unknown) {
      const code = (err as { code?: string }).code;
      if (code === 'messaging/invalid-registration-token' ||
          code === 'messaging/registration-token-not-registered') {
        return false;   // Caller should delete stale token
      }
      this.logger.warn(`FCM send failed: ${String(err)}`);
      return false;
    }
  }

  // ── Internals ──────────────────────────────────────────────────────────────

  private assertReady(): void {
    if (!this.ready) throw new Error('Firebase Admin SDK is not configured.');
  }
}

// ── Shared types ──────────────────────────────────────────────────────────────

export interface UserPulse {
  lastRequestAt:   admin.firestore.FieldValue | Date;
  latestStatus:    number;
  latestModel:     string;
  latestLatencyMs: number;
  latestCostUsd:   number;
  isTestMode:      boolean;
  dailyCalls:      number;
  dailyCostUsd:    number;
  errorRate:       number;
}

export interface SystemStatus {
  operational: boolean;
  message:     string;          // "All systems operational" | "Degraded performance" | etc.
  affectedServices: string[];   // [] or ["gateway", "analytics"]
}

export interface ChangelogEntry {
  version:  string;
  date:     string;
  title:    string;
  tag:      string;   // "new" | "fix" | "launch"
  changes:  string[];
  order:    number;   // Lower = newer (for sorting)
}

export interface FcmPayload {
  title: string;
  body:  string;
  link?: string;
  data?: Record<string, string>;
}

export interface RoutingConfigDoc {
  primaryModel:  string;
  fallbackChain: Array<{ model: string; on: number[] }>;
}
