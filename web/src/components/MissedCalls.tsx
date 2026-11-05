import { useEffect, useState } from 'react';
import { api, type MissedCallGroup } from '../lib/api';
import { DialButton } from './Dialer';

export function MissedCalls() {
  const [groups, setGroups] = useState<MissedCallGroup[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.missedCalls().then(setGroups).catch((err) => setError(err instanceof Error ? err.message : 'Failed to load'));
  }, []);

  if (error) return <p style={{ color: 'crimson' }}>{error}</p>;
  if (groups.length === 0) return <p style={{ color: '#555' }}>No missed calls.</p>;

  return (
    <ul style={{ listStyle: 'none', padding: 0 }}>
      {groups.map((group) => (
        <li
          key={group.fromE164}
          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #eee' }}
        >
          <span>
            <strong>{group.contactName ?? group.fromE164}</strong>{' '}
            <span style={{ color: '#555' }}>
              ({group.count}x, last {new Date(group.lastAt).toLocaleString()})
            </span>
          </span>
          <DialButton target={group.fromE164} label="Call back" />
        </li>
      ))}
    </ul>
  );
}
