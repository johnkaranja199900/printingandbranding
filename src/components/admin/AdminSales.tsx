'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { AdminLayout } from '@/components/shared/AdminLayout';
import { apiClient } from '@/lib/api-client';
import { useAppStore } from '@/stores/app-store';
import { Button, NavButton } from '@/components/shared/Button';
import { Money, StatusBadge, EmptyState, Eyebrow } from '@/components/shared/primitives';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { formatDate } from '@/lib/types';
import {
  TrendingUp, Wallet, CreditCard, Download, RefreshCw, Banknote, Smartphone, Building, Calendar,
  AlertCircle, Receipt,
} from 'lucide-react';

interface Payment {
  id: string; paymentReference: string; method: string; amount: string; status: string;
  paidAt?: string | null; createdAt: string; transactionReference?: string | null;
  notes?: string | null;
  order: { orderNumber: string } | null;
  customer: { firstName: string; lastName: string; businessName?: string | null; customerNumber: string } | null;
}

interface Reports {
  summary: { totalRevenue: number; totalOrders: number; outstanding: number };
  salesByMethod: { name: string; count: number; total: number }[];
}

const METHOD_META: Record<string, { label: string; color: string; icon: any }> = {
  CASH: { label: 'Cash', color: '#15803d', icon: Banknote },
  MPESA: { label: 'M-Pesa', color: '#15803d', icon: Smartphone },
  BANK: { label: 'Bank', color: '#0f172a', icon: Building },
  CARD: { label: 'Card', color: '#b8860b', icon: CreditCard },
  OTHER: { label: 'Other', color: '#6d28d9', icon: Wallet },
};

const METHOD_COLORS: Record<string, string> = {
  CASH: '#15803d',
  MPESA: '#b45309',
  BANK: '#0f172a',
  CARD: '#b8860b',
  OTHER: '#6d28d9',
};

export function AdminSales() {
  const { params, pushToast } = useAppStore();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [reports, setReports] = useState<Reports | null>(null);
  const [loading, setLoading] = useState(true);
  const [method, setMethod] = useState<string>('all');
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams({ pageSize: '50' });
      if (params.orderId) qs.set('orderId', params.orderId);
      const [payRes, rep] = await Promise.all([
        apiClient.get<{ data: Payment[] }>(`/payments?${qs.toString()}`) as any,
        apiClient.get<Reports>('/admin/reports') as any,
      ]);
      setPayments(payRes?.data ?? []);
      setReports(rep);
    } catch (e: any) {
      pushToast({ message: e.message ?? 'Failed to load sales', type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [params.orderId]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Filter client-side
  const filteredPayments = useMemo(() => {
    return payments.filter((p) => {
      if (method !== 'all' && p.method !== method) return false;
      if (fromDate) {
        const d = new Date(p.paidAt ?? p.createdAt);
        if (d < new Date(fromDate)) return false;
      }
      if (toDate) {
        const d = new Date(p.paidAt ?? p.createdAt);
        const end = new Date(toDate);
        end.setHours(23, 59, 59, 999);
        if (d > end) return false;
      }
      return true;
    });
  }, [payments, method, fromDate, toDate]);

  const totals = useMemo(() => {
    const total = filteredPayments.reduce((s, p) => s + Number(p.amount), 0);
    const byMethod: Record<string, number> = {};
    for (const p of filteredPayments) byMethod[p.method] = (byMethod[p.method] ?? 0) + Number(p.amount);
    const mpesa = byMethod.MPESA ?? 0;
    const cash = byMethod.CASH ?? 0;
    const today = filteredPayments
      .filter((p) => { const d = new Date(p.paidAt ?? p.createdAt); const t = new Date(); return d.toDateString() === t.toDateString(); })
      .reduce((s, p) => s + Number(p.amount), 0);
    const month = filteredPayments
      .filter((p) => { const d = new Date(p.paidAt ?? p.createdAt); const t = new Date(); return d.getMonth() === t.getMonth() && d.getFullYear() === t.getFullYear(); })
      .reduce((s, p) => s + Number(p.amount), 0);
    return { total, today, month, mpesa, cash, outstanding: reports?.summary?.outstanding ?? 0 };
  }, [filteredPayments, reports]);

  const maxMethod = Math.max(...Object.values(
    filteredPayments.reduce<Record<string, number>>((acc, p) => { acc[p.method] = (acc[p.method] ?? 0) + Number(p.amount); return acc; }, {})
  ), 1);

  const exportCsv = () => {
    const rows = [
      ['Reference', 'Order', 'Customer', 'Method', 'Amount', 'Status', 'Paid At', 'Transaction Ref'],
      ...filteredPayments.map((p) => [
        p.paymentReference,
        p.order?.orderNumber ?? '',
        p.customer ? (p.customer.businessName || `${p.customer.firstName} ${p.customer.lastName}`) : '',
        p.method,
        String(p.amount),
        p.status,
        p.paidAt ? new Date(p.paidAt).toISOString() : '',
        p.transactionReference ?? '',
      ]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sales-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    pushToast({ message: 'CSV exported.', type: 'success' });
  };

  const summaryCards = [
    { label: 'Total Sales', value: <Money amount={totals.total} />, icon: TrendingUp, tone: 'emerald' },
    { label: "Today's Sales", value: <Money amount={totals.today} />, icon: Calendar, tone: 'sky' },
    { label: 'This Month', value: <Money amount={totals.month} />, icon: Wallet, tone: 'navy' },
    { label: 'Outstanding', value: <Money amount={totals.outstanding} />, icon: AlertCircle, tone: 'rose' },
    { label: 'M-Pesa Share', value: <Money amount={totals.mpesa} />, icon: Smartphone, tone: 'amber' },
    { label: 'Cash Share', value: <Money amount={totals.cash} />, icon: Banknote, tone: 'emerald' },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Eyebrow>Finance</Eyebrow>
            <h1 className="mt-1 text-2xl font-extrabold text-navy sm:text-3xl">Sales</h1>
            <p className="mt-1 text-sm text-slate-500">Track all payments, revenue by method, and outstanding balances.</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="md" onClick={fetchAll} disabled={loading}>
              <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} /> Refresh
            </Button>
            <Button variant="accent" size="md" onClick={exportCsv} disabled={filteredPayments.length === 0}>
              <Download className="h-4 w-4" /> Export CSV
            </Button>
          </div>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {loading ? (
            Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)
          ) : (
            summaryCards.map((c, i) => (
              <Card key={i} className="rounded-2xl">
                <CardContent className="pt-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{c.label}</p>
                      <p className="mt-1 text-2xl font-extrabold text-navy">{c.value}</p>
                    </div>
                    <div className={cn(
                      'grid h-11 w-11 place-items-center rounded-xl',
                      c.tone === 'emerald' && 'bg-emerald-100 text-emerald-700',
                      c.tone === 'sky' && 'bg-sky-100 text-sky-700',
                      c.tone === 'navy' && 'bg-navy text-gold',
                      c.tone === 'rose' && 'bg-rose-100 text-rose-700',
                      c.tone === 'amber' && 'bg-amber-100 text-amber-700',
                    )}>
                      <c.icon className="h-5 w-5" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* By method bars */}
        <Card className="rounded-2xl">
          <CardHeader className="border-b pb-4">
            <CardTitle className="flex items-center gap-2 text-navy"><Wallet className="h-5 w-5 text-gold" /> Sales by Payment Method</CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="space-y-3">
              {Object.entries(METHOD_META).map(([key, meta]) => {
                const value = filteredPayments.filter((p) => p.method === key).reduce((s, p) => s + Number(p.amount), 0);
                const pct = maxMethod > 0 ? Math.round((value / maxMethod) * 100) : 0;
                const Icon = meta.icon;
                return (
                  <div key={key} className="flex items-center gap-3">
                    <div className="flex w-32 items-center gap-2 text-sm font-semibold text-slate-700">
                      <Icon className="h-4 w-4" style={{ color: METHOD_COLORS[key] }} /> {meta.label}
                    </div>
                    <div className="h-3 flex-1 overflow-hidden rounded-full bg-slate-100">
                      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: METHOD_COLORS[key] }} />
                    </div>
                    <div className="w-28 text-right font-bold text-navy">KES {Math.round(value).toLocaleString()}</div>
                  </div>
                );
              })}
              {filteredPayments.length === 0 && <p className="text-center text-sm text-slate-400 py-6">No payments in current filter.</p>}
            </div>
          </CardContent>
        </Card>

        {/* Filters */}
        <Card className="rounded-2xl">
          <CardContent className="pt-5">
            <div className="grid gap-3 md:grid-cols-[1fr_1fr_1fr]">
              <div>
                <Label className="mb-1.5 block text-xs uppercase tracking-wide text-slate-500">Method</Label>
                <Select value={method} onValueChange={setMethod}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="All methods" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All methods</SelectItem>
                    {Object.entries(METHOD_META).map(([k, m]) => <SelectItem key={k} value={k}>{m.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="mb-1.5 block text-xs uppercase tracking-wide text-slate-500">From date</Label>
                <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
              </div>
              <div>
                <Label className="mb-1.5 block text-xs uppercase tracking-wide text-slate-500">To date</Label>
                <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between">
              <p className="text-xs text-slate-500">{filteredPayments.length} payment{filteredPayments.length !== 1 ? 's' : ''} matching</p>
              {(method !== 'all' || fromDate || toDate) && (
                <Button variant="ghost" size="sm" onClick={() => { setMethod('all'); setFromDate(''); setToDate(''); }}>Clear filters</Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Payments table */}
        <Card className="hidden overflow-hidden rounded-2xl md:block">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50 hover:bg-slate-50">
                <TableHead className="px-4 py-3 text-xs uppercase text-slate-500">Reference</TableHead>
                <TableHead className="px-4 py-3 text-xs uppercase text-slate-500">Order</TableHead>
                <TableHead className="px-4 py-3 text-xs uppercase text-slate-500">Customer</TableHead>
                <TableHead className="px-4 py-3 text-xs uppercase text-slate-500">Method</TableHead>
                <TableHead className="px-4 py-3 text-xs uppercase text-slate-500">Amount</TableHead>
                <TableHead className="px-4 py-3 text-xs uppercase text-slate-500">Status</TableHead>
                <TableHead className="px-4 py-3 text-xs uppercase text-slate-500">Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <TableRow key={i}>{Array.from({ length: 7 }).map((_, j) => <TableCell key={j}><Skeleton className="h-5 w-full" /></TableCell>)}</TableRow>
                ))
              ) : filteredPayments.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="py-12"><EmptyState icon={<Receipt className="h-5 w-5" />} title="No payments found" description="Try adjusting your filters." /></TableCell></TableRow>
              ) : (
                filteredPayments.map((p) => {
                  const meta = METHOD_META[p.method] ?? METHOD_META.OTHER;
                  const Icon = meta.icon;
                  return (
                    <TableRow key={p.id}>
                      <TableCell className="px-4 py-3 font-bold text-navy">{p.paymentReference}</TableCell>
                      <TableCell className="px-4 py-3 text-sm text-slate-600">{p.order?.orderNumber ?? '—'}</TableCell>
                      <TableCell className="px-4 py-3">
                        <div className="font-semibold text-navy">{p.customer?.businessName || (p.customer ? `${p.customer.firstName} ${p.customer.lastName}` : '—')}</div>
                        <div className="text-xs text-slate-400">{p.customer?.customerNumber ?? ''}</div>
                      </TableCell>
                      <TableCell className="px-4 py-3">
                        <span className="inline-flex items-center gap-1.5 text-sm font-semibold" style={{ color: METHOD_COLORS[p.method] }}>
                          <Icon className="h-3.5 w-3.5" /> {meta.label}
                        </span>
                      </TableCell>
                      <TableCell className="px-4 py-3 font-bold text-emerald-700"><Money amount={p.amount} /></TableCell>
                      <TableCell className="px-4 py-3"><StatusBadge status={p.status} /></TableCell>
                      <TableCell className="px-4 py-3 text-sm text-slate-500">{p.paidAt ? formatDate(p.paidAt, true) : formatDate(p.createdAt, true)}</TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </Card>

        {/* Mobile cards */}
        <div className="space-y-3 md:hidden">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-2xl" />)
          ) : filteredPayments.length === 0 ? (
            <EmptyState icon={<Receipt className="h-5 w-5" />} title="No payments found" description="Try adjusting your filters." />
          ) : (
            filteredPayments.map((p) => {
              const meta = METHOD_META[p.method] ?? METHOD_META.OTHER;
              const Icon = meta.icon;
              return (
                <Card key={p.id} className="rounded-2xl">
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-bold text-navy">{p.paymentReference}</p>
                        <p className="text-xs text-slate-500">{p.order?.orderNumber ?? '—'}</p>
                      </div>
                      <StatusBadge status={p.status} />
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      <span className="inline-flex items-center gap-1.5 text-sm font-semibold" style={{ color: METHOD_COLORS[p.method] }}>
                        <Icon className="h-3.5 w-3.5" /> {meta.label}
                      </span>
                      <span className="font-bold text-emerald-700"><Money amount={p.amount} /></span>
                    </div>
                    <p className="mt-2 text-xs text-slate-400">{p.paidAt ? formatDate(p.paidAt, true) : formatDate(p.createdAt, true)}</p>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </div>
    </AdminLayout>
  );
}

export default AdminSales;
