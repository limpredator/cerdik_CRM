import { useMemo, useState } from 'react';
import type { RingingCall } from '../lib/useLiveCalls';
import { NewContactForm } from './NewContactForm';
import { CallTimer } from './CallTimer';
import { Avatar, btnGhost, Card } from './ui';

export function CallPopup({ call, onDismiss }: { call: RingingCall; onDismiss: () => void }) {
  const since = useMemo(() => Date.now(), [call.callId]);
  const [savedContact, setSavedContact] = useState<{ id: string; name: string } | null>(null);
  const contact = call.contact ?? savedContact;

  return (
    <Card className="mb-6 border-indigo-200 p-5 dark:border-indigo-800/60">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold tracking-wide text-indigo-600 uppercase dark:text-indigo-400">
          Incoming call
        </span>
        <CallTimer since={since} />
      </div>
      <div className="mt-3 flex items-center gap-3">
        <Avatar name={contact?.name ?? call.otherNumber ?? call.fromExtension} size={12} />
        <div className="min-w-0 flex-1">
          {contact ? (
            <p className="truncate text-lg font-semibold text-zinc-900 dark:text-zinc-50">{contact.name}</p>
          ) : call.otherNumber ? (
            <NewContactForm phone={call.otherNumber} onCreated={setSavedContact} />
          ) : (
            <p className="text-sm text-zinc-700 dark:text-zinc-200">Internal call from extension {call.fromExtension}</p>
          )}
          <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">From: {call.otherNumber ?? call.fromExtension}</p>
        </div>
      </div>
      <button onClick={onDismiss} className={`${btnGhost} mt-3`}>
        Dismiss
      </button>
    </Card>
  );
}
