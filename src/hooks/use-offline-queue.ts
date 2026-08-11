import { useState, useEffect, useCallback } from 'react';
import { getTotalPendingCount, flushApiQueue, getApiQueue, getPrintQueue } from '@/services/offline-queue';
import { QueuedApiJob, PrintJob } from '@/types';

export interface OfflineQueueState {
  pendingCount: number;
  apiQueue: QueuedApiJob[];
  printQueue: PrintJob[];
  isProcessing: boolean;
  isOnline: boolean;
}

export interface UseOfflineQueueReturn extends OfflineQueueState {
  refresh: () => Promise<void>;
  flushQueue: () => Promise<{ success: number; failed: number }>;
}

export const useOfflineQueue = (): UseOfflineQueueReturn => {
  const [pendingCount, setPendingCount] = useState(0);
  const [apiQueue, setApiQueue] = useState<QueuedApiJob[]>([]);
  const [printQueue, setPrintQueue] = useState<PrintJob[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isOnline, setIsOnline] = useState(true);

  const refresh = useCallback(async () => {
    const count = await getTotalPendingCount();
    const api = await getApiQueue();
    const print = await getPrintQueue();

    setPendingCount(count);
    setApiQueue(api);
    setPrintQueue(print);
  }, []);

  const flushQueue = useCallback(async () => {
    setIsProcessing(true);
    try {
      const result = await flushApiQueue();
      await refresh();
      return result;
    } finally {
      setIsProcessing(false);
    }
  }, [refresh]);

  useEffect(() => {
    refresh();

    // Set up interval to check for new items
    const interval = setInterval(refresh, 30000);

    return () => clearInterval(interval);
  }, [refresh]);

  return {
    pendingCount,
    apiQueue,
    printQueue,
    isProcessing,
    isOnline,
    refresh,
    flushQueue,
  };
};
