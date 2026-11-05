import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';

export function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await login(email, password);
      navigate('/pick-extension');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ maxWidth: 360, margin: '80px auto', fontFamily: 'system-ui, sans-serif' }}>
      <h1>Cerdik CRM</h1>
      <form onSubmit={submit}>
        <label style={{ display: 'block', marginBottom: 8 }}>
          Email
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{ display: 'block', width: '100%', padding: 8, marginTop: 4 }}
          />
        </label>
        <label style={{ display: 'block', marginBottom: 8 }}>
          Password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={{ display: 'block', width: '100%', padding: 8, marginTop: 4 }}
          />
        </label>
        {error && <p style={{ color: 'crimson' }}>{error}</p>}
        <button type="submit" disabled={busy} style={{ padding: '8px 16px' }}>
          {busy ? 'Signing in...' : 'Sign in'}
        </button>
      </form>
    </div>
  );
}
