import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { connectLive, reconnectDelay, type LiveStatus } from './live';

class FakeSocket extends EventTarget {
  closed = false;
  close() {
    this.closed = true;
  }
  emit(type: 'open' | 'close') {
    this.dispatchEvent(new Event(type));
  }
  send(data: unknown) {
    this.dispatchEvent(new MessageEvent('message', { data }));
  }
}

describe('reconnectDelay', () => {
  it('doubles and then caps', () => {
    expect([0, 1, 2, 3].map(reconnectDelay)).toEqual([500, 1000, 2000, 4000]);
    expect(reconnectDelay(20)).toBe(15_000);
  });
});

describe('connectLive', () => {
  let sockets: FakeSocket[];
  let statuses: LiveStatus[];
  let messages: unknown[];
  let stop: () => void;

  beforeEach(() => {
    vi.useFakeTimers();
    sockets = [];
    statuses = [];
    messages = [];
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    stop = connectLive({
      url: 'ws://test',
      onMessage: (message) => messages.push(message),
      onStatusChange: (status) => statuses.push(status),
      createSocket: () => {
        const socket = new FakeSocket();
        sockets.push(socket);
        return socket as unknown as WebSocket;
      },
    });
  });

  afterEach(() => {
    stop();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('passes valid messages through and drops invalid ones', () => {
    sockets[0]?.emit('open');
    sockets[0]?.send(JSON.stringify({ type: 'telemetry.update', vehicles: [] }));
    sockets[0]?.send(JSON.stringify({ type: 'unknown' }));
    sockets[0]?.send('not json');

    expect(messages).toEqual([{ type: 'telemetry.update', vehicles: [] }]);
    expect(console.warn).toHaveBeenCalledTimes(2);
  });

  it('reconnects with backoff and resets it after a successful open', () => {
    sockets[0]?.emit('close');
    expect(statuses).toEqual(['connecting', 'reconnecting']);

    vi.advanceTimersByTime(499);
    expect(sockets).toHaveLength(1);
    vi.advanceTimersByTime(1);
    expect(sockets).toHaveLength(2);

    sockets[1]?.emit('close');
    vi.advanceTimersByTime(1000);
    expect(sockets).toHaveLength(3);

    sockets[2]?.emit('open');
    sockets[2]?.emit('close');
    vi.advanceTimersByTime(500);
    expect(sockets).toHaveLength(4);
    expect(statuses).toContain('open');
  });

  it('stops reconnecting once closed by the caller', () => {
    stop();
    sockets[0]?.emit('close');
    vi.advanceTimersByTime(60_000);
    expect(sockets).toHaveLength(1);
    expect(sockets[0]?.closed).toBe(true);
  });
});
