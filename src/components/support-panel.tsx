'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Inbox, MessageSquare, RefreshCw } from 'lucide-react';
import { useAccount } from './account-provider';
import { accountFetch } from '@/lib/auth-client';
import type { SupportTicket, SupportMessage } from '@/lib/platform';
import { TicketListSkeleton, ThreadSkeleton } from './skeleton';
export function SupportPanel() {
  const { user, loading: accountLoading } = useAccount();
  const [loading, setLoading] = useState(true);
  const [messagesFor, setMessagesFor] = useState('');
  const generation = useRef(0);
  const [name, setName] = useState(''),
    [email, setEmail] = useState(''),
    [subject, setSubject] = useState(''),
    [message, setMessage] = useState(''),
    [website, setWebsite] = useState(''),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [receipt, setReceipt] = useState('');
  const [tickets, setTickets] = useState<SupportTicket[]>([]),
    [selected, setSelected] = useState(''),
    [messages, setMessages] = useState<SupportMessage[]>([]),
    [reply, setReply] = useState('');
  const load = useCallback(async () => {
    const current = ++generation.current;
    if (!user) {
      setTickets([]);
      setMessages([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await (
        await accountFetch(`/api/support${selected ? `?ticket=${selected}` : ''}`)
      ).json();
      if (current !== generation.current) return;
      setTickets(data.tickets);
      setMessages(data.messages);
      setMessagesFor(selected);
    } catch (e) {
      if (current === generation.current)
        setError(e instanceof Error ? e.message : 'Your inquiries could not be loaded.');
    } finally {
      if (current === generation.current) setLoading(false);
    }
  }, [user, selected]);
  useEffect(() => {
    if (user?.email) setEmail(user.email);
    const profileName = user?.user_metadata.full_name || user?.user_metadata.name;
    if (typeof profileName === 'string') setName(profileName.slice(0, 100));
  }, [user]);
  useEffect(() => {
    void load();
    return () => {
      // oxlint-disable-next-line react-hooks/exhaustive-deps -- Invalidate in-flight requests; this ref is a generation counter, not a DOM node.
      generation.current++;
    };
  }, [load]);
  useEffect(() => {
    setTickets([]);
    setMessages([]);
    setSelected('');
    setMessagesFor('');
  }, [user?.id]);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    setReceipt('');
    try {
      const init = {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, subject, message, website }),
      };
      const response = user
        ? await accountFetch('/api/support', init)
        : await fetch('/api/support', init);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Your message could not be sent.');
      setReceipt(data.id);
      setSubject('');
      setMessage('');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Your message could not be sent.');
    } finally {
      setBusy(false);
    }
  }
  async function postReply(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await accountFetch('/api/support', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticket: selected, message: reply }),
      });
      setReply('');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Your reply could not be sent.');
    } finally {
      setBusy(false);
    }
  }
  const ticket = tickets.find((t) => t.id === selected);
  return (
    <>
      <div className="support-grid">
        <section className="admin-card">
          <span className="account-symbol">
            <MessageSquare size={25} />
          </span>
          <h2>Tell us what’s on your mind.</h2>
          <p>A billing question, a document problem, or an idea for Folio—we’re listening.</p>
          <form onSubmit={submit}>
            <fieldset disabled={busy}>
              <div className="admin-two-fields">
                <label>
                  Your name
                  <input
                    required
                    minLength={2}
                    maxLength={100}
                    autoComplete="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </label>
                <label>
                  Email address
                  <input
                    required
                    type="email"
                    maxLength={254}
                    autoComplete="email"
                    readOnly={!!user}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </label>
              </div>
              <label>
                Subject
                <input
                  required
                  minLength={3}
                  maxLength={160}
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                />
              </label>
              <label>
                Message
                <textarea
                  required
                  minLength={10}
                  maxLength={5000}
                  rows={6}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                />
              </label>
              <label className="support-honeypot" aria-hidden="true">
                Website
                <input
                  tabIndex={-1}
                  autoComplete="off"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                />
              </label>
              <div className="form-actions">
                <p className="service-note">
                  Do not include passwords, card numbers, or sensitive document contents. Replies
                  appear here after sign-in with the email used for your inquiry.
                </p>
                <button className="button primary">
                  {busy ? 'Sending…' : 'Send inquiry'}
                  <ArrowRight size={16} />
                </button>
              </div>
            </fieldset>
          </form>
          {receipt && (
            <div className="pro-notice" role="status">
              <span>
                Your inquiry was received. Reference: {receipt.slice(0, 8)}.
                {!user && (
                  <>
                    {' '}
                    <Link href="/account">Sign in with {email}</Link> to follow the conversation.
                  </>
                )}
              </span>
            </div>
          )}
        </section>
        <section className="admin-card">
          <div className="admin-table-top">
            <h2>Your conversations</h2>
            <button
              className="icon-button"
              aria-label="Refresh support conversations"
              disabled={!user || busy || loading}
              onClick={() => void load()}
            >
              <RefreshCw size={17} />
            </button>
          </div>
          {(accountLoading && !user) || (loading && !tickets.length) ? (
            <TicketListSkeleton />
          ) : !user ? (
            <div className="admin-empty">
              <Inbox size={27} />
              <p>Sign in to see replies and follow up on your inquiries.</p>
              <Link className="button secondary" href="/account">
                Sign in
              </Link>
            </div>
          ) : !tickets.length ? (
            <div className="admin-empty">
              <Inbox size={27} />
              <p>Your inquiries will appear here.</p>
            </div>
          ) : (
            <div className="admin-ticket-list">
              {tickets.map((t) => (
                <button
                  key={t.id}
                  className={selected === t.id ? 'selected' : ''}
                  onClick={() => {
                    if (selected === t.id) return;
                    setSelected(t.id);
                    setLoading(true);
                    setMessages([]);
                    setReply('');
                  }}
                >
                  <strong>{t.subject}</strong>
                  <small>
                    {t.status} · {new Date(t.updated_at).toLocaleDateString()}
                  </small>
                </button>
              ))}
            </div>
          )}
          {ticket && (
            <>
              <h3>{ticket.subject}</h3>
              {loading && messagesFor !== selected ? (
                <ThreadSkeleton />
              ) : (
                <div className="support-thread">
                  <article>
                    <strong>You</strong>
                    <p>{ticket.message}</p>
                  </article>
                  {messages.map((m) => (
                    <article key={m.id} className={m.staff ? 'staff' : ''}>
                      <strong>{m.staff ? 'Folio support' : 'You'}</strong>
                      <p>{m.message}</p>
                      <small>{new Date(m.created_at).toLocaleString()}</small>
                    </article>
                  ))}
                </div>
              )}
              <form onSubmit={postReply}>
                <label>
                  Add a reply
                  <textarea
                    required
                    rows={4}
                    maxLength={5000}
                    value={reply}
                    onChange={(e) => setReply(e.target.value)}
                  />
                </label>
                <button className="button primary" disabled={busy}>
                  Post reply <ArrowRight size={16} />
                </button>
              </form>
            </>
          )}
        </section>
      </div>
      {error && (
        <p className="error-message" role="alert">
          {error}
        </p>
      )}
    </>
  );
}
