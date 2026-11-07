import { Fragment, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, type CallRecord } from '../lib/api';
import { Avatar, EmptyState, btnGhost, btnPrimary, inputCls } from './ui';

const DISPOSITION_TONE: Record<string, string> = {
  ANSWERED: 'text-emerald-600 dark:text-emerald-400',
  missed: 'text-red-600 dark:text-red-400',
  NO_ANSWER: 'text-red-600 dark:text-red-400',
  BUSY: 'text-amber-600 dark:text-amber-400',
};

function NotesEditor({ call, onSaved }: { call: CallRecord; onSaved: (call: CallRecord) => void }) {
  const [outcome, setOutcome] = useState(call.outcome ?? '');
  const [notes, setNotes] = useState(call.notes ?? '');
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setBusy(true);
    try {
      const updated = await api.annotateCall(call.id, { outcome, notes });
      onSaved(updated);
    } finally {
      setBusy(false);
    }
  };

  return (
    <tr className="border-b border-zinc-100 bg-zinc-50/60 last:border-0 dark:border-zinc-800 dark:bg-zinc-800/30">
      <td colSpan={6} className="px-4 py-3">
        <div className="flex flex-wrap items-end gap-2">
          <div className="min-w-[10rem] flex-1">
            <label className="mb-1 block text-xs font-medium text-zinc-500 dark:text-zinc-400">Outcome</label>
            <input
              value={outcome}
              onChange={(e) => setOutcome(e.target.value)}
              placeholder="e.g. Booked demo"
              className={inputCls}
            />
          </div>
          <div className="min-w-[14rem] flex-[2]">
            <label className="mb-1 block text-xs font-medium text-zinc-500 dark:text-zinc-400">Notes</label>
            <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Call notes…" className={inputCls} />
          </div>
          <button onClick={save} disabled={busy} className={btnPrimary}>
            {busy ? 'Saving…' : 'Save'}
          </button>
        </div>
      </td>
    </tr>
  );
}

export function CallLog({ contactId }: { contactId?: string } = {}) {
  const [calls, setCalls] = useState<CallRecord[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    api
      .callLog(contactId)
      .then(setCalls)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load'));
  }, [contactId]);

  if (error) return <p className="text-sm text-red-600 dark:text-red-400">{error}</p>;
  if (calls.length === 0) return <EmptyState title="No calls yet" hint="Finished calls will show up here." />;

  const updateCall = (updated: CallRecord) => {
    setCalls((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
    setExpandedId(null);
  };

  return (
    <div className="overflow-x-auto rounded-2xl border border-zinc-100 dark:border-zinc-800/80">
      <table className="w-full min-w-[720px] border-collapse text-sm">
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
            const expanded = expandedId === call.id;
            return (
              <Fragment key={call.id}>
                <tr
                  onClick={() => setExpandedId(expanded ? null : call.id)}
                  className="cursor-pointer border-b border-zinc-100 last:border-0 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-800/40"
                >
                  <td className="px-4 py-2.5 text-zinc-500 dark:text-zinc-400">
                    {new Date(call.startedAt).toLocaleString()}
                  </td>
                  <td className="px-4 py-2.5 capitalize text-zinc-700 dark:text-zinc-300">{call.direction}</td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <Avatar name={name} size={7} />
                      {call.contactId ? (
                        <Link
                          to={`/contacts/${call.contactId}`}
                          onClick={(e) => e.stopPropagation()}
                          className="font-medium text-zinc-900 hover:underline dark:text-zinc-50"
                        >
                          {name}
                        </Link>
                      ) : (
                        <span className="font-medium text-zinc-900 dark:text-zinc-50">{name}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-zinc-500 dark:text-zinc-400">{call.extension ?? '—'}</td>
                  <td className="px-4 py-2.5 text-zinc-500 dark:text-zinc-400">{call.durationSec}s</td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className={`font-medium ${DISPOSITION_TONE[call.disposition] ?? 'text-zinc-500 dark:text-zinc-400'}`}>
                        {call.disposition}
                      </span>
                      <span className={`${btnGhost} !min-h-0 !px-2 !py-1 text-xs`}>
                        {call.outcome ? call.outcome : 'Add note'}
                      </span>
                    </div>
                  </td>
                </tr>
                {expanded && <NotesEditor call={call} onSaved={updateCall} />}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
