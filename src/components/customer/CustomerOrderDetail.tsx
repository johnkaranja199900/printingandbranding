'use client';

import { useCallback, useEffect, useState } from 'react';
import { CustomerLayout } from '@/components/shared/CustomerLayout';
import { Button } from '@/components/shared/Button';
import { StatusBadge, Money, Eyebrow } from '@/components/shared/primitives';
import { apiClient } from '@/lib/api-client';
import { useAppStore } from '@/stores/app-store';
import { formatDate, toNumber } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  ArrowLeft, ShoppingCart, Copy, Check, CreditCard, Calendar, Loader2,
  Package, History, ClipboardList, XCircle, Truck,
} from 'lucide-react';

// ---------- API types ----------
interface OrderItem {
  id: string;
  description: string;
  quantity: string | number;
  unitPrice: string | number;
  discount: string | number;
  lineTotal: string | number;
  status?: string;
}
interface Payment {
  id: string;
  paymentReference: string;
  method: string;
  amount: string | number;
  status: string;
  paidAt: string | null;
  createdAt: string;
}
interface StatusHistoryEntry {
  id: string;
  fromStatus: string | null;
  toStatus: string;
  reason?: string | null;
  notes?: string | null;
  createdAt: string;
}
interface Order {
  id: string;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  productionStatus?: string | null;
  currency: string;
  subtotal: string | number;
  discount: string | number;
  tax: string | number;
  total: string | number;
  amountPaid: string | number;
  amountDue: string | number;
  depositRequired: string | number;
  expectedCompletionDate: string | null;
  actualCompletionDate?: string | null;
  trackingToken: string;
  notes?: string | null;
  createdAt: string;
  items: OrderItem[];
  payments: Payment[];
  statusHistory: StatusHistoryEntry[];
}

type PaymentMethod = 'MPESA' | 'CASH' | 'BANK' | 'CARD';

// Status timeline config
const STEPS = [
  { key: 'PENDING', label: 'Pending' },
  { key: 'CONFIRMED', label: 'Confirmed' },
  { key: 'IN_PRODUCTION', label: 'Production' },
  { key: 'QUALITY_CHECK', label: 'QC' },
  { key: 'READY', label: 'Ready' },
  { key: 'COMPLETED', label: 'Completed' },
];

function stepIndex(status: string): number {
  switch (status) {
    case 'PENDING': return 0;
    case 'CONFIRMED':
    case 'AWAITING_PAYMENT':
    case 'QUEUED': return 1;
    case 'IN_PRODUCTION': return 2;
    case 'QUALITY_CHECK': return 3;
    case 'READY': return 4;
    case 'COMPLETED': return 5;
    default: return -1; // cancelled / refunded
  }
}

// ---------- Component ----------
export function CustomerOrderDetail() {
  const { params, navigate, pushToast } = useAppStore();
  const id = params?.id;

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  // Payment dialog
  const [method, setMethod] = useState<PaymentMethod>('MPESA');
  const [amount, setAmount] = useState('');
  const [payOpen, setPayOpen] = useState(false);
  const [paying, setPaying] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await apiClient.get<Order>(`/orders/${id}`);
      setOrder(res);
    } catch (e: any) {
      pushToast({ message: e.message ?? 'Failed to load order.', type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [id, pushToast]);

  useEffect(() => { load(); }, [load]);

  const copyToken = async () => {
    if (!order) return;
    try {
      await navigator.clipboard.writeText(order.trackingToken);
      setCopied(true);
      pushToast({ message: 'Tracking token copied to clipboard.', type: 'success' });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      pushToast({ message: 'Could not copy tracking token.', type: 'error' });
    }
  };

  const openPay = () => {
    if (!order) return;
    setMethod('MPESA');
    setAmount(String(toNumber(order.amountDue) || toNumber(order.depositRequired) || toNumber(order.total)));
    setPayOpen(true);
  };

  const submitPayment = async () => {
    if (!order) return;
    const amt = Number(amount);
    if (!amt || amt <= 0) {
      pushToast({ message: 'Please enter a valid amount.', type: 'warning' });
      return;
    }
    setPaying(true);
    try {
      await apiClient.post('/payments', { orderId: order.id, method, amount: amt });
      pushToast({
        title: 'Payment successful',
        message: `KES ${amt.toLocaleString()} paid for ${order.orderNumber}.`,
        type: 'success',
      });
      setPayOpen(false);
      load();
    } catch (e: any) {
      pushToast({ message: e.message ?? 'Payment failed.', type: 'error' });
    } finally {
      setPaying(false);
    }
  };

  if (loading) {
    return (
      <CustomerLayout>
        <div className="space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-32 rounded-2xl" />
          <Skeleton className="h-24 rounded-2xl" />
          <Skeleton className="h-64 rounded-2xl" />
        </div>
      </CustomerLayout>
    );
  }

  if (!order) {
    return (
      <CustomerLayout>
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <ShoppingCart className="mx-auto mb-3 h-8 w-8 text-slate-400" />
          <h3 className="text-base font-bold text-navy">Order not found</h3>
          <Button variant="accent" size="sm" className="mt-4" onClick={() => navigate('customer-orders')}>
            Back to orders
          </Button>
        </div>
      </CustomerLayout>
    );
  }

  const due = toNumber(order.amountDue);
  const canPay = due > 0 && order.status !== 'CANCELLED' && order.status !== 'REFUNDED';
  const isCancelled = order.status === 'CANCELLED' || order.status === 'REFUNDED';
  const currentStep = stepIndex(order.status);
  const pct = toNumber(order.total) > 0 ? Math.min(100, Math.round((toNumber(order.amountPaid) / toNumber(order.total)) * 100)) : 0;

  return (
    <CustomerLayout>
      <button
        onClick={() => navigate('customer-orders')}
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-bold text-slate-500 hover:text-navy"
      >
        <ArrowLeft className="h-4 w-4" /> Back to orders
      </button>

      {/* Header */}
      <div className="mb-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <Eyebrow>Order</Eyebrow>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-extrabold text-navy">{order.orderNumber}</h1>
              <StatusBadge status={order.status} />
              <StatusBadge status={order.paymentStatus} />
            </div>
            <p className="mt-1 text-sm text-slate-500">Placed on {formatDate(order.createdAt, true)}</p>
          </div>

          {/* Tracking token */}
          <div className="flex max-w-full flex-col gap-1">
            <span className="text-[0.65rem] font-bold uppercase tracking-wide text-slate-400">Tracking Token</span>
            <button
              onClick={copyToken}
              className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-mono font-semibold text-navy hover:border-gold hover:bg-white"
              title="Copy tracking token"
            >
              <span className="max-w-[180px] truncate">{order.trackingToken}</span>
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
            </button>
          </div>
        </div>

        {order.expectedCompletionDate && (
          <p className="mt-3 flex items-center gap-1.5 text-xs text-slate-500">
            <Calendar className="h-3.5 w-3.5" /> Expected completion: <span className="font-bold text-navy">{formatDate(order.expectedCompletionDate)}</span>
          </p>
        )}
      </div>

      {/* Status timeline */}
      <div className="mb-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 flex items-center gap-2 text-base font-bold text-navy">
          <Truck className="h-4 w-4 text-gold" /> Order Progress
        </h2>
        {isCancelled ? (
          <div className="flex items-center gap-3 rounded-xl bg-rose-50 p-4 text-rose-700">
            <XCircle className="h-5 w-5" />
            <div>
              <p className="font-bold">This order was {order.status.toLowerCase()}</p>
              <p className="text-xs">No further updates will be made to this order.</p>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-1 overflow-x-auto pb-2">
            {STEPS.map((step, i) => {
              const done = i < currentStep;
              const active = i === currentStep;
              return (
                <div key={step.key} className="flex flex-1 items-center">
                  <div className="flex flex-col items-center gap-1.5">
                    <div
                      className={`grid h-9 w-9 place-items-center rounded-full border-2 text-xs font-bold transition-all ${
                        active
                          ? 'border-gold bg-gold text-navy'
                          : done
                            ? 'border-emerald-500 bg-emerald-500 text-white'
                            : 'border-slate-200 bg-white text-slate-400'
                      }`}
                    >
                      {done ? <Check className="h-4 w-4" /> : i + 1}
                    </div>
                    <span className={`text-[0.7rem] font-semibold ${active ? 'text-gold' : done ? 'text-emerald-700' : 'text-slate-400'}`}>
                      {step.label}
                    </span>
                  </div>
                  {i < STEPS.length - 1 && (
                    <div className={`mx-1 h-0.5 flex-1 rounded ${i < currentStep ? 'bg-emerald-500' : 'bg-slate-200'}`} />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Payment summary + Pay button */}
      <div className="mb-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-500">Payment Summary</h3>
          <div className="space-y-2 text-sm">
            <Row label="Total" value={<Money amount={order.total} />} />
            <Row label="Paid" value={<span className="text-emerald-700"><Money amount={order.amountPaid} /></span>} />
            <Row label="Outstanding" value={<span className={due > 0 ? 'font-bold text-rose-600' : 'text-emerald-700'}><Money amount={order.amountDue} /></span>} />
            <Row label="Deposit Required" value={<Money amount={order.depositRequired} />} />
          </div>
          <div className="mt-3">
            <div className="mb-1 flex items-center justify-between text-xs text-slate-500">
              <span>Payment progress</span><span>{pct}%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${pct}%` }} />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-500">Next Step</h3>
          {canPay ? (
            <>
              <p className="mb-3 text-sm text-slate-600">
                You have an outstanding balance of <span className="font-bold text-rose-600"><Money amount={order.amountDue} /></span>. Pay now to keep your order moving.
              </p>
              <Button variant="accent" size="md" className="w-full" onClick={openPay}>
                <CreditCard className="h-4 w-4" /> Pay Now
              </Button>
            </>
          ) : isCancelled ? (
            <p className="text-sm text-slate-500">This order has been cancelled. No further action is needed.</p>
          ) : (
            <p className="text-sm text-emerald-700">This order is fully paid. We&rsquo;ll notify you of progress updates.</p>
          )}
        </div>
      </div>

      {/* Items list */}
      <div className="mb-4 rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-4">
          <ClipboardList className="h-4 w-4 text-gold" />
          <h2 className="text-base font-bold text-navy">Order Items</h2>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead className="pl-5">Description</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead className="text-right">Unit Price</TableHead>
                <TableHead className="text-right">Discount</TableHead>
                <TableHead className="pr-5 text-right">Line Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {order.items.map((it) => (
                <TableRow key={it.id}>
                  <TableCell className="pl-5 max-w-xs text-slate-700"><span className="line-clamp-2">{it.description}</span></TableCell>
                  <TableCell className="text-right text-slate-600">{toNumber(it.quantity)}</TableCell>
                  <TableCell className="text-right text-slate-600"><Money amount={it.unitPrice} /></TableCell>
                  <TableCell className="text-right text-slate-600">{toNumber(it.discount) > 0 ? <Money amount={it.discount} /> : '—'}</TableCell>
                  <TableCell className="pr-5 text-right font-bold text-navy"><Money amount={it.lineTotal} /></TableCell>
                </TableRow>
              ))}
              {order.items.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="py-6 text-center text-sm text-slate-400">No items.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Two columns: payments history + status history */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Payments */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-4">
            <CreditCard className="h-4 w-4 text-gold" />
            <h2 className="text-base font-bold text-navy">Payments History</h2>
          </div>
          {order.payments.length === 0 ? (
            <p className="p-5 text-center text-sm text-slate-400">No payments recorded yet.</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {order.payments.map((p) => (
                <div key={p.id} className="flex items-center justify-between gap-3 px-5 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-navy">{p.paymentReference}</span>
                      <StatusBadge status={p.status} />
                    </div>
                    <p className="text-xs text-slate-500">{p.method} · {formatDate(p.paidAt ?? p.createdAt, true)}</p>
                  </div>
                  <p className="font-bold text-emerald-700"><Money amount={p.amount} /></p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Status history */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-4">
            <History className="h-4 w-4 text-gold" />
            <h2 className="text-base font-bold text-navy">Status History</h2>
          </div>
          {order.statusHistory.length === 0 ? (
            <p className="p-5 text-center text-sm text-slate-400">No status updates yet.</p>
          ) : (
            <div className="px-5 py-4">
              <ol className="relative border-l-2 border-slate-100">
                {order.statusHistory.map((h, i) => {
                  const isLast = i === order.statusHistory.length - 1;
                  return (
                    <li key={h.id} className="relative ml-4 pb-5 last:pb-0">
                      <span className={`absolute -left-[1.4rem] top-0.5 grid h-4 w-4 place-items-center rounded-full border-2 ${isLast ? 'border-gold bg-gold' : 'border-slate-300 bg-white'}`}>
                        {isLast && <span className="h-1.5 w-1.5 rounded-full bg-navy" />}
                      </span>
                      <div className="flex flex-wrap items-center gap-2">
                        <StatusBadge status={h.toStatus} />
                        {h.fromStatus && <span className="text-[0.7rem] text-slate-400">from <StatusBadge status={h.fromStatus} /></span>}
                        <span className="text-[0.7rem] text-slate-400">{formatDate(h.createdAt, true)}</span>
                      </div>
                      {h.reason && <p className="mt-1 text-xs text-slate-600">{h.reason}</p>}
                    </li>
                  );
                })}
              </ol>
            </div>
          )}
        </div>
      </div>

      {/* Payment Dialog */}
      <Dialog open={payOpen} onOpenChange={(open) => !open && setPayOpen(false)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-navy">Make a Payment</DialogTitle>
            <DialogDescription>Pay towards {order.orderNumber}</DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="rounded-xl bg-slate-50 p-3 text-xs">
              <div className="flex justify-between"><span className="text-slate-500">Order Total</span><span className="font-bold text-navy"><Money amount={order.total} /></span></div>
              <div className="mt-1 flex justify-between"><span className="text-slate-500">Already Paid</span><span className="font-semibold text-emerald-700"><Money amount={order.amountPaid} /></span></div>
              <div className="mt-1 flex justify-between border-t border-slate-200 pt-1"><span className="text-slate-500">Outstanding</span><span className="font-bold text-rose-600"><Money amount={order.amountDue} /></span></div>
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
              <p className="mt-1 text-[0.7rem] text-slate-400">M-Pesa is simulated for this demo and will succeed automatically.</p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => setPayOpen(false)} disabled={paying}>Cancel</Button>
            <Button variant="accent" size="sm" onClick={submitPayment} disabled={paying}>
              {paying ? 'Processing...' : <>Pay <Money amount={Number(amount) || 0} /></>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </CustomerLayout>
  );
}

export default CustomerOrderDetail;

// ---------- Sub components ----------
function Row({ label, value }: { label: React.ReactNode; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-slate-500">{label}</span>
      <span className="font-semibold text-navy">{value}</span>
    </div>
  );
}
