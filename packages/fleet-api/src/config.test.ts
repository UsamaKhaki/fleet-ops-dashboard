import { describe, expect, it } from 'vitest';
import { liveUrl } from './config';

describe('liveUrl', () => {
  it('derives the socket URL from an absolute API URL', () => {
    expect(liveUrl('http://localhost:6709')).toBe('ws://localhost:6709/ws');
    expect(liveUrl('https://api.example.com')).toBe('wss://api.example.com/ws');
  });

  it('uses the page origin when the API is same-origin', () => {
    expect(liveUrl('', { protocol: 'https:', host: 'fleet.example.com' })).toBe(
      'wss://fleet.example.com/api/ws',
    );
    expect(liveUrl('', { protocol: 'http:', host: 'localhost:6701' })).toBe(
      'ws://localhost:6701/api/ws',
    );
  });

  it('refuses a same-origin API without a browser location', () => {
    expect(() => liveUrl('')).toThrow(/browser location/);
  });
});
