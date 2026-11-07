import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, type Contact } from '../lib/api';
import { Avatar, Card, EmptyState, PageHeader, inputCls } from '../components/ui';

export function Contacts() {
  const [search, setSearch] = useState('');
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handle = setTimeout(() => {
      api
        .contacts(search.trim() || undefined)
        .then(setContacts)
        .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load contacts'));
    }, 200);
    return () => clearTimeout(handle);
  }, [search]);

  return (
    <div>
      <PageHeader title="Contacts" />
      <input
        placeholder="Search by name…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className={`${inputCls} mb-5`}
      />
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      {!error && contacts.length === 0 && (
        <EmptyState title="No contacts" hint={search ? 'No match for that search.' : 'Contacts saved from calls will show up here.'} />
      )}
      {contacts.length > 0 && (
        <Card>
          <ul>
            {contacts.map((contact) => (
              <li key={contact.id} className="border-b border-zinc-100 last:border-0 dark:border-zinc-800">
                <Link
                  to={`/contacts/${contact.id}`}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                >
                  <Avatar name={contact.name} size={9} />
                  <div className="min-w-0">
                    <p className="truncate font-medium text-zinc-900 dark:text-zinc-50">{contact.name}</p>
                    {contact.company && <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">{contact.company}</p>}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
