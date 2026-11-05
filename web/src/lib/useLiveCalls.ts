import { useEffect, useRef, useState } from 'react';
import { getToken } from './api';

// Same-origin by default (matches api.ts) — derived from the page's own
// location so it works whatever host/port the server ends up on.
const WS_URL =
  import.meta.env.VITE_WS_URL ?? `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}/ws`;

export interface RingingCall {
  kind: 'ringing';
  callId: string;
  fromExtension: string;
  toExtension: string;
  otherNumber: string | null;
  contact: { id: string; name: string } | null;
}

interface CallEnded {
  kind: 'callEnded';
  callId: string;
}

type LiveMessage = RingingCall | CallEnded;

/** Opens one WS connection for the picked extension and surfaces the
 * current ringing/active call, if any — the agent screen's live call pop
 * and timer are driven entirely from this. */
export function useLiveCalls(extension: string | null) {
  const [activeCall, setActiveCall] = useState<RingingCall | null>(null);
  const socketRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!extension) return;
    const token = getToken();
    if (!token) return;

    const ws = new WebSocket(`${WS_URL}?token=${encodeURIComponent(token)}&extension=${encodeURIComponent(extension)}`);
    socketRef.current = ws;

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data) as LiveMessage;
      if (msg.kind === 'ringing') {
        setActiveCall(msg);
      } else if (msg.kind === 'callEnded') {
        setActiveCall((current) => (current?.callId === msg.callId ? null : current));
      }
    };

    return () => {
      ws.close();
      socketRef.current = null;
    };
  }, [extension]);

  return { activeCall, dismiss: () => setActiveCall(null) };
}
