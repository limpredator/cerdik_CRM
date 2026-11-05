import { useState } from 'react';
import { api } from '../lib/api';

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
    <form onSubmit={submit} style={{ marginTop: 8 }}>
      <p style={{ margin: '4px 0' }}>Unknown number: {phone}</p>
      <input
        placeholder="Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
        style={{ display: 'block', width: '100%', padding: 6, marginBottom: 6 }}
      />
      <input
        placeholder="Company (optional)"
        value={company}
        onChange={(e) => setCompany(e.target.value)}
        style={{ display: 'block', width: '100%', padding: 6, marginBottom: 6 }}
      />
      {error && <p style={{ color: 'crimson' }}>{error}</p>}
      <button type="submit" disabled={busy}>
        {busy ? 'Saving...' : 'Save contact'}
      </button>
    </form>
  );
}
