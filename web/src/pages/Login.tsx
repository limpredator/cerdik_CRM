import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { Card, btnPrimary, inputCls, labelCls } from '../components/ui';

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
      // login() auto-applies a saved extension when the server already has
      // one; only land on the picker when it still needs to be chosen.
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 dark:bg-zinc-950">
      <Card className="w-full max-w-sm p-8">
        <img src="/logo.svg" alt="" className="mx-auto mb-4 h-14 w-14 rounded-xl" />
        <h1 className="mb-1 text-center text-xl font-semibold text-zinc-900 dark:text-zinc-50">Cerdik CRM</h1>
        <p className="mb-6 text-center text-sm text-zinc-500 dark:text-zinc-400">Sign in to continue</p>
        <form onSubmit={submit}>
          <label className={labelCls} htmlFor="email">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className={inputCls}
          />
          <label className={`${labelCls} mt-3`} htmlFor="password">
            Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className={inputCls}
          />
          {error && <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>}
          <button type="submit" disabled={busy} className={`${btnPrimary} mt-5 w-full`}>
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </Card>
    </div>
  );
}
