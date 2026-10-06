'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { CustomerLayout } from '@/components/shared/CustomerLayout';
import { Button } from '@/components/shared/Button';
import { StatusBadge, Money, EmptyState, Eyebrow } from '@/components/shared/primitives';
import { apiClient } from '@/lib/api-client';
import { useAppStore } from '@/stores/app-store';
import { formatDate, toNumber } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Wallet, TrendingUp, CalendarClock, CreditCard, Receipt,
} from 'lucide-react';

// ---------- API types ----------
interface Payment {
  id: string;
  paymentReference: string;
  method: string;
  amount: string | number;
  status: string;
  transactionReference: string | null;
  paidAt: string | null;
  createdAt: string;
  order?: { orderNumber: string } | null;
}
interface Order { id: string; amountDue: string | number; status: string; }
interface ListResponse<T> { data: T[]; meta: { total: number; page: number; pageSize: number; totalPages: number } }

type MethodFilter = 'ALL' | 'MPESA' | 'CASH' | 'BANK' | 'CARD';

// ---------- Component ----------
export function CustomerPayments() {
  const { navigate, pushToast } = useAppStore();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [method, setMethod] = useState<MethodFilter>('ALL');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [payRes, ordRes] = await Promise.all([
        apiClient.get<ListResponse<Payment>>('/payments?pageSize=50'),
        apiClient.get<ListResponse<Order>>('/orders?pageSize=50'),
      ]);
      setPayments(payRes.data ?? []);
      setOrders(ordRes.data ?? []);
    } catch (e: any) {
      pushToast({ message: e.message ?? 'Failed to load payments.', type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [pushToast]);

  useEffect(() => { load(); }, [load]);

  const totalPaid = useMemo(
    () => payments.filter((p) => p.status === 'SUCCESSFUL').reduce((s, p) => s + toNumber(p.amount), 0),
    [payments],
  );

  const thisMonth = useMemo(() => {
    const now = new Date();
    return payments
      .filter((p) => p.status === 'SUCCESSFUL')
      .filter((p) => {
        const d = p.paidAt ? new Date(p.paidAt) : new Date(p.createdAt);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      })
      .reduce((s, p) => s + toNumber(p.amount), 0);
  }, [payments]);

  const outstanding = useMemo(
    () => orders.reduce((s, o) => s + toNumber(o.amountDue), 0),
    [orders],
  );

  const filtered = useMemo(() => {
    if (method === 'ALL') return payments;
    return payments.filter((p) => p.method === method);
  }, [payments, method]);

  return (
    <CustomerLayout>
      <div className="mb-6 flex flex-col gap-1">
        <Eyebrow>Customer Portal</Eyebrow>
        <h1 className="text-2xl font-extrabold text-navy sm:text-3xl">Payments</h1>
        <p className="text-sm text-slate-500">Your payment history and outstanding balance.</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {loading ? (
          <>
            <Skeleton className="h-24 rounded-2xl" />
            <Skeleton className="h-24 rounded-2xl" />
            <Skeleton className="h-24 rounded-2xl" />
          </>
        ) : (
          <>
            <SummaryCard label="Total Paid" value={<Money amount={totalPaid} />} icon={<TrendingUp className="h-5 w-5" />} accent="emerald" />
            <SummaryCard label="This Month" value={<Money amount={thisMonth} />} icon={<CalendarClock className="h-5 w-5" />} accent="sky" />
            <SummaryCard label="Outstanding" value={<Money amount={outstanding} />} icon={<Wallet className="h-5 w-5" />} accent={outstanding > 0 ? 'rose' : 'emerald'} />
          </>
        )}
      </div>

      {/* Filter */}
      <div className="mt-6 mb-3 flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-base font-bold text-navy">
          <Receipt className="h-4 w-4 text-gold" /> Payment History
        </h2>
        <Select value={method} onValueChange={(v) => setMethod(v as MethodFilter)}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="All methods" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All methods</SelectItem>
            <SelectItem value="MPESA">M-Pesa</SelectItem>
            <SelectItem value="CASH">Cash</SelectItem>
            <SelectItem value="BANK">Bank</SelectItem>
            <SelectItem value="CARD">Card</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {loading ? (
        <Skeleton className="h-64 rounded-2xl" />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<CreditCard className="h-5 w-5" />}
          title="No payments yet"
          description="When you make a payment for an order, it will be listed here."
          action={<Button variant="accent" size="sm" onClick={() => navigate('customer-orders')}>View Orders</Button>}
        />
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          {/* Desktop table */}
          <div className="hidden sm:block">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead className="pl-5">Reference</TableHead>
                  <TableHead>Order</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="pr-5 text-right">Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="pl-5 font-bold text-navy">{p.paymentReference}</TableCell>
                    <TableCell className="text-slate-600">{p.order?.orderNumber ?? '—'}</TableCell>
                    <TableCell><MethodBadge method={p.method} /></TableCell>
                    <TableCell className="font-bold text-emerald-700"><Money amount={p.amount} /></TableCell>
                    <TableCell><StatusBadge status={p.status} /></TableCell>
                    <TableCell className="pr-5 text-right text-xs text-slate-500">
                      {formatDate(p.paidAt ?? p.createdAt, true)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile cards */}
          <div className="divide-y divide-slate-100 sm:hidden">
            {filtered.map((p) => (
              <div key={p.id} className="p-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-navy">{p.paymentReference}</span>
                  <StatusBadge status={p.status} />
                </div>
                <div className="mt-1 flex items-center justify-between">
                  <span className="text-xs text-slate-500">{p.order?.orderNumber ?? '—'} · <MethodBadge method={p.method} /></span>
                  <span className="font-bold text-emerald-700"><Money amount={p.amount} /></span>
                </div>
                <p className="mt-1 text-[0.7rem] text-slate-400">{formatDate(p.paidAt ?? p.createdAt, true)}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </CustomerLayout>
  );
}

export default CustomerPayments;

// ---------- Sub components ----------
function SummaryCard({
  label, value, icon, accent,
}: {
  label: string;
  value: React.ReactNode;
  icon: React.ReactNode;
  accent: 'rose' | 'emerald' | 'sky';
}) {
  const accentBg: Record<string, string> = {
    rose: 'bg-rose-100 text-rose-700',
    emerald: 'bg-emerald-100 text-emerald-700',
    sky: 'bg-sky-100 text-sky-700',
  };
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <span className={`grid h-12 w-12 place-items-center rounded-xl ${accentBg[accent]}`}>{icon}</span>
      <div>
        <p className="text-xl font-extrabold text-navy">{value}</p>
        <p className="text-xs font-medium text-slate-500">{label}</p>
      </div>
    </div>
  );
}

function MethodBadge({ method }: { method: string }) {
  const styles: Record<string, string> = {
    MPESA: 'bg-emerald-100 text-emerald-800',
    CASH: 'bg-amber-100 text-amber-800',
    BANK: 'bg-sky-100 text-sky-800',
    CARD: 'bg-violet-100 text-violet-800',
    OTHER: 'bg-slate-100 text-slate-700',
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[0.7rem] font-bold ${styles[method] ?? styles.OTHER}`}>
      {method}
    </span>
  );
}
