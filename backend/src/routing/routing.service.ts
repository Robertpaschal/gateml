import { Injectable } from '@nestjs/common';
import { FirebaseAdminService } from '../firebase/firebase-admin.service';

export interface FallbackEntry { model: string; on: number[] }

const DEFAULTS = {
  primaryModel:  'gpt-4o',
  fallbackChain: [
    { model: 'claude-sonnet-4-6', on: [429, 500, 502, 503] },
    { model: 'gpt-4o-mini',       on: [429, 500, 502, 503] },
  ] as FallbackEntry[],
};

@Injectable()
export class RoutingService {
  constructor(private readonly firebase: FirebaseAdminService) {}

  async get(userId: string) {
    const cfg = await this.firebase.getRoutingConfig(userId);
    return cfg ?? DEFAULTS;
  }

  async update(userId: string, primaryModel: string, fallbackChain: FallbackEntry[]) {
    await this.firebase.setRoutingConfig(userId, { primaryModel, fallbackChain });
    return { primaryModel, fallbackChain };
  }

  /** Used internally by GatewayService. */
  async getFallbackChain(userId: string): Promise<FallbackEntry[]> {
    const cfg = await this.firebase.getRoutingConfig(userId);
    return cfg?.fallbackChain ?? DEFAULTS.fallbackChain;
  }
}
