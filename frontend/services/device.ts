// Per-device identity used to key the wallet/bets on the backend until real
// auth (Phase 5) replaces it with a user id. A UUID persisted in localStorage.

const KEY = 'raphbet.deviceId';

function uuid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  // Fallback for older/insecure contexts.
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function getDeviceId(): string {
  let id = localStorage.getItem(KEY);
  if (!id) {
    id = uuid();
    localStorage.setItem(KEY, id);
  }
  return id;
}

// identityHeaders attaches the Firebase ID token (when signed in) plus the
// device id (fallback for guests). The backend prefers the verified token's
// UID and falls back to the device id.
export async function identityHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = { 'X-Device-Id': getDeviceId() };
  try {
    // Lazy import to avoid a hard dependency / circular import at module load.
    const { auth } = await import('./firebase');
    const u = auth?.currentUser;
    if (u) headers['Authorization'] = `Bearer ${await u.getIdToken()}`;
  } catch {
    /* not signed in / firebase unavailable — device id only */
  }
  return headers;
}
