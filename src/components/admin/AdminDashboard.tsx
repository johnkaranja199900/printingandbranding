'use client';

import { useEffect, useState } from 'react';
import { AdminLayout } from '@/components/shared/AdminLayout';
import { apiClient } from '@/lib/api-client';
import { useAppStore } from '@/stores/app-store';
import { NavButton } from '@/components/shared/Button';
import { Money, EmptyState, Eyebrow } from '@/components/shared/primitives';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { timeAgo, formatDate } from '@/lib/types';
import {
  ShoppingCart, FileText, TrendingUp, AlertTriangle, Boxes, Clock,
  ArrowRight, Activity, Users, BarChart3, Wallet, CheckCircle2,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, CartesianGrid,
} from 'recharts';

interface DashboardData {
  kpis: {
    totalOrders: number; pendingQuotes: number; activeOrders: number; inProduction: number;
    completedOrders: number; unpaidOrders: number; totalSales: number; todaySales: number;
    monthSales: number; outstandingAmount: number; customersCount: number; booksCount: number;
    authorsCount: number; staffCount: number; inventoryItemsCount: number; unreadNotifications: number;
  };
  charts: {
    monthlyTrend: { month: string; total: number }[];
    byMethod: { name: string; value: number }[];
    ordersByStatus: { name: string; value: number }[];
  };
  lowStock: { name: string; sku: string; quantity: number; reorderLevel: number; unit: string }[];
  recentActivity: { action: string; entityType: string; entityId: string; actor: { name: string }; createdAt: string; newValuesJson?: string }[];
  staff: { id: string; name: string; role: string; status: string }[];
}

const PIE_COLORS = ['#0f172a', '#b8860b', '#15803d', '#b45309', '#6d28d9', '#0369a1'];

export function AdminDashboard() {
  const { user, pushToast, navigate } = useAppStore();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const d = await apiClient.get<DashboardData>('/admin/dashboard');
        if (!cancelled) setData(d as any);
      } catch (e: any) {
        if (!cancelled) pushToast({ message: e.message ?? 'Failed to load dashboard', type: 'error' });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  if (loading || !data) return <AdminLayout><DashboardSkeleton /></AdminLayout>;

  const { kpis, charts, lowStock, recentActivity, staff } = data;
  const methodTotal = charts.byMethod.reduce((s, m) => s + Number(m.value || 0), 0) || 1;

  const kpiCards = [
    { label: 'Total Orders', value: kpis.totalOrders, icon: ShoppingCart, tone: 'navy', sub: `${kpis.completedOrders} completed` },
    { label: 'Active Orders', value: kpis.activeOrders, icon: Clock, tone: 'sky', sub: 'Awaiting next step' },
    { label: 'In Production', value: kpis.inProduction, icon: BarChart3, tone: 'amber', sub: 'Production + QC' },
    { label: 'Pending Quotes', value: kpis.pendingQuotes, icon: FileText, tone: 'violet', sub: 'Awaiting response' },
    { label: "Today's Sales", value: <Money amount={kpis.todaySales} />, icon: TrendingUp, tone: 'emerald', sub: 'Paid today' },
    { label: 'Month Sales', value: <Money amount={kpis.monthSales} />, icon: Wallet, tone: 'emerald', sub: 'Current month' },
    { label: 'Outstanding', value: <Money amount={kpis.outstandingAmount} />, icon: AlertTriangle, tone: 'rose', sub: 'Unpaid balance' },
    { label: 'Unpaid Orders', value: kpis.unpaidOrders, icon: AlertTriangle, tone: 'rose', sub: 'Need follow-up' },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Hero */}
        <div className="rounded-2xl bg-gradient-to-br from-navy via-navy-soft to-navy p-6 text-white shadow-xl sm:p-8">
          <Eyebrow className="text-gold">Admin Console</Eyebrow>
          <h1 className="mt-2 text-2xl font-extrabold sm:text-3xl">Welcome back, {user?.name?.split(' ')[0] ?? 'Admin'} 👋</h1>
          <p className="mt-1 max-w-2xl text-sm text-white/70 sm:text-base">
            Here's your operational overview for {new Date().toLocaleDateString('en-KE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <NavButton to="admin-orders" variant="accent" size="sm">View Orders <ArrowRight className="h-3.5 w-3.5" /></NavButton>
            <NavButton to="admin-quotations" variant="outline" size="sm">Quote Requests</NavButton>
            <NavButton to="admin-inventory" variant="outline" size="sm">Inventory</NavButton>
          </div>
        </div>

        {/* KPI Grid */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {kpiCards.map((k, i) => (
            <KpiCard key={i} {...k} />
          ))}
        </div>

        {/* Charts row */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2 rounded-2xl">
            <CardHeader className="border-b pb-4">
              <CardTitle className="flex items-center gap-2 text-navy">
                <TrendingUp className="h-5 w-5 text-gold" /> Sales Overview
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={charts.monthlyTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                    <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v)} />
                    <Tooltip
                      formatter={(value: number) => [`KES ${Number(value).toLocaleString()}`, 'Sales']}
                      contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }}
                    />
                    <Bar dataKey="total" fill="#b8860b" radius={[6, 6, 0, 0]} maxBarSize={48} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl">
            <CardHeader className="border-b pb-4">
              <CardTitle className="flex items-center gap-2 text-navy">
                <Wallet className="h-5 w-5 text-gold" /> Payment Methods
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              {charts.byMethod.length === 0 ? (
                <EmptyState title="No payments yet" description="Payment breakdown will appear here." />
              ) : (
                <>
                  <div className="mb-3 h-40 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={charts.byMethod} dataKey="value" nameKey="name" innerRadius={36} outerRadius={68} paddingAngle={2}>
                          {charts.byMethod.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                        </Pie>
                        <Tooltip formatter={(value: number, name: string) => [`KES ${Number(value).toLocaleString()}`, name]} contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="space-y-1.5">
                    {charts.byMethod.map((m, i) => {
                      const pct = Math.round((Number(m.value) / methodTotal) * 100);
                      return (
                        <div key={m.name} className="flex items-center justify-between gap-2 text-sm">
                          <span className="flex items-center gap-2 text-slate-600">
                            <span className="h-2.5 w-2.5 rounded-full" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                            {m.name}
                          </span>
                          <span className="font-bold text-navy">{pct}%</span>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Orders by status + low stock + activity */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Card className="rounded-2xl">
            <CardHeader className="border-b pb-4">
              <CardTitle className="flex items-center gap-2 text-navy">
                <BarChart3 className="h-5 w-5 text-gold" /> Orders by Status
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              {charts.ordersByStatus.length === 0 ? (
                <EmptyState title="No orders yet" description="Orders will appear once created." />
              ) : (
                <div className="space-y-2.5">
                  {charts.ordersByStatus.sort((a, b) => b.value - a.value).map((s, i) => {
                    const max = Math.max(...charts.ordersByStatus.map((x) => x.value));
                    const pct = Math.round((s.value / max) * 100);
                    return (
                      <div key={s.name}>
                        <div className="mb-1 flex justify-between text-xs">
                          <span className="font-semibold text-slate-600">{(s.name ?? '').replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase())}</span>
                          <span className="font-bold text-navy">{s.value}</span>
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                          <div className="h-full rounded-full" style={{ width: `${pct}%`, background: PIE_COLORS[i % PIE_COLORS.length] }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="rounded-2xl">
            <CardHeader className="border-b pb-4">
              <CardTitle className="flex items-center gap-2 text-navy">
                <AlertTriangle className="h-5 w-5 text-amber-500" /> Low Stock Alerts
                {lowStock.length > 0 && <span className="ml-auto rounded-full bg-rose-100 px-2 py-0.5 text-xs font-bold text-rose-700">{lowStock.length}</span>}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              {lowStock.length === 0 ? (
                <EmptyState icon={<CheckCircle2 className="h-5 w-5 text-emerald-500" />} title="All stocked up" description="No items need reordering." />
              ) : (
                <div className="space-y-2">
                  {lowStock.slice(0, 5).map((item) => (
                    <div key={item.sku} className="flex items-center justify-between gap-2 rounded-xl border border-amber-200 bg-amber-50/50 p-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-navy">{item.name}</p>
                        <p className="text-xs text-slate-500">{item.sku} · {item.quantity} {item.unit} left (reorder @ {item.reorderLevel})</p>
                      </div>
                      <NavButton to="admin-inventory" variant="accent" size="sm">Adjust</NavButton>
                    </div>
                  ))}
                  {lowStock.length > 5 && (
                    <NavButton to="admin-inventory" variant="ghost" size="sm" className="w-full">
                      View all {lowStock.length} low-stock items
                    </NavButton>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="rounded-2xl">
            <CardHeader className="border-b pb-4">
              <CardTitle className="flex items-center gap-2 text-navy">
                <Activity className="h-5 w-5 text-gold" /> Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              {recentActivity.length === 0 ? (
                <EmptyState title="No activity yet" />
              ) : (
                <ol className="space-y-3">
                  {recentActivity.slice(0, 7).map((a, i) => (
                    <li key={i} className="flex gap-3">
                      <div className="mt-1 h-2 w-2 flex-none rounded-full bg-gold" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-slate-700">
                          <span className="font-bold text-navy">{a.actor?.name ?? 'System'}</span>{' '}
                          <span className="text-slate-500">{(a.action ?? '').replace(/[._]/g, ' ')}</span>
                        </p>
                        <p className="text-xs text-slate-400">{timeAgo(a.createdAt)} · {a.entityType}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Staff summary */}
        <Card className="rounded-2xl">
          <CardHeader className="border-b pb-4">
            <CardTitle className="flex items-center gap-2 text-navy">
              <Users className="h-5 w-5 text-gold" /> Staff Summary
              <span className="ml-auto text-sm font-normal text-slate-500">{staff.length} total · {staff.filter(s => s.status === 'ACTIVE').length} active</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            {staff.length === 0 ? (
              <EmptyState title="No staff yet" description="Add staff to manage operations." />
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {staff.slice(0, 8).map((s) => (
                  <div key={s.id} className="flex items-center gap-3 rounded-xl border border-slate-200 p-3">
                    <div className="grid h-10 w-10 flex-none place-items-center rounded-full bg-navy-soft text-sm font-bold text-gold">
                      {s.name?.[0] ?? '?'}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-navy">{s.name}</p>
                      <p className="truncate text-xs text-slate-500">{(s.role ?? '').replace(/_/g, ' ').toLowerCase()}</p>
                    </div>
                    <span className={cn(
                      'h-2.5 w-2.5 flex-none rounded-full',
                      s.status === 'ACTIVE' ? 'bg-emerald-500' : s.status === 'SUSPENDED' ? 'bg-rose-500' : 'bg-slate-400',
                    )} />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}

function KpiCard({ label, value, icon: Icon, tone, sub }: { label: string; value: React.ReactNode; icon: any; tone: string; sub?: string }) {
  const toneMap: Record<string, string> = {
    navy: 'bg-navy text-gold',
    sky: 'bg-sky-100 text-sky-700',
    amber: 'bg-amber-100 text-amber-700',
    violet: 'bg-violet-100 text-violet-700',
    emerald: 'bg-emerald-100 text-emerald-700',
    rose: 'bg-rose-100 text-rose-700',
  };
  return (
    <Card className="rounded-2xl transition-shadow hover:shadow-md">
      <CardContent className="pt-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</p>
            <p className="mt-1 text-2xl font-extrabold text-navy">{value}</p>
            {sub && <p className="mt-1 text-xs text-slate-400">{sub}</p>}
          </div>
          <div className={cn('grid h-11 w-11 flex-none place-items-center rounded-xl', toneMap[tone])}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-32 rounded-2xl" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Skeleton className="h-80 rounded-2xl lg:col-span-2" />
        <Skeleton className="h-80 rounded-2xl" />
      </div>
    </div>
  );
}

export default AdminDashboard;
