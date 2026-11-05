import { useEffect, useState } from 'react';
import { api, type MissedCallGroup } from '../lib/api';
import { DialButton } from './Dialer';
import { Avatar, EmptyState } from './ui';

export function MissedCalls() {
  const [groups, setGroups] = useState<MissedCallGroup[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.missedCalls().then(setGroups).catch((err) => setError(err instanceof Error ? err.message : 'Failed to load'));
  }, []);

  if (error) return <p className="text-sm text-red-600 dark:text-red-400">{error}</p>;
  if (groups.length === 0) return <EmptyState title="No missed calls" hint="Unanswered inbound calls show up here, grouped by number." />;

  return (
    <ul className="flex flex-col gap-2">
      {groups.map((group) => {
        const name = group.contactName ?? group.fromE164;
        return (
          <li
            key={group.fromE164}
            className="flex items-center justify-between gap-3 rounded-2xl border border-zinc-100 bg-white px-4 py-3 dark:border-zinc-800/80 dark:bg-zinc-900"
          >
            <div className="flex min-w-0 items-center gap-3">
              <Avatar name={name} size={9} />
              <div className="min-w-0">
                <p className="truncate font-medium text-zinc-900 dark:text-zinc-50">{name}</p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  {group.count}× · last {new Date(group.lastAt).toLocaleString()}
                </p>
              </div>
            </div>
            <DialButton target={group.fromE164} label="Call back" />
          </li>
        );
      })}
    </ul>
  );
}
