import { useMemo } from 'react';
import type { RingingCall } from '../lib/useLiveCalls';
import { NewContactForm } from './NewContactForm';
import { CallTimer } from './CallTimer';

export function CallPopup({ call, onDismiss }: { call: RingingCall; onDismiss: () => void }) {
  const since = useMemo(() => Date.now(), [call.callId]);

  return (
    <div
      style={{
        border: '2px solid #2563eb',
        borderRadius: 8,
        padding: 16,
        marginBottom: 16,
        background: '#eff6ff',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <strong>Incoming call</strong>
        <CallTimer since={since} />
      </div>
      {call.contact ? (
        <p style={{ fontSize: 18, margin: '8px 0' }}>{call.contact.name}</p>
      ) : call.otherNumber ? (
        <NewContactForm phone={call.otherNumber} onCreated={() => {}} />
      ) : (
        <p>Internal call from extension {call.fromExtension}</p>
      )}
      <p style={{ color: '#555' }}>From: {call.otherNumber ?? call.fromExtension}</p>
      <button onClick={onDismiss} style={{ marginTop: 8 }}>
        Dismiss
      </button>
    </div>
  );
}
