import { db } from './db';

class SyncManager {
  private isSyncing = false;
  private syncListeners: Array<(status: 'syncing' | 'success' | 'error') => void> = [];

  // Add listener for sync status changes
  addSyncListener(listener: (status: 'syncing' | 'success' | 'error') => void) {
    this.syncListeners.push(listener);
    return () => {
      this.syncListeners = this.syncListeners.filter(l => l !== listener);
    };
  }

  private notifyListeners(status: 'syncing' | 'success' | 'error') {
    this.syncListeners.forEach(listener => listener(status));
  }

  async processPendingSubmissions(): Promise<{ success: number; failed: number }> {
    if (this.isSyncing) {
      console.log('Sync already in progress');
      return { success: 0, failed: 0 };
    }

    if (!navigator.onLine) {
      console.log('Cannot sync while offline');
      return { success: 0, failed: 0 };
    }

    this.isSyncing = true;
    this.notifyListeners('syncing');

    const pending = await db.getPendingSubmissions();
    let successCount = 0;
    let failedCount = 0;

    for (const submission of pending) {
      try {
        const response = await fetch(submission.endpoint, {
          method: submission.method,
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(submission.body),
        });

        if (response.ok) {
          // Success - remove from queue
          await db.removePendingSubmission(submission.id!);
          successCount++;
        } else {
          // Failed - increment retry count
          const retryCount = (submission.retryCount || 0) + 1;
          if (retryCount >= 3) {
            // Max retries reached - remove from queue
            console.error('Max retries reached for submission:', submission);
            await db.removePendingSubmission(submission.id!);
            failedCount++;
          } else {
            await db.updatePendingSubmission(submission.id!, { retryCount });
            failedCount++;
          }
        }
      } catch (error) {
        console.error('Error processing pending submission:', error);
        const retryCount = (submission.retryCount || 0) + 1;
        if (retryCount >= 3) {
          await db.removePendingSubmission(submission.id!);
        } else {
          await db.updatePendingSubmission(submission.id!, { retryCount });
        }
        failedCount++;
      }
    }

    this.isSyncing = false;
    this.notifyListeners(failedCount === 0 ? 'success' : 'error');

    return { success: successCount, failed: failedCount };
  }

  async syncOnline() {
    console.log('Device is online, processing pending submissions...');
    const result = await this.processPendingSubmissions();
    console.log(`Sync complete: ${result.success} succeeded, ${result.failed} failed`);
    return result;
  }

  // Get count of pending submissions
  async getPendingCount(): Promise<number> {
    const pending = await db.getPendingSubmissions();
    return pending.length;
  }
}

export const syncManager = new SyncManager();

// Set up online event listener
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    syncManager.syncOnline();
  });
}
