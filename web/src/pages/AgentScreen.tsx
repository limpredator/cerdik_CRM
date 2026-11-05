import { useAuth } from '../lib/auth';
import { useLiveCalls } from '../lib/useLiveCalls';
import { CallPopup } from '../components/CallPopup';
import { Dialer } from '../components/Dialer';
import { CallLog } from '../components/CallLog';
import { MissedCalls } from '../components/MissedCalls';

export function AgentScreen() {
  const { user, extension, logout } = useAuth();
  const { activeCall, dismiss } = useLiveCalls(extension);

  return (
    <div style={{ maxWidth: 900, margin: '32px auto', fontFamily: 'system-ui, sans-serif', padding: '0 16px' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ margin: 0 }}>Cerdik CRM</h1>
        <div>
          <span style={{ marginRight: 12 }}>
            {user?.name} — ext {extension}
          </span>
          <button onClick={logout}>Sign out</button>
        </div>
      </header>

      {activeCall && <CallPopup call={activeCall} onDismiss={dismiss} />}

      <section style={{ marginBottom: 32 }}>
        <h2>Dial</h2>
        <Dialer />
      </section>

      <section style={{ marginBottom: 32 }}>
        <h2>Missed calls</h2>
        <MissedCalls />
      </section>

      <section>
        <h2>Call log</h2>
        <CallLog />
      </section>
    </div>
  );
}
