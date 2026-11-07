import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, type EnquiryDetail as EnquiryDetailType } from '../lib/api';
import { Avatar, Card, PageHeader, btnPrimary, inputCls } from '../components/ui';

export function EnquiryDetail() {
  const { id } = useParams<{ id: string }>();
  const [enquiry, setEnquiry] = useState<EnquiryDetailType | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);

  const load = () => {
    if (!id) return;
    api.enquiry(id).then(setEnquiry).catch((err) => setError(err instanceof Error ? err.message : 'Failed to load'));
  };

  useEffect(load, [id]);

  const sendReply = async () => {
    if (!id || !reply.trim()) return;
    setSending(true);
    try {
      await api.replyToEnquiry(id, reply.trim());
      setReply('');
      load();
    } finally {
      setSending(false);
    }
  };

  if (error) return <p className="text-sm text-red-600 dark:text-red-400">{error}</p>;
  if (!enquiry) return null;

  const name = enquiry.contactName ?? enquiry.senderName ?? enquiry.senderContact ?? 'Unknown';

  return (
    <div>
      <Link to="/enquiries" className="mb-3 inline-block text-sm text-zinc-500 hover:underline dark:text-zinc-400">
        ← All enquiries
      </Link>
      <PageHeader
        title={name}
        subtitle={`${enquiry.channel} · ${enquiry.status}`}
        actions={
          enquiry.contactId && (
            <Link to={`/contacts/${enquiry.contactId}`} className="text-sm text-indigo-600 hover:underline dark:text-indigo-400">
              View contact
            </Link>
          )
        }
      />

      <Card className="mb-4 p-5">
        <div className="space-y-4">
          {enquiry.messages.map((msg) => (
            <div key={msg.id} className={`flex gap-3 ${msg.direction === 'outbound' ? 'flex-row-reverse' : ''}`}>
              <Avatar name={msg.direction === 'outbound' ? 'Agent' : name} size={8} />
              <div
                className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm ${
                  msg.direction === 'outbound'
                    ? 'bg-indigo-600 text-white dark:text-[#111]'
                    : 'bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-100'
                }`}
              >
                <p className="whitespace-pre-wrap">{msg.body}</p>
                <p className={`mt-1 text-xs ${msg.direction === 'outbound' ? 'text-white/70 dark:text-black/60' : 'text-zinc-400'}`}>
                  {new Date(msg.createdAt).toLocaleString()}
                </p>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-5">
        <label className="mb-1.5 block text-[13px] font-medium text-zinc-600 dark:text-zinc-400">Reply</label>
        <div className="flex items-end gap-2">
          <input
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            placeholder="Write a reply…"
            className={inputCls}
          />
          <button onClick={sendReply} disabled={sending || !reply.trim()} className={btnPrimary}>
            {sending ? 'Sending…' : 'Send'}
          </button>
        </div>
        <p className="mt-2 text-xs text-zinc-400 dark:text-zinc-500">
          Logs your reply and marks this enquiry handled — it doesn't send an email or message yet.
        </p>
      </Card>
    </div>
  );
}
