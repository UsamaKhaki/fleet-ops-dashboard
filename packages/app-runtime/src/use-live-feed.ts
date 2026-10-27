import { LIVE_URL, connectLive, type LiveMessage, type LiveStatus } from '@fleet/api';
import { useEffect, useRef, useState } from 'react';

/** Keeps one live socket open while the calling app is mounted. */
export function useLiveFeed(onMessage: (message: LiveMessage) => void): LiveStatus {
  const [status, setStatus] = useState<LiveStatus>('connecting');
  // The socket should not reconnect just because the caller passed a new callback.
  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;

  useEffect(
    () =>
      connectLive({
        url: LIVE_URL,
        onMessage: (message) => onMessageRef.current(message),
        onStatusChange: setStatus,
      }),
    [],
  );

  return status;
}
