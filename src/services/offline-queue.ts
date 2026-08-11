import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { api } from '@/api/client';
import { QueuedApiJob, PrintJob } from '@/types';

const API_QUEUE_KEY = '@offline_queue:api';
const PRINT_QUEUE_KEY = '@offline_queue:print';
const MAX_RETRIES = 3;

/**
 * Generate a unique ID
 */
const generateId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
};

/**
 * Get all queued API jobs
 */
export const getApiQueue = async (): Promise<QueuedApiJob[]> => {
  try {
    const data = await AsyncStorage.getItem(API_QUEUE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Failed to get API queue:', error);
    return [];
  }
};

/**
 * Add a job to the API queue
 */
export const addToApiQueue = async (
  endpoint: string,
  method: 'POST' | 'PATCH' | 'DELETE',
  payload: any
): Promise<QueuedApiJob> => {
  const job: QueuedApiJob = {
    id: generateId(),
    endpoint,
    method,
    payload,
    retries: 0,
    createdAt: new Date().toISOString(),
    status: 'pending',
  };

  const queue = await getApiQueue();
  queue.push(job);
  await AsyncStorage.setItem(API_QUEUE_KEY, JSON.stringify(queue));

  return job;
};

/**
 * Update a queued job
 */
const updateApiJob = async (jobId: string, updates: Partial<QueuedApiJob>): Promise<void> => {
  const queue = await getApiQueue();
  const index = queue.findIndex((j) => j.id === jobId);
  if (index !== -1) {
    queue[index] = { ...queue[index], ...updates };
    await AsyncStorage.setItem(API_QUEUE_KEY, JSON.stringify(queue));
  }
};

/**
 * Remove a job from the queue
 */
export const removeFromApiQueue = async (jobId: string): Promise<void> => {
  const queue = await getApiQueue();
  const filtered = queue.filter((j) => j.id !== jobId);
  await AsyncStorage.setItem(API_QUEUE_KEY, JSON.stringify(filtered));
};

/**
 * Process a single API job
 */
const processApiJob = async (job: QueuedApiJob): Promise<boolean> => {
  try {
    await updateApiJob(job.id, { status: 'processing' });

    const config: any = { url: job.endpoint, method: job.method };
    if (job.method !== 'DELETE') {
      config.data = job.payload;
    }

    await api(config);

    await removeFromApiQueue(job.id);
    return true;
  } catch (error) {
    const newRetries = job.retries + 1;

    if (newRetries >= MAX_RETRIES) {
      await updateApiJob(job.id, { status: 'failed', retries: newRetries });
    } else {
      await updateApiJob(job.id, { retries: newRetries, status: 'pending' });
    }

    return false;
  }
};

/**
 * Flush the API queue (process all pending jobs)
 */
export const flushApiQueue = async (): Promise<{ success: number; failed: number }> => {
  const queue = await getApiQueue();
  const pending = queue.filter((j) => j.status === 'pending');

  let success = 0;
  let failed = 0;

  for (const job of pending) {
    const result = await processApiJob(job);
    if (result) {
      success++;
    } else {
      failed++;
    }
  }

  return { success, failed };
};

/**
 * Start listening for network changes and auto-flush queue
 */
let isListening = false;

export const startQueueListener = (): void => {
  if (isListening) return;
  isListening = true;

  NetInfo.addEventListener((state) => {
    if (state.isConnected && state.isInternetReachable) {
      flushApiQueue().catch(console.error);
    }
  });
};

// Print Queue Functions

/**
 * Get all queued print jobs
 */
export const getPrintQueue = async (): Promise<PrintJob[]> => {
  try {
    const data = await AsyncStorage.getItem(PRINT_QUEUE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Failed to get print queue:', error);
    return [];
  }
};

/**
 * Add a print job to the queue
 */
export const addToPrintQueue = async (
  type: 'register' | 'return' | 'print',
  payload: any
): Promise<PrintJob> => {
  const job: PrintJob = {
    id: generateId(),
    type,
    payload,
    retries: 0,
    createdAt: new Date().toISOString(),
    status: 'pending',
  };

  const queue = await getPrintQueue();
  queue.push(job);
  await AsyncStorage.setItem(PRINT_QUEUE_KEY, JSON.stringify(queue));

  return job;
};

/**
 * Update a print job
 */
export const updatePrintJob = async (
  jobId: string,
  updates: Partial<PrintJob>
): Promise<void> => {
  const queue = await getPrintQueue();
  const index = queue.findIndex((j) => j.id === jobId);
  if (index !== -1) {
    queue[index] = { ...queue[index], ...updates };
    await AsyncStorage.setItem(PRINT_QUEUE_KEY, JSON.stringify(queue));
  }
};

/**
 * Remove a print job from the queue
 */
export const removePrintJob = async (jobId: string): Promise<void> => {
  const queue = await getPrintQueue();
  const filtered = queue.filter((j) => j.id !== jobId);
  await AsyncStorage.setItem(PRINT_QUEUE_KEY, JSON.stringify(filtered));
};

/**
 * Get total pending jobs count (API + Print)
 */
export const getTotalPendingCount = async (): Promise<number> => {
  const apiQueue = await getApiQueue();
  const printQueue = await getPrintQueue();

  return (
    apiQueue.filter((j) => j.status === 'pending').length +
    printQueue.filter((j) => j.status === 'pending').length
  );
};

/**
 * Clear all queues (for logout)
 */
export const clearAllQueues = async (): Promise<void> => {
  await AsyncStorage.removeItem(API_QUEUE_KEY);
  await AsyncStorage.removeItem(PRINT_QUEUE_KEY);
};
