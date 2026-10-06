'use client';

import { useEffect, useState, useMemo } from 'react';
import { AdminLayout } from '@/components/shared/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/shared/Button';
import { Money, EmptyState } from '@/components/shared/primitives';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { useAppStore } from '@/stores/app-store';
import { apiClient } from '@/lib/api-client';
import { cn } from '@/lib/utils';
import { formatDate, toNumber } from '@/lib/types';
import { Users, Search, User, Building2, ArrowUpRight, TrendingUp, AlertCircle } from 'lucide-react';

interface CustomerOrder {
  id: string;
  orderNumber: string;
  total: string | number;
  amountPaid: string | number;
  amountDue: string | number;
  status: string;
  paymentStatus: string;
  createdAt: string;
  customer?: {
    id: string;
    firstName: string;
    lastName: string;
    businessName?: string | null;
    customerNumber: string;
    customerType?: string;
  } | null;
}

interface QuoteRequestItem {
  id: string;
  requestNumber: string;
  createdAt: string;
  customerId: string;
  customer?: {
    id: string;
    firstName: string;
    lastName: string;
    businessName?: string | null;
    customerNumber: string;
  } | null;
}

interface PaymentItem {
  id: string;
  amount: string | number;
  method: string;
  createdAt: string;
  customerId: string;
}

interface DerivedCustomer {
  id: string;
  name: string;
  customerNumber: string;
  customerType: string;
  businessName?: string | null;
  orderCount: number;
  totalSpent: number;
  outstanding: number;
  lastOrderAt: string | null;
  recentOrders: CustomerOrder[];
  recentPayments: PaymentItem[];
  quoteCount: number;
}

export default function AdminCustomers() {
  const { pushToast } = useAppStore();
  const [customers, setCustomers] = useState<DerivedCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [active, setActive] = useState<DerivedCustomer | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    Promise.all([
      apiClient.get<{ data: CustomerOrder[] }>('/orders?pageSize=50'),
      apiClient.get<{ data: QuoteRequestItem[] }>('/quote-requests?pageSize=50'),
      apiClient.get<{ data: PaymentItem[] }>('/payments?pageSize=50'),
    ]).then(([ordersRes, quoteRes, paymentsRes]: any) => {
      if (!active) return;
      const orders: CustomerOrder[] = ordersRes?.data ?? [];
      const quotes: QuoteRequestItem[] = quoteRes?.data ?? [];
      const payments: PaymentItem[] = paymentsRes?.data ?? [];

      const map = new Map<string, DerivedCustomer>();

      for (const o of orders) {
        if (!o.customer) continue;
        const c = o.customer;
        if (!map.has(c.id)) {
          map.set(c.id, {
            id: c.id,
            name: c.businessName || `${c.firstName} ${c.lastName}`.trim(),
            customerNumber: c.customerNumber,
            customerType: c.customerType ?? 'INDIVIDUAL',
            businessName: c.businessName ?? null,
            orderCount: 0,
            totalSpent: 0,
            outstanding: 0,
            lastOrderAt: null,
            recentOrders: [],
            recentPayments: [],
            quoteCount: 0,
          });
        }
        const dc = map.get(c.id)!;
        dc.orderCount += 1;
        dc.totalSpent += toNumber(o.amountPaid);
        dc.outstanding += toNumber(o.amountDue);
        dc.recentOrders.push(o);
        if (!dc.lastOrderAt || new Date(o.createdAt) > new Date(dc.lastOrderAt)) {
          dc.lastOrderAt = o.createdAt;
        }
      }

      // Add customers that only have quote requests (no orders yet)
      for (const q of quotes) {
        if (!q.customer) continue;
        const c = q.customer;
        if (!map.has(c.id)) {
          map.set(c.id, {
            id: c.id,
            name: c.businessName || `${c.firstName} ${c.lastName}`.trim(),
            customerNumber: c.customerNumber,
            customerType: 'INDIVIDUAL',
            businessName: c.businessName ?? null,
            orderCount: 0,
            totalSpent: 0,
            outstanding: 0,
            lastOrderAt: null,
            recentOrders: [],
            recentPayments: [],
            quoteCount: 0,
          });
        }
        map.get(c.id)!.quoteCount += 1;
      }

      // Attach payments
      for (const p of payments) {
        const dc = map.get(p.customerId);
        if (dc) dc.recentPayments.push(p);
      }

      // Sort recent orders by date desc, keep top 5
      const list = Array.from(map.values()).map(dc => ({
        ...dc,
        recentOrders: dc.recentOrders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 5),
        recentPayments: dc.recentPayments.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 5),
      })).sort((a, b) => b.totalSpent - a.totalSpent);

      setCustomers(list);
    }).catch((e: any) => {
      pushToast({ message: e?.message ?? 'Failed to load customers.', type: 'error' });
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return customers;
    const q = search.toLowerCase();
    return customers.filter(c =>
      c.name.toLowerCase().includes(q) ||
      c.customerNumber.toLowerCase().includes(q) ||
      (c.businessName ?? '').toLowerCase().includes(q),
    );
  }, [customers, search]);

  const totalCustomers = customers.length;
  const totalOutstanding = customers.reduce((s, c) => s + c.outstanding, 0);
  const totalRevenue = customers.reduce((s, c) => s + c.totalSpent, 0);
  const withOutstanding = customers.filter(c => c.outstanding > 0).length;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-xs font-bold uppercase tracking-[0.18em] text-gold">Admin · Customers</div>
            <h1 className="mt-1 text-2xl font-extrabold text-navy sm:text-3xl">Customers</h1>
            <p className="mt-1 text-sm text-slate-500">A consolidated view of every customer derived from orders, payments and quote requests.</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatCard icon={<Users className="h-5 w-5" />} label="Total customers" value={totalCustomers.toString()} accent="navy" />
          <StatCard icon={<TrendingUp className="h-5 w-5" />} label="Lifetime revenue" value={`KES ${totalRevenue.toLocaleString()}`} accent="emerald" />
          <StatCard icon={<AlertCircle className="h-5 w-5" />} label="Outstanding" value={`KES ${totalOutstanding.toLocaleString()}`} accent="rose" />
          <StatCard icon={<User className="h-5 w-5" />} label="With outstanding" value={withOutstanding.toString()} accent="gold" />
        </div>

        <Card className="border-slate-200">
          <CardHeader className="border-b border-slate-100">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle className="text-navy">Customer List ({filtered.length})</CardTitle>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  placeholder="Search name or number..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 sm:w-80"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="space-y-2 p-4">
                {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
              </div>
            ) : filtered.length === 0 ? (
              <div className="p-6">
                <EmptyState icon={<Users className="h-5 w-5" />} title="No customers found" description="Customers will appear here once they place orders or submit quote requests." />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead>Customer</TableHead>
                    <TableHead className="hidden md:table-cell">Number</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Orders</TableHead>
                    <TableHead className="text-right">Spent</TableHead>
                    <TableHead className="text-right">Outstanding</TableHead>
                    <TableHead className="hidden lg:table-cell">Last Order</TableHead>
                    <TableHead className="w-10 text-right"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(c => (
                    <TableRow key={c.id} className="cursor-pointer" onClick={() => setActive(c)}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className={cn('grid h-9 w-9 flex-shrink-0 place-items-center rounded-full text-xs font-bold', c.businessName ? 'bg-navy text-white' : 'bg-gold text-[#1a1508]')}>
                            {c.businessName ? <Building2 className="h-4 w-4" /> : c.name?.[0]?.toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-navy truncate">{c.name}</p>
                            <p className="text-xs text-slate-500 md:hidden">{c.customerNumber}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell font-mono text-xs text-slate-600">{c.customerNumber}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {c.customerType === 'BUSINESS' ? <><Building2 className="mr-1 h-3 w-3" /> Business</> : <><User className="mr-1 h-3 w-3" /> Individual</>}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-semibold text-navy">{c.orderCount}</TableCell>
                      <TableCell className="text-right"><Money amount={c.totalSpent} /></TableCell>
                      <TableCell className={cn('text-right font-bold', c.outstanding > 0 ? 'text-rose-600' : 'text-slate-400')}>
                        <Money amount={c.outstanding} />
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-xs text-slate-500">
                        {c.lastOrderAt ? formatDate(c.lastOrderAt) : '—'}
                      </TableCell>
                      <TableCell className="text-right">
                        <ArrowUpRight className="ml-auto h-4 w-4 text-slate-400" />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Customer detail dialog */}
      <Dialog open={!!active} onOpenChange={(o) => !o && setActive(null)}>
        <DialogContent className="sm:max-w-2xl">
          {active && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-navy">
                  <div className={cn('grid h-9 w-9 place-items-center rounded-full text-xs font-bold', active.businessName ? 'bg-navy text-white' : 'bg-gold text-[#1a1508]')}>
                    {active.businessName ? <Building2 className="h-4 w-4" /> : active.name?.[0]?.toUpperCase()}
                  </div>
                  {active.name}
                </DialogTitle>
                <DialogDescription>
                  <span className="font-mono">{active.customerNumber}</span> · {active.customerType === 'BUSINESS' ? 'Business customer' : 'Individual customer'}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                {/* Stats */}
                <div className="grid grid-cols-3 gap-3">
                  <MiniStat label="Orders" value={active.orderCount.toString()} />
                  <MiniStat label="Lifetime" value={`KES ${active.totalSpent.toLocaleString()}`} />
                  <MiniStat label="Outstanding" value={`KES ${active.outstanding.toLocaleString()}`} highlight={active.outstanding > 0} />
                </div>

                {/* Recent orders */}
                <div>
                  <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">Recent orders</p>
                  {active.recentOrders.length === 0 ? (
                    <p className="rounded-lg border border-dashed border-slate-200 p-3 text-center text-sm text-slate-400">No orders yet.</p>
                  ) : (
                    <ul className="space-y-2">
                      {active.recentOrders.map(o => (
                        <li key={o.id} className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 p-3">
                          <div>
                            <p className="font-mono text-xs font-bold text-navy">{o.orderNumber}</p>
                            <p className="text-xs text-slate-500">{formatDate(o.createdAt)}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-navy"><Money amount={o.total} /></p>
                            <p className="text-xs text-slate-500">{(o.status ?? '').replace(/_/g, ' ').toLowerCase()}</p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {/* Recent payments */}
                {active.recentPayments.length > 0 && (
                  <div>
                    <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">Recent payments</p>
                    <ul className="space-y-2">
                      {active.recentPayments.slice(0, 3).map(p => (
                        <li key={p.id} className="flex items-center justify-between rounded-lg border border-emerald-100 bg-emerald-50/40 p-3">
                          <div>
                            <p className="text-xs font-bold text-emerald-700">{p.method}</p>
                            <p className="text-xs text-slate-500">{formatDate(p.createdAt)}</p>
                          </div>
                          <p className="font-bold text-emerald-700"><Money amount={p.amount} /></p>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
              <div className="rounded-lg bg-slate-50 p-3 text-center text-xs text-slate-500">
                Full customer profile & edit view — coming soon.
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}

function StatCard({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: string; accent: 'navy' | 'gold' | 'emerald' | 'rose' }) {
  const styles: Record<string, string> = {
    navy: 'bg-navy text-white',
    gold: 'bg-gold text-[#1a1508]',
    emerald: 'bg-emerald-600 text-white',
    rose: 'bg-rose-600 text-white',
  };
  return (
    <Card className="border-slate-200 p-4">
      <div className="flex items-center gap-3">
        <div className={cn('grid h-10 w-10 place-items-center rounded-xl', styles[accent])}>{icon}</div>
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
          <p className="truncate text-xl font-extrabold text-navy">{value}</p>
        </div>
      </div>
    </Card>
  );
}

function MiniStat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={cn('rounded-xl border p-3 text-center', highlight ? 'border-rose-200 bg-rose-50' : 'border-slate-200 bg-slate-50')}>
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className={cn('text-sm font-extrabold', highlight ? 'text-rose-600' : 'text-navy')}>{value}</p>
    </div>
  );
}
