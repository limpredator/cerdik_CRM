import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, type Enquiry } from '../lib/api';
import { Avatar, Card, EmptyState, PageHeader } from './../components/ui';

const STATUS_TONE: Record<string, string> = {
  new: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400',
  handled: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400',
};

const FILTERS: Array<{ label: string; status?: string }> = [
  { label: 'All' },
  { label: 'New', status: 'new' },
  { label: 'Handled', status: 'handled' },
];

export function Enquiries() {
  const [enquiries, setEnquiries] = useState<Enquiry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | undefined>(undefined);

  useEffect(() => {
    api
      .enquiries(status ? { status } : undefined)
      .then(setEnquiries)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load'));
  }, [status]);

  return (
    <div>
      <PageHeader title="Enquiries" subtitle="Leads from the website and other channels" />

      <div className="mb-4 flex gap-1.5">
        {FILTERS.map((f) => (
          <button
            key={f.label}
            onClick={() => setStatus(f.status)}
            className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition ${
              status === f.status
                ? 'bg-indigo-600 text-white dark:text-[#111]'
                : 'text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      {!error && enquiries.length === 0 && (
        <EmptyState title="No enquiries" hint="Leads from the website contact form will show up here." />
      )}
      {!error && enquiries.length > 0 && (
        <Card>
          <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {enquiries.map((enquiry) => {
              const name = enquiry.contactName ?? enquiry.senderName ?? enquiry.senderContact ?? 'Unknown';
              return (
                <li key={enquiry.id}>
                  <Link
                    to={`/enquiries/${enquiry.id}`}
                    className="flex items-center gap-3 px-4 py-3.5 hover:bg-zinc-50 dark:hover:bg-zinc-800/40"
                  >
                    <Avatar name={name} size={9} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate font-medium text-zinc-900 dark:text-zinc-50">{name}</span>
                        <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium capitalize text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                          {enquiry.channel}
                        </span>
                      </div>
                      {enquiry.subject && <p className="truncate text-sm text-zinc-500 dark:text-zinc-400">{enquiry.subject}</p>}
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium capitalize ${
                        STATUS_TONE[enquiry.status] ?? 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'
                      }`}
                    >
                      {enquiry.status}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </Card>
      )}
    </div>
  );
}
