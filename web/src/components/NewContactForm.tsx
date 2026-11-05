import { useState } from 'react';
import { api } from '../lib/api';
import { btnPrimary, inputCls, labelCls } from './ui';

export function NewContactForm({ phone, onCreated }: { phone: string; onCreated: (contact: { id: string; name: string }) => void }) {
  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const contact = await api.createContact({ name, company, phones: [{ raw: phone }] });
      onCreated({ id: contact.id, name: contact.name });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create contact');
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="mt-2">
      <p className="mb-2 text-sm text-zinc-600 dark:text-zinc-400">Unknown number: {phone}</p>
      <label className={labelCls} htmlFor="new-contact-name">
        Name
      </label>
      <input
        id="new-contact-name"
        placeholder="Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
        className={inputCls}
      />
      <label className={`${labelCls} mt-2`} htmlFor="new-contact-company">
        Company (optional)
      </label>
      <input
        id="new-contact-company"
        placeholder="Company"
        value={company}
        onChange={(e) => setCompany(e.target.value)}
        className={inputCls}
      />
      {error && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>}
      <button type="submit" disabled={busy} className={`${btnPrimary} mt-3`}>
        {busy ? 'Saving…' : 'Save contact'}
      </button>
    </form>
  );
}
