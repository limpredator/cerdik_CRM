import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';

export function ExtensionPicker() {
  const { pickExtension } = useAuth();
  const navigate = useNavigate();
  const [extensions, setExtensions] = useState<Array<{ extension: string; name: string }>>([]);
  const [manual, setManual] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .extensions()
      .then(setExtensions)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load extensions'));
  }, []);

  const choose = (ext: string) => {
    pickExtension(ext);
    navigate('/');
  };

  return (
    <div style={{ maxWidth: 420, margin: '80px auto', fontFamily: 'system-ui, sans-serif' }}>
      <h1>Which extension are you on?</h1>
      {error && <p style={{ color: 'crimson' }}>{error} — you can still type it in below.</p>}
      <ul style={{ listStyle: 'none', padding: 0 }}>
        {extensions.map((ext) => (
          <li key={ext.extension} style={{ marginBottom: 8 }}>
            <button onClick={() => choose(ext.extension)} style={{ width: '100%', padding: 10, textAlign: 'left' }}>
              {ext.extension} — {ext.name}
            </button>
          </li>
        ))}
      </ul>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (manual.trim()) choose(manual.trim());
        }}
        style={{ marginTop: 16, display: 'flex', gap: 8 }}
      >
        <input
          placeholder="e.g. 204"
          value={manual}
          onChange={(e) => setManual(e.target.value)}
          style={{ flex: 1, padding: 8 }}
        />
        <button type="submit">Use this</button>
      </form>
    </div>
  );
}
