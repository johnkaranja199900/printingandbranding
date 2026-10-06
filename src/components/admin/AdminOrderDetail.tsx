'use client';

import { useEffect, useState } from 'react';
import { AdminLayout } from '@/components/shared/AdminLayout';
import { apiClient } from '@/lib/api-client';
import { useAppStore } from '@/stores/app-store';
import { Button, NavButton } from '@/components/shared/Button';
import { Money, StatusBadge, EmptyState, Eyebrow, PriorityBadge } from '@/components/shared/primitives';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { formatDate, timeAgo } from '@/lib/types';
import {
  ArrowLeft, RefreshCw, User, Building2, Calendar, Package, CreditCard,
  ClipboardList, CheckCircle2, Clock, FileText, MessageSquare, History,
} from 'lucide-react';

interface OrderItem { id: string; description: string; quantity: number; unitPrice: string; discount: string; taxRate: string; lineTotal: string; service?: { name: string } | null }
interface Payment { id: string; paymentReference: string; method: string; amount: string; status: string; paidAt?: string | null; transactionReference?: string | null; notes?: string | null }
interface StatusHistory { id: string; fromStatus: string | null; toStatus: string; reason?: string | null; notes?: string | null; createdAt: string; changedBy?: { name: string } | null }
interface ProductionJob { id: string; jobNumber: string; stage: string; status: string; assignee?: { name: string } | null; startedAt?: string | null; completedAt?: string | null }
interface Customer { id: string; firstName: string; lastName: string; businessName?: string | null; customerNumber: string; phone?: string | null; email?: string | null }
interface Order {
  id: string; orderNumber: string; status: string; paymentStatus: string; productionStatus?: string | null;
  currency: string; subtotal: string; discount: string; tax: string; taxRate: string; total: string;
  amountPaid: string; amountDue: string; depositRequired: string;
  expectedCompletionDate?: string | null; actualCompletionDate?: string | null; createdAt: string;
  notes?: string | null; assignedToId?: string | null;
  customer: Customer; items: OrderItem[]; payments: Payment[];
  statusHistory: StatusHistory[]; productionJobs: ProductionJob[];
  quotation?: { quoteNumber: string } | null;
}

const ORDER_STATUSES = ['PENDING', 'CONFIRMED', 'AWAITING_PAYMENT', 'QUEUED', 'IN_PRODUCTION', 'QUALITY_CHECK', 'READY', 'COMPLETED', 'CANCELLED', 'REFUNDED'];
const STAFF_ROLES = ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'SALES', 'PRODUCTION', 'DESIGNER', 'PUBLISHER'];

export function AdminOrderDetail() {
  const { params, navigate, pushToast } = useAppStore();
  const id = params.id;
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [staff, setStaff] = useState<{ id: string; name: string; role: string }[]>([]);
  const [showUpdate, setShowUpdate] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  // NOTE: Radix Select forbids "" as a value (it is reserved for clearing the
  // selection), so we use a sentinel for "Unassigned".
  const UNASSIGNED = '__unassigned__';
  const [assignToId, setAssignToId] = useState<string>(UNASSIGNED);

  const fetchOrder = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const o = await apiClient.get<Order>(`/orders/${id}`) as any;
      setOrder(o);
      setAssignToId(o.assignedToId ?? UNASSIGNED);
    } catch (e: any) {
      pushToast({ message: e.message ?? 'Failed to load order', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchOrder(); }, [id]);

  useEffect(() => {
    apiClient.get<{ data: any[] }>('/admin/staff').then((r: any) => {
      const list = (r?.data ?? []).filter((s: any) => STAFF_ROLES.includes(s.role));
      setStaff(list.map((s: any) => ({ id: s.id, name: s.name, role: s.role })));
    }).catch(() => {});
  }, []);

  const openUpdate = () => {
    if (!order) return;
    setNewStatus(order.status);
    setReason('');
    setShowUpdate(true);
  };

  const submitUpdate = async () => {
    if (!order) return;
    setSaving(true);
    try {
      await apiClient.patch(`/orders/${order.id}`, { status: newStatus, reason: reason.trim() || undefined });
      pushToast({ message: 'Order status updated.', type: 'success' });
      setShowUpdate(false);
      fetchOrder();
    } catch (e: any) {
      pushToast({ message: e.message ?? 'Failed to update', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const assignTo = async () => {
    if (!order) return;
    setSaving(true);
    try {
      await apiClient.patch(`/orders/${order.id}`, { assignedToId: assignToId === UNASSIGNED ? null : assignToId });
      pushToast({ message: 'Assignment updated.', type: 'success' });
      fetchOrder();
    } catch (e: any) {
      pushToast({ message: e.message ?? 'Failed to assign', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  if (loading || !order) {
    return (
      <AdminLayout>
        <div className="space-y-4">
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-48 rounded-2xl" />
          <Skeleton className="h-64 rounded-2xl" />
        </div>
      </AdminLayout>
    );
  }

  const customerName = order.customer.businessName || `${order.customer.firstName} ${order.customer.lastName}`.trim();

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Back */}
        <button onClick={() => navigate('admin-orders')} className="flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-navy">
          <ArrowLeft className="h-4 w-4" /> Back to Orders
        </button>

        {/* Header card */}
        <Card className="overflow-hidden rounded-2xl">
          <div className="bg-gradient-to-br from-navy via-navy-soft to-navy p-6 text-white sm:p-8">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <Eyebrow className="text-gold">Order</Eyebrow>
                <h1 className="mt-1 text-2xl font-extrabold sm:text-3xl">{order.orderNumber}</h1>
                <p className="mt-1 text-sm text-white/70">Created {formatDate(order.createdAt, true)}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <StatusBadge status={order.status} className="bg-white/10 text-white" />
                <StatusBadge status={order.paymentStatus} className="bg-white/10 text-white" />
              </div>
            </div>
            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <InfoCard icon={<User className="h-4 w-4" />} label="Customer" value={customerName} sub={order.customer.customerNumber} />
              <InfoCard icon={<Building2 className="h-4 w-4" />} label="Business" value={order.customer.businessName || '—'} sub={order.customer.phone || 'No phone'} />
              <InfoCard icon={<Calendar className="h-4 w-4" />} label="Expected" value={order.expectedCompletionDate ? formatDate(order.expectedCompletionDate) : 'Not set'} sub={order.actualCompletionDate ? `Completed ${formatDate(order.actualCompletionDate)}` : 'In progress'} />
              <InfoCard icon={<CreditCard className="h-4 w-4" />} label="Total" value={<Money amount={order.total} className="text-white" />} sub={<><span className="text-emerald-300">Paid <Money amount={order.amountPaid} /></span> · <span className="text-rose-300">Due <Money amount={order.amountDue} /></span></>} />
            </div>
          </div>
          <CardContent className="pt-5">
            <div className="flex flex-wrap gap-2">
              <Button variant="accent" size="md" onClick={openUpdate}><RefreshCw className="h-4 w-4" /> Update Status</Button>
              <Button variant="ghost" size="md" onClick={() => navigate('admin-sales', { orderId: order.id })}><CreditCard className="h-4 w-4" /> Record Payment</Button>
              {order.quotation && <NavButton to="admin-quotations" variant="outline" size="md"><FileText className="h-4 w-4" /> Quotation {order.quotation.quoteNumber}</NavButton>}
            </div>
          </CardContent>
        </Card>

        {/* Status timeline */}
        <Card className="rounded-2xl">
          <CardHeader className="border-b pb-4">
            <CardTitle className="flex items-center gap-2 text-navy"><History className="h-5 w-5 text-gold" /> Status Timeline</CardTitle>
          </CardHeader>
          <CardContent className="pt-5">
            {order.statusHistory.length === 0 ? (
              <EmptyState title="No status history" description="Status changes will appear here." />
            ) : (
              <ol className="relative space-y-5 border-l-2 border-slate-200 pl-6">
                {order.statusHistory.map((h, i) => {
                  const isLast = i === order.statusHistory.length - 1;
                  return (
                    <li key={h.id} className="relative">
                      <span className={cn(
                        'absolute -left-[1.65rem] top-0.5 grid h-6 w-6 place-items-center rounded-full',
                        isLast ? 'bg-gold text-white' : 'bg-slate-200 text-slate-600',
                      )}>
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      </span>
                      <div className="flex flex-wrap items-center gap-2">
                        <StatusBadge status={h.toStatus} />
                        {h.fromStatus && <span className="text-xs text-slate-400">from {h.fromStatus}</span>}
                        <span className="ml-auto text-xs text-slate-400">{formatDate(h.createdAt, true)} · {timeAgo(h.createdAt)}</span>
                      </div>
                      <p className="mt-1 text-xs text-slate-500">by <span className="font-semibold text-navy">{h.changedBy?.name ?? 'System'}</span></p>
                      {h.reason && <p className="mt-1 rounded-lg bg-slate-50 p-2 text-xs text-slate-600">{h.reason}</p>}
                    </li>
                  );
                })}
              </ol>
            )}
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Items */}
          <Card className="rounded-2xl lg:col-span-2">
            <CardHeader className="border-b pb-4">
              <CardTitle className="flex items-center gap-2 text-navy"><Package className="h-5 w-5 text-gold" /> Order Items</CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50 hover:bg-slate-50">
                    <TableHead className="text-xs uppercase text-slate-500">Description</TableHead>
                    <TableHead className="text-right text-xs uppercase text-slate-500">Qty</TableHead>
                    <TableHead className="text-right text-xs uppercase text-slate-500">Unit Price</TableHead>
                    <TableHead className="text-right text-xs uppercase text-slate-500">Disc</TableHead>
                    <TableHead className="text-right text-xs uppercase text-slate-500">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {order.items.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="py-8 text-center text-slate-500">No items</TableCell></TableRow>
                  ) : order.items.map((it) => (
                    <TableRow key={it.id}>
                      <TableCell className="font-semibold text-navy">
                        {it.description}
                        {it.service && <span className="ml-2 text-xs text-slate-400">· {it.service.name}</span>}
                      </TableCell>
                      <TableCell className="text-right">{it.quantity}</TableCell>
                      <TableCell className="text-right"><Money amount={it.unitPrice} /></TableCell>
                      <TableCell className="text-right"><Money amount={it.discount} /></TableCell>
                      <TableCell className="text-right font-bold text-navy"><Money amount={it.lineTotal} /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {/* Totals */}
              <div className="mt-4 flex justify-end">
                <div className="w-full max-w-xs space-y-1.5 text-sm">
                  <div className="flex justify-between"><span className="text-slate-500">Subtotal</span><span className="font-semibold text-navy"><Money amount={order.subtotal} /></span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Discount</span><span className="font-semibold text-rose-600">- <Money amount={order.discount} /></span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Tax ({order.taxRate}%)</span><span className="font-semibold text-navy"><Money amount={order.tax} /></span></div>
                  <div className="flex justify-between border-t pt-2 text-base"><span className="font-bold text-navy">Total</span><span className="font-extrabold text-navy"><Money amount={order.total} /></span></div>
                  <div className="flex justify-between text-emerald-700"><span className="text-slate-500">Paid</span><span className="font-bold"><Money amount={order.amountPaid} /></span></div>
                  <div className="flex justify-between text-rose-700"><span className="text-slate-500">Due</span><span className="font-bold"><Money amount={order.amountDue} /></span></div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Side panel */}
          <div className="space-y-6">
            {/* Assign + payment summary */}
            <Card className="rounded-2xl">
              <CardHeader className="border-b pb-4">
                <CardTitle className="text-navy">Assignment & Notes</CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-3">
                <div>
                  <Label className="mb-1.5 block text-sm">Assign to staff</Label>
                  <Select value={assignToId} onValueChange={setAssignToId}>
                    <SelectTrigger className="w-full"><SelectValue placeholder="Unassigned" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value={UNASSIGNED}>Unassigned</SelectItem>
                      {staff.filter((s) => Boolean(s?.id)).map((s) => <SelectItem key={s.id} value={s.id}>{s.name} · {(s.role ?? '').replace(/_/g, ' ').toLowerCase()}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <Button variant="accent" size="sm" className="w-full" onClick={assignTo} disabled={saving}>
                  {saving ? 'Saving…' : 'Save Assignment'}
                </Button>
                {order.notes && (
                  <div className="rounded-xl bg-slate-50 p-3">
                    <p className="mb-1 flex items-center gap-1 text-xs font-bold uppercase tracking-wide text-slate-500"><MessageSquare className="h-3 w-3" /> Notes</p>
                    <p className="text-sm text-slate-700">{order.notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Payments */}
            <Card className="rounded-2xl">
              <CardHeader className="border-b pb-4">
                <CardTitle className="flex items-center gap-2 text-navy"><CreditCard className="h-5 w-5 text-gold" /> Payments</CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                {order.payments.length === 0 ? (
                  <EmptyState icon={<CreditCard className="h-5 w-5" />} title="No payments yet" description="Record the first payment to begin." />
                ) : (
                  <ul className="space-y-2">
                    {order.payments.map((p) => (
                      <li key={p.id} className="rounded-xl border border-slate-200 p-3">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-navy">{p.paymentReference}</span>
                          <StatusBadge status={p.status} />
                        </div>
                        <div className="mt-1 flex items-center justify-between text-xs text-slate-500">
                          <span>{p.method}</span>
                          <span className="font-bold text-emerald-700"><Money amount={p.amount} /></span>
                        </div>
                        <p className="mt-1 text-xs text-slate-400">{p.paidAt ? formatDate(p.paidAt, true) : 'Pending'}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Production jobs */}
        {order.productionJobs.length > 0 && (
          <Card className="rounded-2xl">
            <CardHeader className="border-b pb-4">
              <CardTitle className="flex items-center gap-2 text-navy"><ClipboardList className="h-5 w-5 text-gold" /> Production Jobs</CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {order.productionJobs.map((j) => (
                  <div key={j.id} className="rounded-xl border border-slate-200 p-4">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-navy">{j.jobNumber}</span>
                      <StatusBadge status={j.status} />
                    </div>
                    <div className="mt-2 space-y-1 text-xs text-slate-600">
                      <p>Stage: <span className="font-semibold text-navy">{(j.stage ?? '').replace(/_/g, ' ').toLowerCase()}</span></p>
                      <p>Assignee: <span className="font-semibold text-navy">{j.assignee?.name ?? 'Unassigned'}</span></p>
                      {j.startedAt && <p>Started: {formatDate(j.startedAt)}</p>}
                      {j.completedAt && <p>Completed: {formatDate(j.completedAt)}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Update status dialog */}
      <Dialog open={showUpdate} onOpenChange={setShowUpdate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Order Status</DialogTitle>
            <DialogDescription>Change the status of <span className="font-bold text-navy">{order.orderNumber}</span>. Customer will be notified of important transitions.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="mb-1.5 block">New status</Label>
              <Select value={newStatus} onValueChange={setNewStatus}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ORDER_STATUSES.map((s) => <SelectItem key={s} value={s}>{(s ?? '').replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase())}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="mb-1.5 block">Reason / notes</Label>
              <Textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Optional reason or notes…" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowUpdate(false)}>Cancel</Button>
            <Button variant="accent" onClick={submitUpdate} disabled={saving || newStatus === order.status}>{saving ? 'Saving…' : 'Update Status'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}

function InfoCard({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: React.ReactNode; sub?: React.ReactNode }) {
  return (
    <div className="rounded-xl bg-white/5 p-4 backdrop-blur">
      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-gold">{icon} {label}</div>
      <p className="mt-1 text-sm font-bold text-white">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-white/60">{sub}</p>}
    </div>
  );
}

export default AdminOrderDetail;
