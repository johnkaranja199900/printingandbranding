'use client';

import { useEffect, useState, useRef } from 'react';
import { AdminLayout } from '@/components/shared/AdminLayout';
import { Button } from '@/components/shared/Button';
import { StatusBadge, EmptyState } from '@/components/shared/primitives';
import { apiClient } from '@/lib/api-client';
import { useAppStore } from '@/stores/app-store';
import { Send, MessageCircle, Shield, Bot, Phone, Lock, Sparkles, Trash2, AlertTriangle } from 'lucide-react';

interface BotReply {
  reply: string;
  intent: string;
  orderNumber: string | null;
  orderFound: boolean;
  blocked: boolean;
}
interface ConversationMsg {
  id: string;
  fromPhone: string;
  direction: string;
  body: string;
  intent: string | null;
  status: string;
  createdAt: string;
}

const INTENT_LABELS: Record<string, string> = {
  order_tracking: 'Order Tracking',
  pricing: 'Pricing',
  services: 'Services',
  business_info: 'Business Info',
  greeting: 'Greeting',
  thanks: 'Thanks',
  sensitive_request: 'Sensitive Request',
  account_action: 'Account Action (Blocked)',
  general: 'General',
};

const SUGGESTED_PROMPTS = [
  'Hi, what services do you offer?',
  'How much is book printing?',
  'Where are you located?',
  'Track my order ORD-000001',
  'What is the phone number of Jane Njeri?',
  'How much did Bright Future Academy pay for ORD-000002?',
  'Please cancel order ORD-000002 and refund it',
  'What are your business hours?',
];

export function AdminWhatsAppBot() {
  const { pushToast } = useAppStore();
  const [phone, setPhone] = useState('+254712345678');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [lastReply, setLastReply] = useState<BotReply | null>(null);
  const [conversation, setConversation] = useState<{ role: 'user' | 'bot'; text: string; intent?: string }[]>([]);
  const [recent, setRecent] = useState<ConversationMsg[]>([]);
  const [loadingRecent, setLoadingRecent] = useState(true);
  const logRef = useRef<HTMLDivElement>(null);

  const loadRecent = async () => {
    setLoadingRecent(true);
    try {
      const res = await apiClient.get<{ items: ConversationMsg[]; total: number }>('/whatsapp/conversations');
      setRecent((res as any)?.items ?? []);
    } catch { setRecent([]); }
    finally { setLoadingRecent(false); }
  };

  useEffect(() => { loadRecent(); }, []);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [conversation]);

  const send = async (text?: string) => {
    const msg = (text ?? message).trim();
    if (!msg) { pushToast({ message: 'Type a message first.', type: 'warning' }); return; }
    setSending(true);
    setConversation((c) => [...c, { role: 'user', text: msg }]);
    setMessage('');
    try {
      const res = await apiClient.post<BotReply>('/whatsapp/test', { fromPhone: phone, message: msg });
      setLastReply(res);
      setConversation((c) => [...c, { role: 'bot', text: res.reply, intent: res.intent }]);
      loadRecent();
    } catch (e: any) {
      pushToast({ message: e.message ?? 'Bot failed to reply.', type: 'error' });
      setConversation((c) => [...c, { role: 'bot', text: '⚠️ Could not reach the bot. Please try again.' }]);
    } finally {
      setSending(false);
    }
  };

  const clearConversation = () => {
    setConversation([]);
    setLastReply(null);
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="rounded-2xl bg-gradient-to-br from-navy to-[#1f2937] p-6 text-white shadow-lg">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-xl bg-gold text-navy"><Bot className="h-6 w-6" /></div>
            <div>
              <h1 className="text-xl font-extrabold">WhatsApp Bot Console</h1>
              <p className="text-sm text-white/70">Privacy-first AI assistant for customer inquiries via WhatsApp</p>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-400/20 px-3 py-1 text-xs font-bold text-emerald-300"><Shield className="h-3 w-3" /> No PII shared</span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-400/20 px-3 py-1 text-xs font-bold text-emerald-300"><Lock className="h-3 w-3" /> No financial figures</span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-400/20 px-3 py-1 text-xs font-bold text-emerald-300"><MessageCircle className="h-3 w-3" /> Order status by number only</span>
          </div>
        </div>

        {/* How it works */}
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <Sparkles className="h-5 w-5 text-gold" />
            <h3 className="mt-2 font-bold text-navy">Intent-aware</h3>
            <p className="text-sm text-slate-500">Undersands greetings, services, pricing, business info, and order tracking — replies in a friendly, on-brand tone.</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <Lock className="h-5 w-5 text-gold" />
            <h3 className="mt-2 font-bold text-navy">Privacy-guarded</h3>
            <p className="text-sm text-slate-500">Never shares customer phone/email/address, financial totals, internal notes, or other customers' data. Sensitive requests are deflected to a human agent.</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <Shield className="h-5 w-5 text-gold" />
            <h3 className="mt-2 font-bold text-navy">Auditable</h3>
            <p className="text-sm text-slate-500">Every incoming + outgoing message is logged. Blocked sensitive requests raise an admin notification instantly.</p>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          {/* Test console */}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 p-4">
              <h2 className="font-bold text-navy">Live Test Console</h2>
              <button onClick={clearConversation} className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-rose-600">
                <Trash2 className="h-3.5 w-3.5" /> Clear
              </button>
            </div>

            {/* Phone */}
            <div className="border-b border-slate-100 p-4">
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">Simulated sender phone</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm focus:border-gold focus:bg-white focus:outline-none focus:ring-2 focus:ring-gold/20" />
              </div>
            </div>

            {/* Conversation */}
            <div ref={logRef} className="max-h-80 min-h-48 overflow-y-auto scrollbar-thin space-y-3 p-4">
              {conversation.length === 0 ? (
                <div className="grid h-full place-items-center py-10 text-center text-sm text-slate-400">
                  <div>
                    <MessageCircle className="mx-auto mb-2 h-8 w-8 text-slate-300" />
                    Send a test message below to see how the bot responds.
                  </div>
                </div>
              ) : conversation.map((m, i) => (
                <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm shadow-sm ${m.role === 'user' ? 'bg-navy text-white rounded-br-sm' : 'bg-slate-100 text-navy rounded-bl-sm'}`}>
                    {m.role === 'bot' && m.intent && (
                      <div className="mb-1 text-[0.65rem] font-bold uppercase tracking-wide text-gold">{INTENT_LABELS[m.intent] ?? m.intent}{m.intent === 'account_action' || m.intent === 'sensitive_request' ? ' · blocked' : ''}</div>
                    )}
                    <p className="whitespace-pre-wrap">{m.text}</p>
                  </div>
                </div>
              ))}
              {sending && (
                <div className="flex justify-start">
                  <div className="rounded-2xl rounded-bl-sm bg-slate-100 px-4 py-3 text-sm text-slate-400">
                    <span className="inline-flex gap-1">
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 [animation-delay:0ms]" />
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 [animation-delay:150ms]" />
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 [animation-delay:300ms]" />
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Input */}
            <div className="border-t border-slate-100 p-4">
              <div className="flex gap-2">
                <input
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !sending) send(); }}
                  placeholder="Type a message as if you were a customer on WhatsApp…"
                  className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm focus:border-gold focus:bg-white focus:outline-none focus:ring-2 focus:ring-gold/20"
                  disabled={sending}
                />
                <Button onClick={() => send()} variant="accent" size="md" disabled={sending}>
                  <Send className="h-4 w-4" />
                </Button>
              </div>

              {/* Suggested prompts */}
              <div className="mt-3">
                <p className="mb-1.5 text-[0.7rem] font-bold uppercase tracking-wide text-slate-400">Try these (incl. sensitive ones the bot should refuse):</p>
                <div className="flex flex-wrap gap-1.5">
                  {SUGGESTED_PROMPTS.map((p) => (
                    <button
                      key={p}
                      onClick={() => setMessage(p)}
                      disabled={sending}
                      className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600 hover:border-gold hover:bg-gold/5 hover:text-navy disabled:opacity-50"
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Last reply meta */}
            {lastReply && (
              <div className="border-t border-slate-100 bg-slate-50 p-4 text-xs">
                <div className="flex flex-wrap gap-3 text-slate-500">
                  <span>Intent: <strong className="text-navy">{INTENT_LABELS[lastReply.intent] ?? lastReply.intent}</strong></span>
                  {lastReply.orderNumber && <span>Order: <strong className="text-navy">{lastReply.orderNumber}</strong> {lastReply.orderFound ? <span className="text-emerald-600">(found)</span> : <span className="text-rose-600">(not found)</span>}</span>}
                  {lastReply.blocked && <span className="inline-flex items-center gap-1 font-bold text-rose-600"><AlertTriangle className="h-3 w-3" /> Blocked</span>}
                </div>
              </div>
            )}
          </div>

          {/* Recent conversations log */}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 p-4">
              <h2 className="font-bold text-navy">Recent Activity</h2>
              <button onClick={loadRecent} className="text-xs font-semibold text-gold hover:underline">Refresh</button>
            </div>
            <div className="max-h-[28rem] overflow-y-auto scrollbar-thin">
              {loadingRecent ? (
                <div className="space-y-2 p-4">
                  {[1,2,3,4].map((i) => <div key={i} className="h-12 animate-pulse rounded-lg bg-slate-100" />)}
                </div>
              ) : recent.length === 0 ? (
                <div className="p-4">
                  <EmptyState icon={<MessageCircle className="h-5 w-5" />} title="No conversations yet" description="Messages sent through the test console or live WhatsApp webhook will appear here." />
                </div>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {recent.slice(0, 30).map((m) => (
                    <li key={m.id} className="p-3 hover:bg-slate-50">
                      <div className="flex items-center justify-between gap-2">
                        <span className={`inline-flex items-center gap-1 text-[0.65rem] font-bold uppercase tracking-wide ${m.direction === 'incoming' ? 'text-sky-600' : 'text-emerald-600'}`}>
                          {m.direction === 'incoming' ? '↙ Incoming' : '↗ Reply'}
                        </span>
                        {m.intent && <span className="text-[0.65rem] font-semibold text-slate-400">{INTENT_LABELS[m.intent] ?? m.intent}</span>}
                        {m.status === 'blocked' && <StatusBadge status="CANCELLED" label="Blocked" />}
                      </div>
                      <p className="mt-1 line-clamp-2 text-sm text-slate-700">{m.body}</p>
                      <p className="mt-0.5 text-[0.7rem] text-slate-400">{m.fromPhone} · {new Date(m.createdAt).toLocaleString('en-KE', { dateStyle: 'short', timeStyle: 'short' })}</p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>

        {/* Webhook config info */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="font-bold text-navy">Webhook Configuration</h2>
          <p className="mt-1 text-sm text-slate-500">Point your Meta WhatsApp Business API webhook here to go live:</p>
          <div className="mt-3 space-y-2 text-sm">
            <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
              <span className="font-mono text-xs text-slate-600">POST /api/whatsapp/webhook</span>
              <span className="text-xs text-slate-400">Receives incoming messages</span>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
              <span className="font-mono text-xs text-slate-600">GET /api/whatsapp/webhook</span>
              <span className="text-xs text-slate-400">Webhook verification (hub.mode / hub.verify_token)</span>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-amber-50 px-3 py-2">
              <span className="font-mono text-xs text-amber-700">WHATSAPP_VERIFY_TOKEN env var</span>
              <span className="text-xs text-amber-600">Set to match Meta dashboard</span>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-amber-50 px-3 py-2">
              <span className="font-mono text-xs text-amber-700">X-Hub-Signature-256</span>
              <span className="text-xs text-amber-600">Validate before going live</span>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

export default AdminWhatsAppBot;
