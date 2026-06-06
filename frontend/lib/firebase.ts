/**
 * Firebase client-side SDK — single initialisation point.
 *
 * What uses Firebase here:
 *  - Auth         → Google, GitHub, Apple sign-in via popup
 *  - Firestore    → Real-time dashboard pulse (replaces 10s polling)
 *                   System status in sidebar
 *                   Changelog on /changelog page
 *  - FCM          → Push notifications for budget/error alerts
 */
import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  GithubAuthProvider,
  OAuthProvider,
  signInWithPopup,
  signOut as fbSignOut,
  type Auth,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  collection,
  onSnapshot,
  query,
  orderBy,
  type Firestore,
  type Unsubscribe,
} from 'firebase/firestore';
import {
  getMessaging,
  getToken,
  onMessage,
  type Messaging,
} from 'firebase/messaging';

// ── Singleton helpers ─────────────────────────────────────────────────────────

let app: FirebaseApp;
let auth: Auth;
let db: Firestore;
let messaging: Messaging | null = null;

function init() {
  if (!app) {
    app = getApps().length
      ? getApps()[0]!
      : initializeApp({
          apiKey:    process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
          authDomain:process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
          projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
          appId:     process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
        });
    auth = getAuth(app);
    db   = getFirestore(app);
  }
  return { app, auth, db };
}

// ── Auth ──────────────────────────────────────────────────────────────────────

export async function signInWithGoogle(): Promise<string> {
  const { auth } = init();
  const provider  = new GoogleAuthProvider();
  provider.addScope('email'); provider.addScope('profile');
  return (await signInWithPopup(auth, provider)).user.getIdToken();
}

export async function signInWithGithub(): Promise<string> {
  const { auth } = init();
  const provider  = new GithubAuthProvider();
  provider.addScope('user:email');
  return (await signInWithPopup(auth, provider)).user.getIdToken();
}

export async function signInWithApple(): Promise<string> {
  const { auth } = init();
  const provider  = new OAuthProvider('apple.com');
  provider.addScope('email'); provider.addScope('name');
  return (await signInWithPopup(auth, provider)).user.getIdToken();
}

export async function signOut(): Promise<void> {
  await fbSignOut(init().auth);
}

// ── Firestore: User Pulse ────────────────────────────────────────────────────
//
// The backend writes `userPulse/{userId}` on every gateway request.
// The frontend subscribes here and triggers a data refresh — giving instant
// dashboard updates without any polling interval.
//
// Firestore rules (set in Firebase console):
//   match /userPulse/{userId} {
//     allow read: if request.auth.uid == userId;
//   }

export interface UserPulse {
  lastRequestAt:   { toDate(): Date } | null;
  latestStatus:    number;
  latestModel:     string;
  latestLatencyMs: number;
  latestCostUsd:   number;
  isTestMode:      boolean;
  dailyCalls:      number;
  dailyCostUsd:    number;
  errorRate:       number;
}

export function subscribeToUserPulse(
  userId: string,
  onPulse: (pulse: UserPulse) => void,
): Unsubscribe {
  const { db } = init();
  return onSnapshot(doc(db, 'userPulse', userId), snap => {
    if (snap.exists()) onPulse(snap.data() as UserPulse);
  });
}

// ── Firestore: System Status ──────────────────────────────────────────────────
//
// The backend writes `meta/systemStatus` on startup and via POST /system/status.
// The sidebar subscribes so "All systems operational" is live, not hardcoded.

export interface SystemStatus {
  operational:      boolean;
  message:          string;
  affectedServices: string[];
}

export function subscribeToSystemStatus(
  onStatus: (status: SystemStatus) => void,
): Unsubscribe {
  const { db } = init();
  return onSnapshot(doc(db, 'meta', 'systemStatus'), snap => {
    if (snap.exists()) onStatus(snap.data() as SystemStatus);
  });
}

// ── Firestore: Changelog ──────────────────────────────────────────────────────
//
// The changelog page reads entries from Firestore instead of hardcoded data.
// Backend seeds entries via SystemService.seedChangelog().

export interface ChangelogEntry {
  id?:      string;
  version:  string;
  date:     string;
  title:    string;
  tag:      string;
  changes:  string[];
  order:    number;
}

export function subscribeToChangelog(
  onEntries: (entries: ChangelogEntry[]) => void,
): Unsubscribe {
  const { db } = init();
  const q = query(collection(db, 'changelog'), orderBy('order', 'asc'));
  return onSnapshot(q, snap => {
    const entries = snap.docs.map(d => ({ id: d.id, ...d.data() } as ChangelogEntry));
    onEntries(entries);
  });
}

// ── FCM: Push Notifications ───────────────────────────────────────────────────

const FCM_VAPID = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY; // optional

/**
 * Request notification permission, get an FCM token, and return it.
 * Returns null if permission was denied or FCM is not available.
 *
 * Call this once after the user logs in. Send the token to POST /notifications/token.
 */
export async function requestFcmToken(): Promise<string | null> {
  if (typeof Notification === 'undefined') return null;
  if (Notification.permission === 'denied') return null;

  try {
    const { app } = init();
    // Messaging is not available in all browsers (e.g. Safari < 16.4)
    if (!messaging) messaging = getMessaging(app);

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return null;

    return await getToken(messaging, {
      vapidKey: FCM_VAPID,
      serviceWorkerRegistration: await navigator.serviceWorker.register('/firebase-messaging-sw.js'),
    });
  } catch {
    return null;
  }
}

/** Handle foreground FCM messages (tab is open). */
export function onForegroundMessage(
  handler: (payload: { notification?: { title?: string; body?: string } }) => void,
): Unsubscribe | (() => void) {
  try {
    const { app } = init();
    if (!messaging) messaging = getMessaging(app);
    return onMessage(messaging, handler);
  } catch {
    return () => undefined;
  }
}
