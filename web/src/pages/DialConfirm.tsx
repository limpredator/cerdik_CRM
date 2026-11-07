import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { Card, EmptyState, btnPrimary, btnSecondary } from '../components/ui';

/** Lands here when a `tel:` link anywhere on the web is opened through the
 * registered protocol handler (see Settings → Click-to-dial), or from the
 * dial bookmarklet. Always asks before ringing — a stray `tel:` link
 * shouldn't silently dial someone. */
export function DialConfirm() {
  const [params] = useSearchParams();
  const number = params.get('number')?.trim() ?? '';
  const { extension } = useAuth();
  const [status, setStatus] = useState<'idle' | 'dialing' | 'done' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  if (!number) return <EmptyState title="No number given" hint="Open this page via a tel: link or the dial bookmarklet." />;

  const confirm = async () => {
    if (!extension) return;
    setStatus('dialing');
    try {
      await api.dial(number, extension);
      setStatus('done');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Dial failed');
      setStatus('error');
    }
  };

  return (
    <Card className="mx-auto max-w-sm p-6 text-center">
      <p className="text-sm text-zinc-500 dark:text-zinc-400">Dial this number from extension {extension}?</p>
      <p className="mt-1 text-xl font-semibold text-zinc-900 dark:text-zinc-50">{number}</p>
      {status === 'idle' && (
        <div className="mt-5 flex justify-center gap-2">
          <button onClick={confirm} className={btnPrimary}>
            Dial
          </button>
          <button onClick={() => window.close()} className={btnSecondary}>
            Cancel
          </button>
        </div>
      )}
      {status === 'dialing' && <p className="mt-5 text-sm text-zinc-500 dark:text-zinc-400">Dialing…</p>}
      {status === 'done' && <p className="mt-5 text-sm text-emerald-600 dark:text-emerald-400">Ringing {number}.</p>}
      {status === 'error' && <p className="mt-5 text-sm text-red-600 dark:text-red-400">{error}</p>}
    </Card>
  );
}
