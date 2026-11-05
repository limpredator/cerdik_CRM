import { useState } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';

export function Dialer() {
  const { extension } = useAuth();
  const [target, setTarget] = useState('');
  const [status, setStatus] = useState<string | null>(null);

  const dial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!extension || !target.trim()) return;
    setStatus('Dialing...');
    try {
      await api.dial(target.trim(), extension);
      setStatus(`Ringing ${target}`);
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Dial failed');
    }
  };

  return (
    <form onSubmit={dial} style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
      <input
        placeholder="Extension or number"
        value={target}
        onChange={(e) => setTarget(e.target.value)}
        style={{ flex: 1, padding: 8 }}
      />
      <button type="submit">Dial</button>
      {status && <span style={{ alignSelf: 'center', color: '#555' }}>{status}</span>}
    </form>
  );
}

/** Reusable click-to-dial button for a contact card or a missed-call row. */
export function DialButton({ target, label }: { target: string; label?: string }) {
  const { extension } = useAuth();
  const [status, setStatus] = useState<string | null>(null);

  const dial = async () => {
    if (!extension) return;
    setStatus('...');
    try {
      await api.dial(target, extension);
      setStatus('ringing');
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'failed');
    }
  };

  return (
    <button onClick={dial} title={`Dial ${target}`}>
      {label ?? `Call ${target}`} {status ? `(${status})` : ''}
    </button>
  );
}
