import { liveMessageSchema, type LiveMessage } from './schemas';

export type LiveStatus = 'connecting' | 'open' | 'reconnecting';

export interface LiveConnectionOptions {
  url: string;
  onMessage: (message: LiveMessage) => void;
  onStatusChange?: (status: LiveStatus) => void;
  createSocket?: (url: string) => WebSocket;
}

const BASE_DELAY_MS = 500;
const MAX_DELAY_MS = 15_000;

export function reconnectDelay(attempt: number): number {
  return Math.min(MAX_DELAY_MS, BASE_DELAY_MS * 2 ** attempt);
}

/** Opens a socket that reconnects with exponential backoff. Returns a function that closes it for good. */
export function connectLive({
  url,
  onMessage,
  onStatusChange,
  createSocket = (target) => new WebSocket(target),
}: LiveConnectionOptions): () => void {
  let socket: WebSocket | undefined;
  let attempt = 0;
  let retryTimer: ReturnType<typeof setTimeout> | undefined;
  let stopped = false;

  const open = () => {
    onStatusChange?.(attempt === 0 ? 'connecting' : 'reconnecting');
    socket = createSocket(url);

    socket.addEventListener('open', () => {
      attempt = 0;
      onStatusChange?.('open');
    });

    socket.addEventListener('message', (event: MessageEvent) => {
      let data: unknown;
      try {
        data = JSON.parse(String(event.data));
      } catch {
        console.warn('[live] ignored a message that is not JSON');
        return;
      }
      const parsed = liveMessageSchema.safeParse(data);
      if (parsed.success) onMessage(parsed.data);
      else console.warn('[live] ignored an unknown message', parsed.error.issues);
    });

    socket.addEventListener('close', () => {
      if (stopped) return;
      onStatusChange?.('reconnecting');
      retryTimer = setTimeout(open, reconnectDelay(attempt));
      attempt += 1;
    });
  };

  open();

  return () => {
    stopped = true;
    clearTimeout(retryTimer);
    socket?.close();
  };
}
