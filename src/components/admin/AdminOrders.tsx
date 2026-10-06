'use client';

import { useEffect, useState, useCallback } from 'react';
import { AdminLayout } from '@/components/shared/AdminLayout';
import { apiClient } from '@/lib/api-client';
import { useAppStore } from '@/stores/app-store';
import { NavButton, Button } from '@/components/shared/Button';
import { Money, StatusBadge, EmptyState, Eyebrow } from '@/components/shared/primitives';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { formatDate, timeAgo } from '@/lib/types';
import {
  ShoppingCart, Search, Eye, RefreshCw, ChevronLeft, ChevronRight, Filter, X, Plus,
} from 'lucide-react';

interface OrderCustomer { id: string; firstName?: string; lastName?: string; businessName?: string | null; customerNumber?: string; phone?: string | null }
interface Order {
  id: string; orderNumber: string; customerId: string; status: string; paymentStatus: string;
  currency: string; subtotal: string; discount: string; tax: string; total: string;
  amountPaid: string; amountDue: string; depositRequired: string;
  expectedCompletionDate?: string | null; actualCompletionDate?: string | null; createdAt: string;
  customer: OrderCustomer;
}

const ORDER_STATUSES = ['PENDING', 'CONFIRMED', 'AWAITING_PAYMENT', 'QUEUED', 'IN_PRODUCTION', 'QUALITY_CHECK', 'READY', 'COMPLETED', 'CANCELLED', 'REFUNDED'];
const PAYMENT_STATUSES = ['UNPAID', 'PARTIALLY_PAID', 'PAID', 'OVERPAID', 'REFUNDED'];

export function AdminOrders() {
  const { params, navigate, pushToast } = useAppStore();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState<string>('all');
  const [paymentStatus, setPaymentStatus] = useState<string>('all');
  const [search, setSearch] = useState<string>(params.search ?? '');
  const [searchInput, setSearchInput] = useState<string>(params.search ?? '');
  const [updateTarget, setUpdateTarget] = useState<Order | null>(null);
  const [newStatus, setNewStatus] = useState<string>('');
  const [reason, setReason] = useState<string>('');
  const [saving, setSaving] = useState(false);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams({ page: String(page), pageSize: '15' });
      if (status !== 'all') qs.set('status', status);
      if (paymentStatus !== 'all') qs.set('paymentStatus', paymentStatus);
      if (search) qs.set('search', search);
      const res = await apiClient.get<{ data: Order[]; meta: any }>(`/orders?${qs.toString()}`) as any;
      setOrders(res?.data ?? []);
      setTotalPages(res?.meta?.totalPages ?? 1);
      setTotal(res?.meta?.total ?? 0);
    } catch (e: any) {
      pushToast({ message: e.message ?? 'Failed to load orders', type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [page, status, paymentStatus, search]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  const applyFilters = () => {
    setPage(1);
    setSearch(searchInput.trim());
  };

  const clearFilters = () => {
    setStatus('all'); setPaymentStatus('all'); setSearch(''); setSearchInput(''); setPage(1);
  };

  const openUpdate = (order: Order) => {
    setUpdateTarget(order);
    setNewStatus(order.status);
    setReason('');
  };

  const submitUpdate = async () => {
    if (!updateTarget) return;
    setSaving(true);
    try {
      await apiClient.patch(`/orders/${updateTarget.id}`, { status: newStatus, reason: reason.trim() || undefined });
      pushToast({ message: 'Order status updated.', type: 'success' });
      setUpdateTarget(null);
      fetchOrders();
    } catch (e: any) {
      pushToast({ message: e.message ?? 'Failed to update order', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Eyebrow>Operations</Eyebrow>
            <h1 className="mt-1 text-2xl font-extrabold text-navy sm:text-3xl">Orders</h1>
            <p className="mt-1 text-sm text-slate-500">Manage all customer orders — filter by status, search, and update progress.</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="md" onClick={fetchOrders} disabled={loading}>
              <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} /> Refresh
            </Button>
            <NavButton to="admin-quotations" variant="primary" size="md">
              <Plus className="h-4 w-4" /> New Quote
            </NavButton>
          </div>
        </div>

        {/* Filter bar */}
        <Card className="rounded-2xl">
          <CardContent className="pt-5">
            <div className="grid gap-3 md:grid-cols-[1fr_auto_auto_auto]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') applyFilters(); }}
                  placeholder="Search by order number (ORD-000001)…"
                  className="pl-9"
                />
              </div>
              <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1); }}>
                <SelectTrigger className="w-full md:w-44"><Filter className="mr-1 h-3.5 w-3.5" /><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  {ORDER_STATUSES.map((s) => <SelectItem key={s} value={s}>{s.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase())}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={paymentStatus} onValueChange={(v) => { setPaymentStatus(v); setPage(1); }}>
                <SelectTrigger className="w-full md:w-44"><SelectValue placeholder="Payment" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All payments</SelectItem>
                  {PAYMENT_STATUSES.map((s) => <SelectItem key={s} value={s}>{s.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase())}</SelectItem>)}
                </SelectContent>
              </Select>
              <div className="flex gap-2">
                <Button variant="accent" size="md" onClick={applyFilters}>Apply</Button>
                {(status !== 'all' || paymentStatus !== 'all' || search) && (
                  <Button variant="ghost" size="md" onClick={clearFilters}><X className="h-4 w-4" /></Button>
                )}
              </div>
            </div>
            <p className="mt-3 text-xs text-slate-500">{total} order{total !== 1 ? 's' : ''} found</p>
          </CardContent>
        </Card>

        {/* Desktop table */}
        <Card className="hidden overflow-hidden rounded-2xl md:block">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50 hover:bg-slate-50">
                <TableHead className="px-4 py-3 text-xs uppercase tracking-wide text-slate-500">Order #</TableHead>
                <TableHead className="px-4 py-3 text-xs uppercase tracking-wide text-slate-500">Customer</TableHead>
                <TableHead className="px-4 py-3 text-xs uppercase tracking-wide text-slate-500">Status</TableHead>
                <TableHead className="px-4 py-3 text-xs uppercase tracking-wide text-slate-500">Payment</TableHead>
                <TableHead className="px-4 py-3 text-xs uppercase tracking-wide text-slate-500">Total</TableHead>
                <TableHead className="px-4 py-3 text-xs uppercase tracking-wide text-slate-500">Paid</TableHead>
                <TableHead className="px-4 py-3 text-xs uppercase tracking-wide text-slate-500">Due</TableHead>
                <TableHead className="px-4 py-3 text-xs uppercase tracking-wide text-slate-500">Created</TableHead>
                <TableHead className="px-4 py-3 text-right text-xs uppercase tracking-wide text-slate-500">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 9 }).map((_, j) => <TableCell key={j}><Skeleton className="h-5 w-full" /></TableCell>)}
                  </TableRow>
                ))
              ) : orders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="py-12">
                    <EmptyState
                      icon={<ShoppingCart className="h-5 w-5" />}
                      title="No orders found"
                      description="Try adjusting your filters or check back later."
                    />
                  </TableCell>
                </TableRow>
              ) : (
                orders.map((o) => (
                  <TableRow
                    key={o.id}
                    className="cursor-pointer"
                    onClick={() => navigate('admin-order-detail', { id: o.id })}
                  >
                    <TableCell className="px-4 py-3 font-bold text-navy">{o.orderNumber}</TableCell>
                    <TableCell className="px-4 py-3">
                      <div className="font-semibold text-navy">{o.customer.businessName || `${o.customer.firstName ?? ''} ${o.customer.lastName ?? ''}`.trim()}</div>
                      <div className="text-xs text-slate-400">{o.customer.customerNumber}</div>
                    </TableCell>
                    <TableCell className="px-4 py-3"><StatusBadge status={o.status} /></TableCell>
                    <TableCell className="px-4 py-3"><StatusBadge status={o.paymentStatus} /></TableCell>
                    <TableCell className="px-4 py-3 font-semibold"><Money amount={o.total} /></TableCell>
                    <TableCell className="px-4 py-3 text-emerald-700"><Money amount={o.amountPaid} /></TableCell>
                    <TableCell className="px-4 py-3 text-rose-700"><Money amount={o.amountDue} /></TableCell>
                    <TableCell className="px-4 py-3 text-sm text-slate-500">{formatDate(o.createdAt)}</TableCell>
                    <TableCell className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="sm" onClick={() => navigate('admin-order-detail', { id: o.id })}><Eye className="h-3.5 w-3.5" /></Button>
                        <Button variant="outline" size="sm" onClick={() => openUpdate(o)}><RefreshCw className="h-3.5 w-3.5" /> Status</Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>

        {/* Mobile cards */}
        <div className="space-y-3 md:hidden">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-40 rounded-2xl" />)
          ) : orders.length === 0 ? (
            <EmptyState icon={<ShoppingCart className="h-5 w-5" />} title="No orders found" description="Try adjusting your filters." />
          ) : (
            orders.map((o) => (
              <Card key={o.id} className="rounded-2xl">
                <CardContent className="pt-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-bold text-navy">{o.orderNumber}</p>
                      <p className="text-xs text-slate-500">{o.customer.businessName || `${o.customer.firstName} ${o.customer.lastName}`}</p>
                    </div>
                    <StatusBadge status={o.status} />
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                    <div><p className="text-slate-400">Total</p><p className="font-bold text-navy"><Money amount={o.total} /></p></div>
                    <div><p className="text-slate-400">Paid</p><p className="font-bold text-emerald-700"><Money amount={o.amountPaid} /></p></div>
                    <div><p className="text-slate-400">Due</p><p className="font-bold text-rose-700"><Money amount={o.amountDue} /></p></div>
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <StatusBadge status={o.paymentStatus} />
                    <p className="text-xs text-slate-400">{formatDate(o.createdAt)}</p>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <Button variant="outline" size="sm" className="flex-1" onClick={() => navigate('admin-order-detail', { id: o.id })}><Eye className="h-3.5 w-3.5" /> View</Button>
                    <Button variant="ghost" size="sm" className="flex-1" onClick={() => openUpdate(o)}><RefreshCw className="h-3.5 w-3.5" /> Status</Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1}>
              <ChevronLeft className="h-4 w-4" /> Prev
            </Button>
            <span className="rounded-lg bg-white px-3 py-1.5 text-sm font-semibold text-navy shadow-sm">Page {page} / {totalPages}</span>
            <Button variant="ghost" size="sm" onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page === totalPages}>
              Next <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Update status dialog */}
      <Dialog open={!!updateTarget} onOpenChange={(o) => !o && setUpdateTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Order Status</DialogTitle>
            <DialogDescription>
              Change the status of <span className="font-bold text-navy">{updateTarget?.orderNumber}</span>. The customer will be notified of important transitions.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="mb-1.5 block">New status</Label>
              <Select value={newStatus} onValueChange={setNewStatus}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ORDER_STATUSES.map((s) => <SelectItem key={s} value={s}>{s.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase())}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="mb-1.5 block">Reason / notes (optional)</Label>
              <Textarea
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. Production delayed due to material shortage…"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setUpdateTarget(null)}>Cancel</Button>
            <Button variant="accent" onClick={submitUpdate} disabled={saving || newStatus === updateTarget?.status}>
              {saving ? 'Saving…' : 'Update Status'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}

export default AdminOrders;
