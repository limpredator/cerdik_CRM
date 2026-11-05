import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { Card, btnPrimary, btnSecondary, inputCls } from '../components/ui';

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
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 dark:bg-zinc-950">
      <Card className="w-full max-w-sm p-8">
        <img src="/logo.svg" alt="" className="mx-auto mb-4 h-14 w-14 rounded-xl" />
        <h1 className="mb-1 text-center text-xl font-semibold text-zinc-900 dark:text-zinc-50">
          Which extension are you on?
        </h1>
        {error && (
          <p className="mt-2 text-center text-sm text-amber-600 dark:text-amber-400">
            {error} — you can still type it in below.
          </p>
        )}
        {extensions.length > 0 && (
          <div className="mt-5 flex flex-col gap-2">
            {extensions.map((ext) => (
              <button key={ext.extension} onClick={() => choose(ext.extension)} className={`${btnSecondary} justify-start`}>
                <span className="font-semibold">{ext.extension}</span>
                <span className="text-zinc-500 dark:text-zinc-400">{ext.name}</span>
              </button>
            ))}
          </div>
        )}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (manual.trim()) choose(manual.trim());
          }}
          className="mt-5 flex gap-2"
        >
          <input
            placeholder="e.g. 204"
            value={manual}
            onChange={(e) => setManual(e.target.value)}
            className={inputCls}
          />
          <button type="submit" className={`${btnPrimary} whitespace-nowrap`}>
            Use this
          </button>
        </form>
      </Card>
    </div>
  );
}
