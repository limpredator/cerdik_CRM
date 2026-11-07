import { useEffect, useState } from 'react';
import { api, type CallRecord } from '../lib/api';
import { Avatar, EmptyState } from './ui';

const DISPOSITION_TONE: Record<string, string> = {
  ANSWERED: 'text-emerald-600 dark:text-emerald-400',
  missed: 'text-red-600 dark:text-red-400',
  NO_ANSWER: 'text-red-600 dark:text-red-400',
  BUSY: 'text-amber-600 dark:text-amber-400',
};

export function CallLog() {
  const [calls, setCalls] = useState<CallRecord[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.callLog().then(setCalls).catch((err) => setError(err instanceof Error ? err.message : 'Failed to load'));
  }, []);

  if (error) return <p className="text-sm text-red-600 dark:text-red-400">{error}</p>;
  if (calls.length === 0) return <EmptyState title="No calls yet" hint="Finished calls will show up here." />;

  return (
    <div className="overflow-x-auto rounded-2xl border border-zinc-100 dark:border-zinc-800/80">
      <table className="w-full min-w-[640px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-zinc-100 text-left text-xs font-medium text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
            <th className="px-4 py-2.5 font-medium">When</th>
            <th className="px-4 py-2.5 font-medium">Direction</th>
            <th className="px-4 py-2.5 font-medium">Contact / Number</th>
            <th className="px-4 py-2.5 font-medium">Ext</th>
            <th className="px-4 py-2.5 font-medium">Duration</th>
            <th className="px-4 py-2.5 font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {calls.map((call) => {
            const name = call.contactName ?? (call.direction === 'outbound' ? call.toE164 : call.fromE164);
            return (
              <tr key={call.id} className="border-b border-zinc-100 last:border-0 dark:border-zinc-800">
                <td className="px-4 py-2.5 text-zinc-500 dark:text-zinc-400">
                  {new Date(call.startedAt).toLocaleString()}
                </td>
                <td className="px-4 py-2.5 capitalize text-zinc-700 dark:text-zinc-300">{call.direction}</td>
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <Avatar name={name} size={7} />
                    <span className="font-medium text-zinc-900 dark:text-zinc-50">{name}</span>
                  </div>
                </td>
                <td className="px-4 py-2.5 text-zinc-500 dark:text-zinc-400">{call.extension ?? '—'}</td>
                <td className="px-4 py-2.5 text-zinc-500 dark:text-zinc-400">{call.durationSec}s</td>
                <td className={`px-4 py-2.5 font-medium ${DISPOSITION_TONE[call.disposition] ?? 'text-zinc-500 dark:text-zinc-400'}`}>
                  {call.disposition}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
