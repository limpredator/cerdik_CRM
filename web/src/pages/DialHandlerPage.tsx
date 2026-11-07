import { useState } from 'react';
import { Card, btnPrimary } from '../components/ui';

const bookmarkletHref = `javascript:(function(){var t=(window.getSelection()&&window.getSelection().toString())||prompt('Number to dial:');if(t)window.open('${typeof window !== 'undefined' ? window.location.origin : ''}/dial?number='+encodeURIComponent(t));})();`;

export function DialHandlerPage() {
  const [status, setStatus] = useState<string | null>(null);
  const supported = typeof navigator !== 'undefined' && 'registerProtocolHandler' in navigator;

  const register = () => {
    try {
      navigator.registerProtocolHandler('tel', `${window.location.origin}/dial?number=%s`);
      setStatus('Registered — tel: links anywhere on the web will now open here.');
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Could not register handler');
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <Card className="p-5">
        <h2 className="mb-1 text-sm font-semibold text-zinc-900 dark:text-zinc-50">Dial tel: links from anywhere</h2>
        <p className="mb-4 text-sm text-zinc-500 dark:text-zinc-400">
          Registers this CRM as your browser's handler for <code>tel:</code> links — click a phone number on any
          website and it opens a confirm screen here instead of trying (and failing) to open a desk-phone app.
        </p>
        {supported ? (
          <button onClick={register} className={btnPrimary}>
            Register as tel: handler
          </button>
        ) : (
          <p className="text-sm text-amber-600 dark:text-amber-400">
            Your browser doesn't support this — try Chrome, Edge, or Firefox.
          </p>
        )}
        {status && <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">{status}</p>}
      </Card>

      <Card className="p-5">
        <h2 className="mb-1 text-sm font-semibold text-zinc-900 dark:text-zinc-50">Dial bookmarklet</h2>
        <p className="mb-4 text-sm text-zinc-500 dark:text-zinc-400">
          For sites that show a number as plain text (not a real <code>tel:</code> link): select the number, then
          click this bookmark.
        </p>
        <a
          href={bookmarkletHref}
          onClick={(e) => e.preventDefault()}
          draggable
          className="inline-flex cursor-grab items-center rounded-full border border-dashed border-indigo-300 bg-indigo-50 px-4 py-2 text-sm font-medium text-indigo-700 select-none dark:border-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300"
        >
          📞 Dial in Cerdik CRM
        </a>
        <p className="mt-2 text-xs text-zinc-400 dark:text-zinc-500">
          Drag this to your bookmarks bar — clicking it here does nothing on purpose.
        </p>
      </Card>
    </div>
  );
}
