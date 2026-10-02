import AsyncStorage from '@react-native-async-storage/async-storage';
import { logDebugError } from './errorLogger';

export interface OfflineAction {
  id: string;
  url: string;
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: any;
  headers?: Record<string, string>;
  timestamp: number;
  retryCount: number;
  actionType: 'START_SHIFT' | 'END_SHIFT' | 'ACCIDENT_REPORT' | 'OTHER';
}

const OFFLINE_QUEUE_KEY = '@aams_offline_action_queue';
const MAX_RETRIES = 5;

let isSyncing = false;

export const offlineQueue = {
  // Add an action to the local offline queue
  enqueue: async (action: Omit<OfflineAction, 'id' | 'timestamp' | 'retryCount'>): Promise<void> => {
    try {
      const rawQueue = await AsyncStorage.getItem(OFFLINE_QUEUE_KEY);
      const queue: OfflineAction[] = rawQueue ? JSON.parse(rawQueue) : [];

      const newAction: OfflineAction = {
        ...action,
        id: `act_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: Date.now(),
        retryCount: 0,
      };

      queue.push(newAction);
      await AsyncStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
      console.log(`[OfflineQueue] Enqueued action: ${newAction.actionType} (${newAction.id})`);
    } catch (err) {
      console.error('[OfflineQueue] Error enqueuing action:', err);
    }
  },

  // Get current pending queue items
  getQueue: async (): Promise<OfflineAction[]> => {
    try {
      const rawQueue = await AsyncStorage.getItem(OFFLINE_QUEUE_KEY);
      return rawQueue ? JSON.parse(rawQueue) : [];
    } catch {
      return [];
    }
  },

  // Clear or remove a specific action from the queue
  removeAction: async (id: string): Promise<void> => {
    try {
      const rawQueue = await AsyncStorage.getItem(OFFLINE_QUEUE_KEY);
      if (!rawQueue) return;
      const queue: OfflineAction[] = JSON.parse(rawQueue);
      const filtered = queue.filter((item) => item.id !== id);
      await AsyncStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(filtered));
    } catch (err) {
      console.error('[OfflineQueue] Error removing action:', err);
    }
  },

  // Flush and process pending offline actions
  processQueue: async (apiRequester: (url: string, options: any) => Promise<any>): Promise<{ processed: number; failed: number }> => {
    if (isSyncing) return { processed: 0, failed: 0 };
    isSyncing = true;

    let processed = 0;
    let failed = 0;

    try {
      const queue = await offlineQueue.getQueue();
      if (queue.length === 0) {
        isSyncing = false;
        return { processed: 0, failed: 0 };
      }

      console.log(`[OfflineQueue] Syncing ${queue.length} pending actions...`);

      for (const item of queue) {
        try {
          await apiRequester(item.url, {
            method: item.method,
            body: item.body ? JSON.stringify(item.body) : undefined,
            headers: item.headers,
          });

          await offlineQueue.removeAction(item.id);
          processed++;
          console.log(`[OfflineQueue] Successfully synced action: ${item.actionType} (${item.id})`);
        } catch (reqErr: any) {
          failed++;
          item.retryCount += 1;
          console.warn(`[OfflineQueue] Failed to sync action (${item.id}), attempt ${item.retryCount}:`, reqErr?.message);

          if (item.retryCount >= MAX_RETRIES) {
            await offlineQueue.removeAction(item.id);
            logDebugError(
              'API_NETWORK',
              `[OfflineQueue] Action ${item.actionType} dropped after ${MAX_RETRIES} attempts`,
              undefined,
              { action: item }
            ).catch(() => {});
          } else {
            // Update retry count in storage
            const currentQueue = await offlineQueue.getQueue();
            const updated = currentQueue.map((q) => (q.id === item.id ? item : q));
            await AsyncStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(updated));
          }
        }
      }
    } catch (err) {
      console.error('[OfflineQueue] Batch process error:', err);
    } finally {
      isSyncing = false;
    }

    return { processed, failed };
  },
};
