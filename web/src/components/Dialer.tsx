import { useState } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { btnPrimary, btnSecondary, inputCls } from './ui';

export function Dialer() {
  const { extension } = useAuth();
  const [target, setTarget] = useState('');
  const [status, setStatus] = useState<string | null>(null);

  const dial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!extension || !target.trim()) return;
    setStatus('Dialing…');
    try {
      await api.dial(target.trim(), extension);
      setStatus(`Ringing ${target}`);
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Dial failed');
    }
  };

  return (
    <form onSubmit={dial} className="flex flex-wrap items-center gap-2">
      <input
        placeholder="Extension or number"
        value={target}
        onChange={(e) => setTarget(e.target.value)}
        className={`${inputCls} flex-1`}
      />
      <button type="submit" className={btnPrimary}>
        Dial
      </button>
      {status && <span className="text-sm text-zinc-500 dark:text-zinc-400">{status}</span>}
    </form>
  );
}

/** Reusable click-to-dial button for a contact card or a missed-call row. */
export function DialButton({ target, label }: { target: string; label?: string }) {
  const { extension } = useAuth();
  const [status, setStatus] = useState<string | null>(null);

  const dial = async () => {
    if (!extension) return;
    setStatus('…');
    try {
      await api.dial(target, extension);
      setStatus('ringing');
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'failed');
    }
  };

  return (
    <button onClick={dial} title={`Dial ${target}`} className={btnSecondary}>
      {label ?? `Call ${target}`}
      {status ? <span className="text-zinc-400 dark:text-zinc-500">({status})</span> : null}
    </button>
  );
}
