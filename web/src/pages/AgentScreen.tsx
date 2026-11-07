import { useAuth } from '../lib/auth';
import { useLiveCalls } from '../lib/useLiveCalls';
import { CallPopup } from '../components/CallPopup';
import { Dialer } from '../components/Dialer';
import { CallLog } from '../components/CallLog';
import { MissedCalls } from '../components/MissedCalls';
import { Card } from '../components/ui';

export function AgentScreen() {
  const { extension } = useAuth();
  const { activeCall, callEndedCount, dismiss } = useLiveCalls(extension);

  return (
    <>
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
    </>
  );
}
