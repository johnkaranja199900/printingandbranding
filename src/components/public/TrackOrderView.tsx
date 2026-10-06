'use client';

import { useState } from 'react';
import { useAppStore } from '@/stores/app-store';
import { apiClient, ApiError } from '@/lib/api-client';
import { Button, NavButton } from '@/components/shared/Button';
import { Eyebrow, PageHero, StatusBadge, Money } from '@/components/shared/primitives';
import { Search, MapPin, AlertCircle, Lock, CheckCircle2, Package, Calendar, FileText, User, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TrackingItem { description: string; quantity: number; status: string }
interface TrackingEvent { fromStatus: string | null; toStatus: string; reason?: string | null; createdAt: string }
interface TrackingResult {
  orderNumber: string;
  status: string;
  paymentStatus: string;
  currency: string;
  amountDue?: string | null;
  total?: string | null;
  expectedCompletionDate?: string | null;
  actualCompletionDate?: string | null;
  createdAt: string;
  customerName?: string | null;
  customerCity?: string | null;
  items: TrackingItem[];
  timeline: TrackingEvent[];
  fullAccess: boolean;
}

const STAGES = [
  { key: 'pending', label: 'Pending', statuses: ['PENDING', 'AWAITING_PAYMENT'] },
  { key: 'confirmed', label: 'Confirmed', statuses: ['CONFIRMED'] },
  { key: 'production', label: 'Production', statuses: ['QUEUED', 'IN_PRODUCTION'] },
  { key: 'qc', label: 'QC', statuses: ['QUALITY_CHECK'] },
  { key: 'ready', label: 'Ready', statuses: ['READY'] },
  { key: 'completed', label: 'Completed', statuses: ['COMPLETED'] },
];

function currentStageIndex(status: string): number {
  if (status === 'CANCELLED' || status === 'REFUNDED') return -1;
  for (let i = 0; i < STAGES.length; i++) {
    if (STAGES[i].statuses.includes(status)) return i;
  }
  return 0;
}

export function TrackOrderView() {
  const { pushToast } = useAppStore();
  const [orderNumber, setOrderNumber] = useState('');
  const [trackingToken, setTrackingToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TrackingResult | null>(null);
  const [notFound, setNotFound] = useState<string | null>(null);

  const handleTrack = async () => {
    const num = orderNumber.trim().toUpperCase();
    if (!num) {
      pushToast({ message: 'Please enter an order number.', type: 'warning' });
      return;
    }
    setLoading(true);
    setResult(null);
    setNotFound(null);
    try {
      const params = new URLSearchParams({ orderNumber: num });
      if (trackingToken.trim()) params.set('trackingToken', trackingToken.trim());
      const data = await apiClient.get<TrackingResult>(`/public/track?${params.toString()}`);
      setResult(data as any);
    } catch (e: any) {
      if (e instanceof ApiError && (e.status === 404)) {
        setNotFound(e.message || 'Order not found. Please check your order number.');
      } else {
        setNotFound(e.message ?? 'Unable to retrieve order. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const fmtDate = (d?: string | null) => d ? new Date(d).toLocaleDateString('en-KE', { year: 'numeric', month: 'short', day: 'numeric' }) : '—';

  return (
    <>
      <PageHero
        eyebrow="Track Your Order"
        title="Follow your order from quote to completion"
        description="Enter your order reference number to view real-time status. Add the tracking token from your confirmation email or SMS to see full payment details."
        breadcrumbs="Home / Track Order"
        actions={<NavButton to="contact" variant="outline" size="lg">Contact Us</NavButton>}
      />

      <section className="py-12 lg:py-16">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          {/* Search card */}
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <Eyebrow>Order tracking</Eyebrow>
            <h2 className="mt-2 text-2xl font-bold text-navy sm:text-3xl">Enter your order reference</h2>
            <p className="mt-2 text-sm text-slate-500">Your order number looks like <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs font-bold text-navy">ORD-000123</code>.</p>

            <div className="mt-6 space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-bold text-navy">Order / Reference Number <span className="text-rose-500">*</span></label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    value={orderNumber}
                    onChange={(e) => setOrderNumber(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleTrack(); }}
                    placeholder="e.g. ORD-000123"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 pl-10 text-sm font-bold uppercase tracking-wide text-navy focus:border-gold focus:bg-white focus:outline-none focus:ring-2 focus:ring-gold/20"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-bold text-navy">Tracking Token <span className="font-medium text-slate-400">(optional)</span></label>
                <input
                  value={trackingToken}
                  onChange={(e) => setTrackingToken(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleTrack(); }}
                  placeholder="Paste the token from your email/SMS"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-mono focus:border-gold focus:bg-white focus:outline-none focus:ring-2 focus:ring-gold/20"
                />
                <p className="mt-1 text-xs text-slate-400">Without a token you'll see limited status info. With a valid token you'll see payment totals and item details.</p>
              </div>

              <Button variant="primary" size="lg" className="w-full" onClick={handleTrack} disabled={loading}>
                {loading ? 'Tracking...' : <>Track Order <Search className="h-4 w-4" /></>}
              </Button>
            </div>
          </div>

          {/* Not found */}
          {notFound && !result && (
            <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center">
              <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-rose-100">
                <AlertCircle className="h-6 w-6 text-rose-600" />
              </div>
              <h3 className="text-lg font-bold text-navy">Order not found</h3>
              <p className="mt-1 text-sm text-slate-600">{notFound}</p>
              <p className="mt-2 text-xs text-slate-500">Double-check your order number — it should start with <strong>ORD-</strong> followed by a 6-digit number. If you continue to have trouble, please contact us.</p>
              <NavButton to="contact" variant="ghost" size="sm" className="mt-4">Contact Support</NavButton>
            </div>
          )}

          {/* Result */}
          {result && (
            <div className="mt-8 space-y-6">
              {/* Summary */}
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <Eyebrow>Current status</Eyebrow>
                    <h2 className="mt-2 text-2xl font-bold text-navy sm:text-3xl">Order #{result.orderNumber}</h2>
                    {result.customerName && <p className="mt-1 text-sm text-slate-500">For {result.customerName}{result.customerCity ? ` · ${result.customerCity}` : ''}</p>}
                  </div>
                  <div className="flex flex-col items-start gap-2">
                    <StatusBadge status={result.status} />
                    <StatusBadge status={result.paymentStatus} label={(result.paymentStatus ?? '').replace(/_/g, ' ')} />
                  </div>
                </div>

                <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <SummaryCell icon={<Calendar className="h-4 w-4" />} label="Order Date" value={fmtDate(result.createdAt)} />
                  <SummaryCell icon={<Package className="h-4 w-4" />} label="Items" value={`${result.items.length} item${result.items.length !== 1 ? 's' : ''}`} />
                  <SummaryCell icon={<Calendar className="h-4 w-4" />} label="Expected Completion" value={fmtDate(result.expectedCompletionDate)} />
                  <SummaryCell
                    icon={<CheckCircle2 className="h-4 w-4" />}
                    label="Completed On"
                    value={result.actualCompletionDate ? fmtDate(result.actualCompletionDate) : 'In progress'}
                  />
                </div>

                {/* Payment (full access only) */}
                {result.fullAccess && (result.total || result.amountDue) && (
                  <div className="mt-6 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-xl bg-slate-50 p-4">
                      <p className="text-xs text-slate-500">Order Total</p>
                      <p className="mt-1 text-lg font-bold text-navy"><Money amount={result.total} currency={result.currency || 'KES'} /></p>
                    </div>
                    <div className="rounded-xl bg-navy p-4 text-white">
                      <p className="text-xs text-white/60">Amount Due</p>
                      <p className="mt-1 text-lg font-bold text-gold"><Money amount={result.amountDue} currency={result.currency || 'KES'} /></p>
                    </div>
                  </div>
                )}

                {/* Limited access notice */}
                {!result.fullAccess && (
                  <div className="mt-6 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
                    <Lock className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-600" />
                    <div>
                      <p className="text-sm font-bold text-navy">Limited view — enter tracking token for full details</p>
                      <p className="mt-1 text-xs text-slate-600">Payment totals and item descriptions are hidden for your privacy. The tracking token was sent via email or SMS when your order was confirmed.</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Items */}
              {result.fullAccess && result.items.length > 0 && (
                <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
                  <Eyebrow>Order items</Eyebrow>
                  <h3 className="mt-2 text-xl font-bold text-navy">What we're producing for you</h3>
                  <ul className="mt-4 divide-y divide-slate-100">
                    {result.items.map((item, i) => (
                      <li key={i} className="flex items-center justify-between gap-4 py-3">
                        <div className="flex items-center gap-3">
                          <span className="grid h-9 w-9 place-items-center rounded-lg bg-slate-100 text-navy"><FileText className="h-4 w-4" /></span>
                          <div>
                            <p className="text-sm font-bold text-navy">{item.description}</p>
                            <p className="text-xs text-slate-500">Qty: {item.quantity}</p>
                          </div>
                        </div>
                        <StatusBadge status={item.status} />
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Status timeline */}
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
                <Eyebrow>Status timeline</Eyebrow>
                <h3 className="mt-2 text-xl font-bold text-navy">Order journey</h3>

                {result.status === 'CANCELLED' || result.status === 'REFUNDED' ? (
                  <div className="mt-6 rounded-xl border border-rose-200 bg-rose-50 p-5 text-center">
                    <AlertCircle className="mx-auto h-8 w-8 text-rose-600" />
                    <p className="mt-2 font-bold text-rose-700">This order has been {result.status.toLowerCase()}.</p>
                  </div>
                ) : (
                  <>
                    {/* Horizontal stepper (lg+) */}
                    <ol className="mt-6 hidden lg:flex">
                      {STAGES.map((stage, i) => {
                        const current = currentStageIndex(result.status);
                        const isDone = i < current;
                        const isCurrent = i === current;
                        const isLast = i === STAGES.length - 1;
                        return (
                          <li key={stage.key} className={cn('flex items-center', !isLast && 'flex-1')}>
                            <div className="flex flex-col items-center text-center">
                              <div className={cn(
                                'grid h-10 w-10 place-items-center rounded-full border-2 transition-colors',
                                isDone && 'border-emerald-500 bg-emerald-500 text-white',
                                isCurrent && 'border-gold bg-gold text-navy shadow-lg shadow-gold/30',
                                !isDone && !isCurrent && 'border-slate-200 bg-white text-slate-400',
                              )}>
                                {isDone ? <CheckCircle2 className="h-5 w-5" /> : <span className="text-sm font-extrabold">{i + 1}</span>}
                              </div>
                              <p className={cn('mt-2 text-xs font-bold', isCurrent ? 'text-navy' : isDone ? 'text-emerald-700' : 'text-slate-400')}>{stage.label}</p>
                            </div>
                            {!isLast && (
                              <div className={cn('mx-2 h-0.5 flex-1', isDone ? 'bg-emerald-500' : 'bg-slate-200')} />
                            )}
                          </li>
                        );
                      })}
                    </ol>

                    {/* Vertical (mobile) */}
                    <ol className="mt-6 space-y-3 lg:hidden">
                      {STAGES.map((stage, i) => {
                        const current = currentStageIndex(result.status);
                        const isDone = i < current;
                        const isCurrent = i === current;
                        return (
                          <li key={stage.key} className="flex items-center gap-3">
                            <div className={cn(
                              'grid h-8 w-8 flex-shrink-0 place-items-center rounded-full border-2 text-xs font-extrabold',
                              isDone && 'border-emerald-500 bg-emerald-500 text-white',
                              isCurrent && 'border-gold bg-gold text-navy',
                              !isDone && !isCurrent && 'border-slate-200 bg-white text-slate-400',
                            )}>
                              {isDone ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
                            </div>
                            <span className={cn('text-sm font-bold', isCurrent ? 'text-navy' : isDone ? 'text-emerald-700' : 'text-slate-400')}>{stage.label}</span>
                            {isCurrent && <ChevronRight className="ml-auto h-4 w-4 text-gold" />}
                          </li>
                        );
                      })}
                    </ol>

                    {/* History events */}
                    {result.timeline && result.timeline.length > 0 && (
                      <div className="mt-8 border-t border-slate-100 pt-6">
                        <p className="text-sm font-bold text-navy">Status history</p>
                        <ul className="mt-3 space-y-3">
                          {result.timeline.slice().reverse().map((ev, i) => (
                            <li key={i} className="flex items-start gap-3 rounded-lg bg-slate-50 px-3 py-2">
                              <div className="mt-1 h-2 w-2 flex-shrink-0 rounded-full bg-gold" />
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-navy">
                                  {ev.fromStatus ? (ev.fromStatus ?? '').replace(/_/g, ' ') : 'Created'}
                                  {' → '}
                                  <span className="text-gold">{(ev.toStatus ?? '').replace(/_/g, ' ')}</span>
                                </p>
                                <p className="text-xs text-slate-500">
                                  {new Date(ev.createdAt).toLocaleString('en-KE', { dateStyle: 'medium', timeStyle: 'short' })}
                                  {ev.reason ? ` · ${ev.reason}` : ''}
                                </p>
                              </div>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Next steps */}
              <div className="rounded-2xl bg-gradient-to-br from-navy to-navy-soft p-6 text-white sm:p-8">
                <Eyebrow className="text-gold">Need help with this order?</Eyebrow>
                <h3 className="mt-2 text-lg font-bold">Questions about your order?</h3>
                <p className="mt-1 text-sm text-white/70">Have your order number ready when you contact our team for faster support.</p>
                <div className="mt-4 flex flex-wrap gap-3">
                  <NavButton to="contact" variant="accent" size="md"><User className="h-4 w-4" /> Contact Support</NavButton>
                  {result.fullAccess && (
                    <NavButton to="quote" variant="outline" size="md">Request Another Quote</NavButton>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Empty hint (no search yet) */}
          {!result && !notFound && !loading && (
            <div className="mt-8 rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
              <MapPin className="mx-auto h-10 w-10 text-slate-300" />
              <h3 className="mt-3 text-base font-bold text-navy">Ready when you are</h3>
              <p className="mt-1 text-sm text-slate-500">Enter your order number above to see real-time status updates.</p>
            </div>
          )}
        </div>
      </section>
    </>
  );
}

function SummaryCell({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <span className="text-gold">{icon}</span> {label}
      </div>
      <p className="mt-1 text-sm font-bold text-navy">{value}</p>
    </div>
  );
}

export default TrackOrderView;
