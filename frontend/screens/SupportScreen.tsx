import React, { useState, useEffect, useCallback } from 'react';
import { useAppOutlet } from '../hooks/useAppOutlet';
import {
  fetchMyTickets, createTicket, replyToTicket,
  type SupportTicket, type SupportStatus,
} from '../services/support';

const StatusBadge: React.FC<{ status: SupportStatus }> = ({ status }) => {
  const map: Record<SupportStatus, string> = {
    OPEN: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
    ANSWERED: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
    CLOSED: 'bg-gray-200 text-gray-600 dark:bg-neutral-dark dark:text-gray-400',
  };
  const label = { OPEN: 'Awaiting reply', ANSWERED: 'Answered', CLOSED: 'Closed' }[status];
  return <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full ${map[status]}`}>{label}</span>;
};

// Short, human-friendly label for a placed bet, used in the "reference a bet" picker.
function betLabel(b: { isMulti?: boolean; selections?: unknown[]; selection: { matchDescription: string; marketLabel: string } }): string {
  if (b.isMulti && Array.isArray(b.selections)) return `Accumulator · ${b.selections.length} legs`;
  return `${b.selection.marketLabel} — ${b.selection.matchDescription}`;
}

const TicketThread: React.FC<{ ticket: SupportTicket; onReplied: () => void }> = ({ ticket, onReplied }) => {
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const send = async () => {
    if (!body.trim()) return;
    setBusy(true);
    setErr('');
    try {
      await replyToTicket(ticket.id, body.trim());
      setBody('');
      onReplied();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to send.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="bg-white dark:bg-neutral-dark-gray border border-gray-200 dark:border-neutral-border rounded-xl p-4">
      <div className="flex justify-between items-start gap-3">
        <div className="min-w-0">
          <p className="font-bold truncate">{ticket.subject}</p>
          {ticket.betRef && (
            <p className="text-xs text-primary font-mono mt-0.5">Ref bet #{ticket.betRef.slice(0, 10)}</p>
          )}
        </div>
        <StatusBadge status={ticket.status} />
      </div>

      <div className="mt-3 space-y-2">
        {ticket.messages.map((m) => (
          <div key={m.id} className={`flex ${m.from === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-sm ${
              m.from === 'user'
                ? 'bg-primary text-white rounded-br-sm'
                : 'bg-gray-100 dark:bg-neutral-dark text-neutral-dark dark:text-gray-200 rounded-bl-sm'
            }`}>
              <p className="whitespace-pre-wrap break-words">{m.body}</p>
              <p className={`text-[10px] mt-1 ${m.from === 'user' ? 'text-white/70' : 'text-gray-400'}`}>
                {m.from === 'admin' ? 'Support' : 'You'} · {new Date(m.date).toLocaleString()}
              </p>
            </div>
          </div>
        ))}
      </div>

      {ticket.status !== 'CLOSED' ? (
        <div className="mt-3 flex gap-2">
          <input
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && send()}
            placeholder="Type a reply…"
            className="flex-grow px-3 py-2 text-sm border border-gray-300 dark:border-neutral-border rounded-lg bg-transparent focus:ring-1 focus:ring-primary focus:border-primary dark:text-white"
          />
          <button onClick={send} disabled={busy || !body.trim()} className="bg-primary text-white text-sm font-bold px-4 rounded-lg disabled:opacity-50">
            Send
          </button>
        </div>
      ) : (
        <p className="mt-3 text-xs text-gray-400">This ticket is closed. Open a new one if you still need help.</p>
      )}
      {err && <p className="text-xs text-danger mt-2">{err}</p>}
    </div>
  );
};

const SupportScreen: React.FC = () => {
  const { wallet, addToast } = useAppOutlet();
  const bets = wallet.placedBets;
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [betRef, setBetRef] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setTickets(await fetchMyTickets());
    } catch {
      /* offline / not signed in — show empty */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const attachBet = (id: string) => {
    setBetRef(id);
    // Drop a #hashtag into the message so the agent sees the reference inline.
    const tag = `#${id.slice(0, 10)}`;
    setMessage((m) => (m.includes(tag) ? m : (m ? `${m} ${tag}` : `Regarding my bet ${tag}: `)));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) { addToast('Please write a message.', 'error'); return; }
    setBusy(true);
    try {
      await createTicket(subject.trim() || 'Support request', message.trim(), betRef);
      setSubject(''); setMessage(''); setBetRef('');
      addToast('Message sent — our team will reply shortly.', 'success');
      await load();
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to send message.', 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="py-4 max-w-3xl mx-auto">
      <h1 className="text-2xl sm:text-3xl font-bold mb-1">Help &amp; Support</h1>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
        Send us a message and we'll get back to you. If it's about a bet, attach it so we have the details.
      </p>

      {/* New message */}
      <form onSubmit={submit} className="bg-white dark:bg-neutral-dark-gray border border-gray-200 dark:border-neutral-border rounded-xl p-4 mb-6 space-y-3">
        <input
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Subject (e.g. Withdrawal delay)"
          className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-neutral-border rounded-lg bg-transparent focus:ring-1 focus:ring-primary focus:border-primary dark:text-white"
        />
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="How can we help?"
          rows={4}
          className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-neutral-border rounded-lg bg-transparent focus:ring-1 focus:ring-primary focus:border-primary dark:text-white resize-none"
        />

        {bets.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5">Reference a bet (optional)</p>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {bets.slice(0, 8).map((b) => (
                <button
                  type="button"
                  key={b.id}
                  onClick={() => attachBet(b.id)}
                  className={`shrink-0 text-xs px-3 py-1.5 rounded-full border transition-colors ${
                    betRef === b.id
                      ? 'bg-primary text-white border-primary'
                      : 'bg-transparent border-gray-300 dark:border-neutral-border text-gray-500 hover:border-primary hover:text-primary'
                  }`}
                  title={betLabel(b)}
                >
                  #{b.id.slice(0, 6)} · {betLabel(b).slice(0, 28)}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex justify-end">
          <button type="submit" disabled={busy} className="bg-primary text-white font-bold text-sm px-5 py-2.5 rounded-lg hover:bg-primary-dark disabled:opacity-50">
            {busy ? 'Sending…' : 'Send message'}
          </button>
        </div>
      </form>

      {/* Existing tickets */}
      <h2 className="text-lg font-bold mb-3">Your conversations</h2>
      {loading ? (
        <p className="text-sm text-gray-400">Loading…</p>
      ) : tickets.length === 0 ? (
        <p className="text-sm text-gray-400">No messages yet. Start a conversation above.</p>
      ) : (
        <div className="space-y-4">
          {tickets.map((t) => <TicketThread key={t.id} ticket={t} onReplied={load} />)}
        </div>
      )}
    </div>
  );
};

export default SupportScreen;
