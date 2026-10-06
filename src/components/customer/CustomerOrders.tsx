'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { CustomerLayout } from '@/components/shared/CustomerLayout';
import { Button } from '@/components/shared/Button';
import { StatusBadge, Money, EmptyState, Eyebrow } from '@/components/shared/primitives';
import { apiClient } from '@/lib/api-client';
import { useAppStore } from '@/stores/app-store';
import { formatDate, toNumber } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  ShoppingCart, ChevronRight, CreditCard, Search, Calendar, AlertCircle,
} from 'lucide-react';

// ---------- API types ----------
interface OrderItem { id: string; description: string; quantity: string | number; lineTotal: string | number; }
interface Order {
  id: string;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  total: string | number;
  amountPaid: string | number;
  amountDue: string | number;
  depositRequired: string | number;
  expectedCompletionDate: string | null;
  createdAt: string;
  items: OrderItem[];
}
interface ListResponse { data: Order[]; meta: { total: number; page: number; pageSize: number; totalPages: number } }

type Filter = 'all' | 'active' | 'completed' | 'cancelled';
type PaymentMethod = 'MPESA' | 'CASH' | 'BANK' | 'CARD';

const ACTIVE_STATUSES = ['PENDING', 'CONFIRMED', 'AWAITING_PAYMENT', 'QUEUED', 'IN_PRODUCTION', 'QUALITY_CHECK', 'READY'];

// ---------- Component ----------
export function CustomerOrders() {
  const { navigate, pushToast } = useAppStore();
  const [items, setItems] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>('all');
  const [search, setSearch] = useState('');

  // Payment dialog state
  const [payOrder, setPayOrder] = useState<Order | null>(null);
  const [method, setMethod] = useState<PaymentMethod>('MPESA');
  const [amount, setAmount] = useState('');
  const [paying, setPaying] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get<ListResponse>('/orders?pageSize=50');
      setItems(res.data ?? []);
    } catch (e: any) {
      pushToast({ message: e.message ?? 'Failed to load orders.', type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [pushToast]);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    return items.filter((o) => {
      if (filter === 'active' && !ACTIVE_STATUSES.includes(o.status)) return false;
      if (filter === 'completed' && o.status !== 'COMPLETED') return false;
      if (filter === 'cancelled' && o.status !== 'CANCELLED') return false;
      if (search && !o.orderNumber.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [items, filter, search]);

  const openPayDialog = (order: Order) => {
    setPayOrder(order);
    setMethod('MPESA');
    setAmount(String(toNumber(order.amountDue) || toNumber(order.depositRequired) || toNumber(order.total)));
  };

  const submitPayment = async () => {
    if (!payOrder) return;
    const amt = Number(amount);
    if (!amt || amt <= 0) {
      pushToast({ message: 'Please enter a valid amount.', type: 'warning' });
      return;
    }
    setPaying(true);
    try {
      await apiClient.post('/payments', { orderId: payOrder.id, method, amount: amt });
      pushToast({ title: 'Payment successful', message: `KES ${amt.toLocaleString()} paid for ${payOrder.orderNumber}.`, type: 'success' });
      setPayOrder(null);
      load();
    } catch (e: any) {
      pushToast({ message: e.message ?? 'Payment failed.', type: 'error' });
    } finally {
      setPaying(false);
    }
  };

  return (
    <CustomerLayout>
      <div className="mb-6 flex flex-col gap-1">
        <Eyebrow>Customer Portal</Eyebrow>
        <h1 className="text-2xl font-extrabold text-navy sm:text-3xl">My Orders</h1>
        <p className="text-sm text-slate-500">Track and manage your orders. Pay outstanding balances to keep production moving.</p>
      </div>

      {/* Filters + search */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Tabs value={filter} onValueChange={(v) => setFilter(v as Filter)}>
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="active">Active</TabsTrigger>
            <TabsTrigger value="completed">Completed</TabsTrigger>
            <TabsTrigger value="cancelled">Cancelled</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search order number..."
            className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/20"
          />
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-2xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<ShoppingCart className="h-5 w-5" />}
          title="No orders found"
          description="Accept a quotation to create your first order, or adjust the filter above."
          action={<Button variant="accent" size="sm" onClick={() => navigate('customer-quotations')}>View Quotations</Button>}
        />
      ) : (
        <div className="space-y-3">
          {filtered.map((o) => {
            const due = toNumber(o.amountDue);
            const total = toNumber(o.total);
            const paid = toNumber(o.amountPaid);
            const pct = total > 0 ? Math.min(100, Math.round((paid / total) * 100)) : 0;
            return (
              <div
                key={o.id}
                className="group cursor-pointer rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
                onClick={() => navigate('customer-order-detail', { id: o.id })}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-navy">{o.orderNumber}</span>
                      <StatusBadge status={o.status} />
                      <StatusBadge status={o.paymentStatus} />
                    </div>
                    <p className="mt-1 text-sm text-slate-500">
                      {o.items?.length ?? 0} item(s) · Placed {formatDate(o.createdAt)}
                    </p>
                    {o.expectedCompletionDate && (
                      <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-500">
                        <Calendar className="h-3 w-3" /> Expected by {formatDate(o.expectedCompletionDate)}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-extrabold text-navy"><Money amount={o.total} /></p>
                    {due > 0 ? (
                      <p className="text-xs font-semibold text-rose-600">Due <Money amount={o.amountDue} /></p>
                    ) : (
                      <p className="text-xs font-semibold text-emerald-600">Fully paid</p>
                    )}
                  </div>
                </div>

                {/* Payment progress */}
                <div className="mt-3">
                  <div className="mb-1 flex items-center justify-between text-xs text-slate-500">
                    <span>Paid <Money amount={o.amountPaid} /></span>
                    <span>{pct}%</span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full bg-emerald-500" style={{ width: `${pct}%` }} />
                  </div>
                </div>

                {/* Action */}
                {due > 0 && o.status !== 'CANCELLED' && o.status !== 'REFUNDED' && (
                  <div className="mt-3 flex items-center justify-between" onClick={(e) => e.stopPropagation()}>
                    <span className="flex items-center gap-1 text-xs text-amber-700">
                      <AlertCircle className="h-3.5 w-3.5" /> Deposit required: <Money amount={o.depositRequired} />
                    </span>
                    <Button variant="accent" size="sm" onClick={() => openPayDialog(o)}>
                      <CreditCard className="h-4 w-4" /> Pay Now
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Payment Dialog */}
      <Dialog open={!!payOrder} onOpenChange={(open) => !open && setPayOrder(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-navy">Make a Payment</DialogTitle>
            <DialogDescription>
              {payOrder ? `Pay towards ${payOrder.orderNumber}` : ''}
            </DialogDescription>
          </DialogHeader>

          {payOrder && (
            <div className="space-y-3">
              <div className="rounded-xl bg-slate-50 p-3 text-xs">
                <div className="flex justify-between"><span className="text-slate-500">Order Total</span><span className="font-bold text-navy"><Money amount={payOrder.total} /></span></div>
                <div className="mt-1 flex justify-between"><span className="text-slate-500">Already Paid</span><span className="font-semibold text-emerald-700"><Money amount={payOrder.amountPaid} /></span></div>
                <div className="mt-1 flex justify-between border-t border-slate-200 pt-1"><span className="text-slate-500">Outstanding</span><span className="font-bold text-rose-600"><Money amount={payOrder.amountDue} /></span></div>
              </div>

              <div>
                <Label htmlFor="method">Payment Method</Label>
                <Select value={method} onValueChange={(v) => setMethod(v as PaymentMethod)}>
                  <SelectTrigger id="method" className="mt-1 w-full">
                    <SelectValue placeholder="Select method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MPESA">M-Pesa</SelectItem>
                    <SelectItem value="CASH">Cash</SelectItem>
                    <SelectItem value="BANK">Bank Transfer</SelectItem>
                    <SelectItem value="CARD">Card</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="amount">Amount (KES)</Label>
                <Input
                  id="amount" type="number" min="1" step="any"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="mt-1"
                />
                <p className="mt-1 text-[0.7rem] text-slate-400">
                  M-Pesa is simulated for this demo and will succeed automatically.
                </p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => setPayOrder(null)} disabled={paying}>Cancel</Button>
            <Button variant="accent" size="sm" onClick={submitPayment} disabled={paying}>
              {paying ? 'Processing...' : <>Pay <Money amount={Number(amount) || 0} /></>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </CustomerLayout>
  );
}

export default CustomerOrders;
