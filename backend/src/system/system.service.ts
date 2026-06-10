/**
 * SystemService
 *
 * On startup, writes two things to Firestore (free operations):
 *  1. systemStatus doc  → the sidebar "All systems operational" indicator
 *  2. changelog entries → the public /changelog page reads live from Firestore
 *     instead of having entries hardcoded in two places in the frontend.
 *
 * Both can be updated at runtime via the /system/* endpoints without redeployment.
 */
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { FirebaseAdminService, ChangelogEntry } from '../firebase/firebase-admin.service';

const CHANGELOG: Array<ChangelogEntry & { id: string }> = [
  {
    id: 'v0.3.0',
    order: 1,
    version: 'v0.3.0',
    date: 'June 2026',
    title: 'Go, Ruby & PHP SDKs · NestJS backend · Firebase deep integration',
    tag: 'new',
    changes: [
      'Official SDKs for Go, Ruby, and PHP',
      'Backend rewritten in NestJS with Prisma + PostgreSQL',
      'Firestore real-time dashboard (replaces 10-second polling)',
      'FCM push notifications for budget and error-rate alerts',
      'System status and changelog served live from Firestore',
    ],
  },
  {
    id: 'v0.2.0',
    order: 2,
    version: 'v0.2.0',
    date: 'May 2026',
    title: 'Eval Testing & Prompt Versioning',
    tag: 'new',
    changes: [
      'Eval Testing: write assertions against your prompts, run in CI',
      'Prompt Versioning: full diff view, one-click rollback',
      'Request Replay: inspect and copy-as-cURL any historical request',
      'Cost breakdown by model in the Observability tab',
    ],
  },
  {
    id: 'v0.1.0',
    order: 3,
    version: 'v0.1.0',
    date: 'April 2026',
    title: 'Public Beta Launch',
    tag: 'launch',
    changes: [
      'OpenAI-compatible gateway — /v1/chat/completions, /v1/models',
      'Test keys return synthetic responses — no LLM calls, no cost',
      'Live keys forward to your stored provider keys (OpenAI, Anthropic, Google)',
      'Automatic fallback chain with exponential backoff',
      'Real-time request log with latency, token count, and cost',
      'Python and TypeScript SDKs',
    ],
  },
];

@Injectable()
export class SystemService implements OnModuleInit {
  private readonly logger = new Logger(SystemService.name);

  constructor(private readonly firebase: FirebaseAdminService) {}

  async onModuleInit() {
    await this.seedSystemStatus();
    await this.seedChangelog();
  }

  async seedSystemStatus() {
    if (!this.firebase.isReady) {
      this.logger.warn('Skipping system status seed — Firebase not configured.');
      return;
    }
    await this.firebase.setSystemStatus({
      operational:      true,
      message:          'All systems operational',
      affectedServices: [],
    });
    this.logger.log('System status written to Firestore.');
  }

  async seedChangelog() {
    if (!this.firebase.isReady) {
      this.logger.warn('Skipping changelog seed — Firebase not configured.');
      return;
    }
    for (const { id, ...entry } of CHANGELOG) {
      await this.firebase.upsertChangelogEntry(id, entry);
    }
    this.logger.log(`${CHANGELOG.length} changelog entries synced to Firestore.`);
  }

  /** Update system status at runtime — call from an admin endpoint or health check. */
  async setStatus(operational: boolean, message: string, affectedServices: string[] = []) {
    await this.firebase.setSystemStatus({ operational, message, affectedServices });
  }

  /**
   * Add or update a single changelog entry in Firestore.
   * Lets you publish release notes without redeploying the backend.
   * The `id` (e.g. "v0.4.0") is the Firestore document key.
   */
  async upsertEntry(id: string, entry: ChangelogEntry) {
    await this.firebase.upsertChangelogEntry(id, entry);
    this.logger.log(`Changelog entry ${id} upserted.`);
  }
}
