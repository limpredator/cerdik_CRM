import { useEffect, useState } from 'react';
import { api, type AuditLogEntry } from '../lib/api';
import { Card, EmptyState } from '../components/ui';

export function AuditLogPage() {
  const [entries, setEntries] = useState<AuditLogEntry[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .auditLog()
      .then(setEntries)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load audit log'));
  }, []);

  if (error) return <p className="text-sm text-red-600 dark:text-red-400">{error}</p>;
  if (entries.length === 0) return <EmptyState title="No activity yet" hint="Actions taken in the CRM will show up here." />;

  return (
    <Card className="overflow-x-auto">
      <table className="w-full min-w-[640px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-zinc-100 text-left text-xs font-medium text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
            <th className="px-4 py-2.5 font-medium">When</th>
            <th className="px-4 py-2.5 font-medium">Who</th>
            <th className="px-4 py-2.5 font-medium">Action</th>
            <th className="px-4 py-2.5 font-medium">Entity</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => (
            <tr key={entry.id} className="border-b border-zinc-100 last:border-0 dark:border-zinc-800">
              <td className="px-4 py-2.5 text-zinc-500 dark:text-zinc-400">
                {new Date(entry.occurredAt).toLocaleString()}
              </td>
              <td className="px-4 py-2.5 text-zinc-700 dark:text-zinc-300">{entry.userName ?? '—'}</td>
              <td className="px-4 py-2.5 font-medium text-zinc-900 dark:text-zinc-50">{entry.action}</td>
              <td className="px-4 py-2.5 text-zinc-500 dark:text-zinc-400">
                {entry.entityType}
                {entry.entityId ? ` · ${entry.entityId}` : ''}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}
