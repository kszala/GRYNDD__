const OUTBOX_STORAGE_KEY = 'grynd_outbox_queue_v1';

export interface OutboxTask<TPayload = unknown> {
  id: string;
  type: string;
  payload: TPayload;
  createdAt: string;
  attempts: number;
  lastError: string | null;
}

type OutboxHandler = (payload: unknown, task: OutboxTask) => Promise<void>;

const handlers = new Map<string, OutboxHandler>();
const queue: OutboxTask[] = [];
let isProcessing = false;
let intervalStarted = false;

const generateTaskId = () =>
  typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const persistQueue = (): void => {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(OUTBOX_STORAGE_KEY, JSON.stringify(queue));
  } catch (error) {
    console.error('Failed to persist outbox queue:', error);
  }
};

const loadPersistedQueue = (): void => {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    const saved = window.localStorage.getItem(OUTBOX_STORAGE_KEY);
    if (!saved) {
      return;
    }

    const parsed = JSON.parse(saved);
    if (!Array.isArray(parsed)) {
      return;
    }

    for (const rawTask of parsed) {
      if (!rawTask || typeof rawTask !== 'object') {
        continue;
      }

      queue.push({
        id: typeof rawTask.id === 'string' ? rawTask.id : generateTaskId(),
        type: typeof rawTask.type === 'string' ? rawTask.type : 'unknown',
        payload: (rawTask as { payload?: unknown }).payload ?? null,
        createdAt: typeof rawTask.createdAt === 'string' ? rawTask.createdAt : new Date().toISOString(),
        attempts: typeof rawTask.attempts === 'number' ? rawTask.attempts : 0,
        lastError: typeof rawTask.lastError === 'string' ? rawTask.lastError : null,
      });
    }
  } catch (error) {
    console.error('Failed to load outbox queue:', error);
  }
};

export const registerOutboxHandler = (type: string, handler: OutboxHandler): void => {
  handlers.set(type, handler);
};

export const addToQueue = <TPayload>(type: string, payload: TPayload): void => {
  const task: OutboxTask<TPayload> = {
    id: generateTaskId(),
    type,
    payload,
    createdAt: new Date().toISOString(),
    attempts: 0,
    lastError: null,
  };

  queue.push(task as OutboxTask);
  persistQueue();
  void processQueue();
};

export const processQueue = async (): Promise<void> => {
  if (isProcessing) {
    return;
  }

  isProcessing = true;
  try {
    while (queue.length) {
      const task = queue[0];
      const handler = handlers.get(task.type);

      if (!handler) {
        console.error(`No outbox handler registered for task type: ${task.type}`);
        queue.shift();
        persistQueue();
        continue;
      }

      try {
        await handler(task.payload, task);
        queue.shift();
        persistQueue();
      } catch (error) {
        task.attempts += 1;
        task.lastError = error instanceof Error ? error.message : 'Unknown outbox error';
        persistQueue();
        break;
      }
    }
  } finally {
    isProcessing = false;
  }
};

export const startQueueProcessor = (): void => {
  if (typeof window === 'undefined' || intervalStarted) {
    return;
  }

  loadPersistedQueue();
  intervalStarted = true;
  window.setInterval(() => {
    void processQueue();
  }, 10000);
  void processQueue();
};
