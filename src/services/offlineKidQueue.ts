// Offline Kid Registration Queue with Exponential Backoff Auto-Retry
import { ChildProfile, LanguageCode } from '../types';
import { relayClient } from './relayClient';

export interface QueuedKidRegistration {
  qr_id: string;
  mother_name: string;
  father_name: string;
  child_name?: string;
  photo_url: string;
  contact_number_primary: string;
  contact_number_secondary?: string;
  language_pref: LanguageCode;
  created_by_user_id: string;
  timestamp: number;
  retryCount: number;
  lastError?: string;
}

type SyncListener = (pendingCount: number) => void;

class OfflineKidQueue {
  private readonly STORAGE_KEY = 'fmf_offline_kid_queue';
  private listeners: Set<SyncListener> = new Set();
  private isSyncing = false;
  private syncTimer: any = null;
  private currentDelayMs = 2000;
  private readonly MAX_DELAY_MS = 32000;

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        console.log('[OFFLINE QUEUE] Network online detected. Initiating sync...');
        this.resetDelayAndSync();
      });
      // Periodic check
      setInterval(() => {
        if (navigator.onLine && this.getQueue().length > 0 && !this.isSyncing) {
          this.syncQueue();
        }
      }, 10000);
    }
  }

  public subscribe(listener: SyncListener): () => void {
    this.listeners.add(listener);
    listener(this.getQueue().length);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    const count = this.getQueue().length;
    this.listeners.forEach((fn) => fn(count));
  }

  public getQueue(): QueuedKidRegistration[] {
    try {
      if (typeof window === 'undefined') return [];
      const raw = localStorage.getItem(this.STORAGE_KEY);
      if (!raw) return [];
      const list = JSON.parse(raw);
      return Array.isArray(list) ? list : [];
    } catch {
      return [];
    }
  }

  private saveQueue(queue: QueuedKidRegistration[]) {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(queue));
      this.notify();
    } catch (e) {
      console.error('[OFFLINE QUEUE] Failed to save queue:', e);
    }
  }

  public enqueue(item: Omit<QueuedKidRegistration, 'timestamp' | 'retryCount'>): QueuedKidRegistration {
    const queue = this.getQueue();
    // Check if already queued
    const existingIndex = queue.findIndex((q) => q.qr_id === item.qr_id);
    const queuedItem: QueuedKidRegistration = {
      ...item,
      timestamp: Date.now(),
      retryCount: 0,
    };

    if (existingIndex >= 0) {
      queue[existingIndex] = queuedItem;
    } else {
      queue.push(queuedItem);
    }

    this.saveQueue(queue);
    this.scheduleNextSync(1000);
    return queuedItem;
  }

  public removeFromQueue(qr_id: string) {
    const queue = this.getQueue().filter((q) => q.qr_id !== qr_id);
    this.saveQueue(queue);
  }

  public isQueued(qr_id: string): boolean {
    return this.getQueue().some((q) => q.qr_id === qr_id);
  }

  public getPendingForUser(userId: string): ChildProfile[] {
    return this.getQueue()
      .filter((q) => q.created_by_user_id === userId)
      .map((q) => ({
        child_id: `offline_${q.qr_id}`,
        qr_id: q.qr_id,
        child_name: q.child_name || `${q.mother_name}'s child`,
        mother_name: q.mother_name,
        father_name: q.father_name,
        photo_url: q.photo_url,
        contact_number_primary: q.contact_number_primary,
        contact_number_secondary: q.contact_number_secondary,
        language_pref: q.language_pref,
        created_by_user_id: q.created_by_user_id,
        created_at: new Date(q.timestamp).toISOString(),
        isPendingSync: true,
      }));
  }

  private resetDelayAndSync() {
    this.currentDelayMs = 2000;
    if (this.syncTimer) clearTimeout(this.syncTimer);
    this.syncQueue();
  }

  private scheduleNextSync(delayMs?: number) {
    if (this.syncTimer) clearTimeout(this.syncTimer);
    const delay = delayMs ?? this.currentDelayMs;
    this.syncTimer = setTimeout(() => {
      this.syncQueue();
    }, delay);
  }

  public async forceSync(): Promise<{ synced: number; failed: number }> {
    this.currentDelayMs = 1000;
    if (this.syncTimer) clearTimeout(this.syncTimer);
    return this.syncQueue();
  }

  public async syncQueue(): Promise<{ synced: number; failed: number }> {
    if (this.isSyncing) return { synced: 0, failed: 0 };
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return { synced: 0, failed: 0 };
    }

    const queue = this.getQueue();
    if (queue.length === 0) return { synced: 0, failed: 0 };

    this.isSyncing = true;
    let synced = 0;
    let failed = 0;
    const remaining: QueuedKidRegistration[] = [];
    const baseUrl = relayClient.getServerUrl();

    for (const item of queue) {
      try {
        const res = await fetch(`${baseUrl}/api/children/link`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            qr_id: item.qr_id,
            child_name: item.child_name,
            mother_name: item.mother_name,
            father_name: item.father_name,
            photo_url: item.photo_url,
            contact_number_primary: item.contact_number_primary,
            contact_number_secondary: item.contact_number_secondary,
            language_pref: item.language_pref,
            created_by_user_id: item.created_by_user_id,
          }),
        });

        if (res.ok) {
          synced++;
          console.log(`[OFFLINE QUEUE] Successfully synced kid for tag: ${item.qr_id}`);
        } else {
          const errData = await res.json().catch(() => ({}));
          // If server explicitly rejected with status 400 (e.g., already assigned), drop from queue to stop infinite retry
          if (res.status === 400 || res.status === 409) {
            console.warn(`[OFFLINE QUEUE] Registration permanently rejected for ${item.qr_id}:`, errData.error);
            failed++;
          } else {
            // Temporary server error -> retain in queue
            remaining.push({
              ...item,
              retryCount: item.retryCount + 1,
              lastError: errData.error || `HTTP ${res.status}`,
            });
            failed++;
          }
        }
      } catch (networkErr: any) {
        // Network failure during fetch
        remaining.push({
          ...item,
          retryCount: item.retryCount + 1,
          lastError: networkErr.message || 'Network request failed',
        });
        failed++;
        break; // Stop loop on network error
      }
    }

    this.saveQueue(remaining);
    this.isSyncing = false;

    if (remaining.length > 0) {
      // Exponential backoff
      this.currentDelayMs = Math.min(this.currentDelayMs * 2, this.MAX_DELAY_MS);
      this.scheduleNextSync();
    } else {
      this.currentDelayMs = 2000;
    }

    this.notify();
    return { synced, failed };
  }
}

export const offlineKidQueue = new OfflineKidQueue();
