import { useAuth } from '../lib/auth';
import { useLiveCalls } from '../lib/useLiveCalls';
import { CallPopup } from '../components/CallPopup';
import { Dialer } from '../components/Dialer';
import { CallLog } from '../components/CallLog';
import { MissedCalls } from '../components/MissedCalls';
import { btnGhost, Card } from '../components/ui';

export function AgentScreen() {
  const { user, extension, logout } = useAuth();
  const { activeCall, callEndedCount, dismiss } = useLiveCalls(extension);

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <header className="border-b border-zinc-100 bg-white dark:border-zinc-800/80 dark:bg-zinc-900">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-2 px-4 py-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <img src="/logo.svg" alt="" className="h-8 w-8 shrink-0 rounded-lg" />
            <span className="truncate font-semibold whitespace-nowrap text-zinc-900 dark:text-zinc-50">
              Cerdik CRM
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <span className="hidden text-sm whitespace-nowrap text-zinc-500 dark:text-zinc-400 sm:inline">
              {user?.name} — ext {extension}
            </span>
            <span className="text-sm whitespace-nowrap text-zinc-500 dark:text-zinc-400 sm:hidden">
              ext {extension}
            </span>
            <button onClick={logout} className={`${btnGhost} whitespace-nowrap`}>
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-6">
        {activeCall && <CallPopup call={activeCall} onDismiss={dismiss} />}

        <Card className="mb-6 p-5">
          <h2 className="mb-3 text-sm font-semibold text-zinc-900 dark:text-zinc-50">Dial</h2>
          <Dialer />
        </Card>

        <Card className="mb-6 p-5">
          <h2 className="mb-3 text-sm font-semibold text-zinc-900 dark:text-zinc-50">Missed calls</h2>
          <MissedCalls key={callEndedCount} />
        </Card>

        <Card className="p-5">
          <h2 className="mb-3 text-sm font-semibold text-zinc-900 dark:text-zinc-50">Call log</h2>
          <CallLog key={callEndedCount} />
        </Card>
      </main>
    </div>
  );
}
