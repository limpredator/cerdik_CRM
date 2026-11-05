import { useEffect, useState } from 'react';

export function CallTimer({ since }: { since: number }) {
  const [elapsed, setElapsed] = useState(() => Math.floor((Date.now() - since) / 1000));

  useEffect(() => {
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - since) / 1000)), 1000);
    return () => clearInterval(id);
  }, [since]);

  const mm = String(Math.floor(elapsed / 60)).padStart(2, '0');
  const ss = String(elapsed % 60).padStart(2, '0');
  return <span style={{ fontFamily: 'monospace' }}>{mm}:{ss}</span>;
}
