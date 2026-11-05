import { useEffect, useState } from 'react';
import { api, type CallRecord } from '../lib/api';

export function CallLog() {
  const [calls, setCalls] = useState<CallRecord[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.callLog().then(setCalls).catch((err) => setError(err instanceof Error ? err.message : 'Failed to load'));
  }, []);

  if (error) return <p style={{ color: 'crimson' }}>{error}</p>;

  return (
    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
      <thead>
        <tr style={{ textAlign: 'left', borderBottom: '1px solid #ccc' }}>
          <th>When</th>
          <th>Direction</th>
          <th>Contact / Number</th>
          <th>Ext</th>
          <th>Duration</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        {calls.map((call) => (
          <tr key={call.id} style={{ borderBottom: '1px solid #eee' }}>
            <td>{new Date(call.startedAt).toLocaleString()}</td>
            <td>{call.direction}</td>
            <td>{call.contactName ?? (call.direction === 'outbound' ? call.toE164 : call.fromE164)}</td>
            <td>{call.extension ?? '-'}</td>
            <td>{call.durationSec}s</td>
            <td>{call.disposition}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
