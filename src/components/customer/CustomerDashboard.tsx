'use client';

import { useCallback, useEffect, useState } from 'react';
import { CustomerLayout } from '@/components/shared/CustomerLayout';
import { Button, NavButton } from '@/components/shared/Button';
import {
  StatusBadge, Money, EmptyState, Eyebrow,
} from '@/components/shared/primitives';
import { apiClient } from '@/lib/api-client';
import { useAppStore } from '@/stores/app-store';
import { formatDate, toNumber } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Wallet, ShoppingCart, FileText, Bell, ArrowRight, CreditCard,
  Package, Sparkles, ChevronRight,
} from 'lucide-react';

// ---------- API types ----------
interface DashboardOrder {
  id: string;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  total: string | number;
  amountPaid: string | number;
  amountDue: string | number;
  createdAt: string;
  items: { id: string }[];
}

interface DashboardQuoteRequest {
  id: string;
  requestNumber: string;
  subject: string;
  status: string;
  priority: string;
  createdAt: string;
  service?: { name: string } | null;
}

interface DashboardPayment {
  id: string;
  paymentReference: string;
  method: string;
  amount: string | number;
  status: string;
  createdAt: string;
  order?: { orderNumber: string } | null;
}

interface DashboardNotification {
  id: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  createdAt: string;
  link?: string | null;
}

interface DashboardResponse {
  stats: {
    outstanding: number | string;
    activeOrders: number;
    pendingQuotes: number;
    unreadNotifications: number;
  };
  orders: DashboardOrder[];
  quoteRequests: DashboardQuoteRequest[];
  payments: DashboardPayment[];
  notifications: DashboardNotification[];
}

// ---------- Component ----------
export function CustomerDashboard() {
  const { user, navigate, pushToast } = useAppStore();
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get<DashboardResponse>('/customer/dashboard');
      setData(res);
    } catch (e: any) {
      setError(e.message ?? 'Failed to load dashboard.');
      pushToast({ message: e.message ?? 'Failed to load dashboard.', type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [pushToast]);

  useEffect(() => { load(); }, [load]);

  const stats = data?.stats;
  const outstanding = toNumber(stats?.outstanding ?? 0);

  return (
    <CustomerLayout>
      {/* Header */}
      <div className="mb-6 flex flex-col gap-1">
        <Eyebrow>Customer Portal</Eyebrow>
        <h1 className="text-2xl font-extrabold text-navy sm:text-3xl">
          Welcome back, {user?.name?.split(' ')[0] ?? 'there'} 👋
        </h1>
        <p className="text-sm text-slate-500">
          Here&rsquo;s a snapshot of your account activity and outstanding balances.
        </p>
      </div>

      {/* Stat cards */}
      {loading ? (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-2xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          <StatCard
            label="Outstanding Balance"
            value={outstanding > 0 ? <Money amount={outstanding} /> : 'KES 0'}
            icon={<Wallet className="h-5 w-5" />}
            accent={outstanding > 0 ? 'rose' : 'emerald'}
          />
          <StatCard
            label="Active Orders"
            value={String(stats?.activeOrders ?? 0)}
            icon={<ShoppingCart className="h-5 w-5" />}
            accent="sky"
            onClick={() => navigate('customer-orders')}
          />
          <StatCard
            label="Pending Quotes"
            value={String(stats?.pendingQuotes ?? 0)}
            icon={<FileText className="h-5 w-5" />}
            accent="amber"
            onClick={() => navigate('customer-quotations')}
          />
          <StatCard
            label="Unread Notifications"
            value={String(stats?.unreadNotifications ?? 0)}
            icon={<Bell className="h-5 w-5" />}
            accent="violet"
            onClick={() => navigate('customer-notifications')}
          />
        </div>
      )}

      {/* Two-column: Recent Orders + Quick Actions/Notifications */}
      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Recent orders */}
        <section className="lg:col-span-2">
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <header className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <h2 className="flex items-center gap-2 text-base font-bold text-navy">
                <Package className="h-4 w-4 text-gold" /> Recent Orders
              </h2>
              <button onClick={() => navigate('customer-orders')} className="flex items-center gap-1 text-xs font-bold text-gold hover:underline">
                View all <ArrowRight className="h-3 w-3" />
              </button>
            </header>
            <div className="divide-y divide-slate-100">
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="px-5 py-4"><Skeleton className="h-12 w-full" /></div>
                ))
              ) : data && data.orders.length > 0 ? (
                data.orders.map((o) => (
                  <button
                    key={o.id}
                    onClick={() => navigate('customer-order-detail', { id: o.id })}
                    className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left transition-colors hover:bg-slate-50"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-navy">{o.orderNumber}</span>
                        <StatusBadge status={o.status} />
                      </div>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {formatDate(o.createdAt)} · {o.items?.length ?? 0} item(s)
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-navy"><Money amount={o.total} /></p>
                      {toNumber(o.amountDue) > 0 && (
                        <p className="text-xs font-semibold text-rose-600">Due <Money amount={o.amountDue} /></p>
                      )}
                    </div>
                    <ChevronRight className="h-4 w-4 flex-shrink-0 text-slate-400" />
                  </button>
                ))
              ) : (
                <div className="p-6">
                  <EmptyState
                    icon={<ShoppingCart className="h-5 w-5" />}
                    title="No orders yet"
                    description="Once your quotation is accepted, your order will appear here."
                    action={<Button variant="accent" size="sm" onClick={() => navigate('quote')}>Request a Quote</Button>}
                  />
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Quick actions + notifications */}
        <section className="flex flex-col gap-4">
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <header className="border-b border-slate-100 px-5 py-4">
              <h2 className="flex items-center gap-2 text-base font-bold text-navy">
                <Sparkles className="h-4 w-4 text-gold" /> Quick Actions
              </h2>
            </header>
            <div className="grid grid-cols-2 gap-2 p-4">
              <QuickAction label="Request Quote" icon={<FileText className="h-4 w-4" />} onClick={() => navigate('quote')} />
              <QuickAction label="Track Order" icon={<Package className="h-4 w-4" />} onClick={() => navigate('track-order')} />
              <QuickAction label="My Quotations" icon={<FileText className="h-4 w-4" />} onClick={() => navigate('customer-quotations')} />
              <QuickAction label="Make Payment" icon={<CreditCard className="h-4 w-4" />} onClick={() => navigate('customer-payments')} />
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <header className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <h2 className="flex items-center gap-2 text-base font-bold text-navy">
                <Bell className="h-4 w-4 text-gold" /> Notifications
              </h2>
              <button onClick={() => navigate('customer-notifications')} className="flex items-center gap-1 text-xs font-bold text-gold hover:underline">
                All <ArrowRight className="h-3 w-3" />
              </button>
            </header>
            <div className="divide-y divide-slate-100">
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="px-5 py-3"><Skeleton className="h-8 w-full" /></div>
                ))
              ) : data && data.notifications.length > 0 ? (
                data.notifications.slice(0, 4).map((n) => (
                  <button
                    key={n.id}
                    onClick={() => navigate('customer-notifications')}
                    className="flex w-full items-start gap-3 px-5 py-3 text-left transition-colors hover:bg-slate-50"
                  >
                    <span className={`mt-1.5 h-2 w-2 flex-shrink-0 rounded-full ${n.isRead ? 'bg-slate-300' : 'bg-gold'}`} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-navy">{n.title}</p>
                      <p className="line-clamp-2 text-xs text-slate-500">{n.message}</p>
                    </div>
                  </button>
                ))
              ) : (
                <div className="p-6 text-center text-sm text-slate-400">No notifications yet.</div>
              )}
            </div>
          </div>
        </section>
      </div>

      {/* Recent Quote Requests */}
      <section className="mt-6">
        <SectionHeader
          title="Recent Quote Requests"
          icon={<FileText className="h-4 w-4 text-gold" />}
          onAll={() => navigate('quote')}
        />
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          {loading ? (
            <div className="divide-y divide-slate-100">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="px-5 py-4"><Skeleton className="h-12 w-full" /></div>
              ))}
            </div>
          ) : data && data.quoteRequests.length > 0 ? (
            <div className="divide-y divide-slate-100">
              {data.quoteRequests.map((q) => (
                <div key={q.id} className="flex items-center justify-between gap-3 px-5 py-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-navy">{q.requestNumber}</span>
                      <StatusBadge status={q.status} />
                    </div>
                    <p className="mt-0.5 truncate text-sm text-slate-600">{q.subject}</p>
                    <p className="text-xs text-slate-400">
                      {q.service?.name ?? 'Service'} · {formatDate(q.createdAt)}
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 flex-shrink-0 text-slate-400" />
                </div>
              ))}
            </div>
          ) : (
            <div className="p-6">
              <EmptyState
                icon={<FileText className="h-5 w-5" />}
                title="No quote requests yet"
                description="Tell us what you need printed or published and we'll prepare a quote for you."
                action={<NavButton to="quote" variant="accent" size="sm">Request a Quote</NavButton>}
              />
            </div>
          )}
        </div>
      </section>

      {/* Recent Payments */}
      <section className="mt-6">
        <SectionHeader
          title="Recent Payments"
          icon={<CreditCard className="h-4 w-4 text-gold" />}
          onAll={() => navigate('customer-payments')}
        />
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          {loading ? (
            <div className="divide-y divide-slate-100">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="px-5 py-4"><Skeleton className="h-12 w-full" /></div>
              ))}
            </div>
          ) : data && data.payments.length > 0 ? (
            <div className="divide-y divide-slate-100">
              {data.payments.map((p) => (
                <div key={p.id} className="flex items-center justify-between gap-3 px-5 py-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-navy">{p.paymentReference}</span>
                      <StatusBadge status={p.status} />
                    </div>
                    <p className="text-xs text-slate-500">
                      {p.order?.orderNumber ?? '—'} · {p.method} · {formatDate(p.createdAt)}
                    </p>
                  </div>
                  <p className="font-bold text-emerald-700"><Money amount={p.amount} /></p>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-6">
              <EmptyState
                icon={<CreditCard className="h-5 w-5" />}
                title="No payments recorded yet"
                description="When you make a payment for an order, it will appear here."
              />
            </div>
          )}
        </div>
      </section>
    </CustomerLayout>
  );
}

export default CustomerDashboard;

// ---------- Sub components ----------
function StatCard({
  label, value, icon, accent, onClick,
}: {
  label: string;
  value: React.ReactNode;
  icon: React.ReactNode;
  accent: 'rose' | 'emerald' | 'sky' | 'amber' | 'violet';
  onClick?: () => void;
}) {
  const accentBg: Record<string, string> = {
    rose: 'bg-rose-100 text-rose-700',
    emerald: 'bg-emerald-100 text-emerald-700',
    sky: 'bg-sky-100 text-sky-700',
    amber: 'bg-amber-100 text-amber-700',
    violet: 'bg-violet-100 text-violet-700',
  };
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag
      onClick={onClick}
      className={`flex flex-col gap-2 rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition-all ${onClick ? 'hover:-translate-y-0.5 hover:shadow-md' : ''}`}
    >
      <div className="flex items-center justify-between">
        <span className={`grid h-9 w-9 place-items-center rounded-xl ${accentBg[accent]}`}>{icon}</span>
      </div>
      <div>
        <p className="text-xl font-extrabold text-navy">{value}</p>
        <p className="mt-0.5 text-xs font-medium text-slate-500">{label}</p>
      </div>
    </Tag>
  );
}

function QuickAction({ label, icon, onClick }: { label: string; icon: React.ReactNode; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-4 text-center transition-all hover:-translate-y-0.5 hover:border-gold hover:bg-white"
    >
      <span className="grid h-9 w-9 place-items-center rounded-full bg-navy text-gold">{icon}</span>
      <span className="text-xs font-bold text-navy">{label}</span>
    </button>
  );
}

function SectionHeader({ title, icon, onAll }: { title: string; icon: React.ReactNode; onAll?: () => void }) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <h2 className="flex items-center gap-2 text-base font-bold text-navy">{icon} {title}</h2>
      {onAll && (
        <button onClick={onAll} className="flex items-center gap-1 text-xs font-bold text-gold hover:underline">
          View all <ArrowRight className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}
