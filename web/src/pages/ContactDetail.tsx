import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api, type Contact } from '../lib/api';
import { DialButton } from '../components/Dialer';
import { CallLog } from '../components/CallLog';
import { Avatar, Card, PageHeader, btnPrimary, btnSecondary, inputCls, labelCls } from '../components/ui';

export function ContactDetail() {
  const { id } = useParams<{ id: string }>();
  const [contact, setContact] = useState<Contact | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!id) return;
    api
      .contact(id)
      .then((c) => {
        setContact(c);
        setName(c.name);
        setCompany(c.company ?? '');
        setNotes(c.notes ?? '');
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load contact'));
  }, [id]);

  if (error) return <p className="text-sm text-red-600 dark:text-red-400">{error}</p>;
  if (!contact) return null;

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    setBusy(true);
    try {
      const updated = await api.updateContact(id, { name, company, notes });
      setContact(updated);
      setEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save contact');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <PageHeader title={contact.name} subtitle={contact.company ?? undefined} />

      <Card className="mb-6 p-5">
        {!editing ? (
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <Avatar name={contact.name} size={12} />
              <div>
                <p className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">{contact.name}</p>
                {contact.company && <p className="text-sm text-zinc-500 dark:text-zinc-400">{contact.company}</p>}
                {contact.phones.map((phone) => (
                  <p key={phone.id} className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
                    {phone.e164} {phone.label && <span className="text-zinc-400 dark:text-zinc-500">({phone.label})</span>}
                  </p>
                ))}
                {contact.notes && <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">{contact.notes}</p>}
              </div>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-2">
              {contact.phones[0] && <DialButton target={contact.phones[0].e164} />}
              <button onClick={() => setEditing(true)} className={btnSecondary}>
                Edit
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={save}>
            <label className={labelCls} htmlFor="contact-name">
              Name
            </label>
            <input id="contact-name" value={name} onChange={(e) => setName(e.target.value)} required className={inputCls} />
            <label className={`${labelCls} mt-3`} htmlFor="contact-company">
              Company
            </label>
            <input id="contact-company" value={company} onChange={(e) => setCompany(e.target.value)} className={inputCls} />
            <label className={`${labelCls} mt-3`} htmlFor="contact-notes">
              Notes
            </label>
            <textarea
              id="contact-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className={inputCls}
            />
            <div className="mt-4 flex gap-2">
              <button type="submit" disabled={busy} className={btnPrimary}>
                {busy ? 'Saving…' : 'Save'}
              </button>
              <button type="button" onClick={() => setEditing(false)} className={btnSecondary}>
                Cancel
              </button>
            </div>
          </form>
        )}
      </Card>

      <Card className="p-5">
        <h2 className="mb-3 text-sm font-semibold text-zinc-900 dark:text-zinc-50">Call history</h2>
        <CallLog contactId={contact.id} />
      </Card>
    </div>
  );
}
