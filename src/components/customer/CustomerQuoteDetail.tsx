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
  ArrowLeft, FileText, Calendar, CheckCircle2, XCircle, ShoppingCart, Loader2, Clock, User as UserIcon,
} from 'lucide-react';

// ---------- API types ----------
interface QuotationItem {
  id: string;
  description: string;
  quantity: string | number;
  unitPrice: string | number;
  discount: string | number;
  taxRate?: string | number;
  lineTotal: string | number;
}
interface Customer { firstName: string; lastName: string; businessName?: string | null; customerNumber: string; email?: string | null; phone?: string | null; }
interface QuoteRequest { requestNumber: string; subject: string; description?: string; service?: { name: string } | null; }
interface Quotation {
  id: string;
  quoteNumber: string;
  status: string;
  currency: string;
  subtotal: string | number;
  discount: string | number;
  taxRate?: string | number;
  tax: string | number;
  total: string | number;
  validUntil: string;
  notes?: string | null;
  terms?: string | null;
  sentAt?: string | null;
  approvedAt?: string | null;
  createdAt: string;
  items: QuotationItem[];
  customer?: Customer;
  quoteRequest?: QuoteRequest | null;
}

// ---------- Component ----------
export function CustomerQuoteDetail() {
  const { params, navigate, pushToast } = useAppStore();
  const id = params?.id;

  const [quote, setQuote] = useState<Quotation | null>(null);
  const [loading, setLoading] = useState(true);
  const [actioning, setActioning] = useState<'accept' | 'reject' | null>(null);
  const [confirm, setConfirm] = useState<'accept' | 'reject' | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await apiClient.get<Quotation>(`/quotations/${id}`);
      setQuote(res);
    } catch (e: any) {
      pushToast({ message: e.message ?? 'Failed to load quotation.', type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [id, pushToast]);

  useEffect(() => { load(); }, [load]);

  const handleAction = async (action: 'accept' | 'reject') => {
    if (!quote) return;
    setActioning(action);
    try {
      const res = await apiClient.patch<{ order?: { id: string; orderNumber: string } }>(`/quotations/${quote.id}`, { action });
      if (action === 'accept') {
        pushToast({
          title: 'Quotation accepted',
          message: `Order ${res.order?.orderNumber ?? ''} has been created.`,
          type: 'success',
        });
        if (res.order?.id) navigate('customer-order-detail', { id: res.order.id });
        else navigate('customer-orders');
      } else {
        pushToast({ message: 'Quotation declined.', type: 'info' });
        setConfirm(null);
        load();
      }
    } catch (e: any) {
      pushToast({ message: e.message ?? 'Action failed.', type: 'error' });
    } finally {
      setActioning(null);
    }
  };

  if (loading) {
    return (
      <CustomerLayout>
        <div className="space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-32 rounded-2xl" />
          <Skeleton className="h-64 rounded-2xl" />
        </div>
      </CustomerLayout>
    );
  }

  if (!quote) {
    return (
      <CustomerLayout>
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <FileText className="mx-auto mb-3 h-8 w-8 text-slate-400" />
          <h3 className="text-base font-bold text-navy">Quotation not found</h3>
          <Button variant="accent" size="sm" className="mt-4" onClick={() => navigate('customer-quotations')}>
            Back to quotations
          </Button>
        </div>
      </CustomerLayout>
    );
  }

  const isActionable = ['SENT', 'CUSTOMER_VIEWED'].includes(quote.status);
  const isAccepted = quote.status === 'CUSTOMER_ACCEPTED';
  const isRejected = quote.status === 'CUSTOMER_REJECTED';
  const isExpired = quote.status === 'EXPIRED' || new Date(quote.validUntil) < new Date();

  return (
    <CustomerLayout>
      {/* Back */}
      <button
        onClick={() => navigate('customer-quotations')}
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-bold text-slate-500 hover:text-navy"
      >
        <ArrowLeft className="h-4 w-4" /> Back to quotations
      </button>

      {/* Header */}
      <div className="mb-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <Eyebrow>Quotation</Eyebrow>
            <div className="mt-1 flex items-center gap-2">
              <h1 className="text-2xl font-extrabold text-navy">{quote.quoteNumber}</h1>
              <StatusBadge status={quote.status} />
            </div>
            {quote.quoteRequest && (
              <p className="mt-1 text-sm text-slate-600">
                For: <span className="font-semibold">{quote.quoteRequest.subject}</span>
                {quote.quoteRequest.requestNumber ? ` · ${quote.quoteRequest.requestNumber}` : ''}
              </p>
            )}
          </div>
          <div className="text-right text-xs text-slate-500">
            <p className="flex items-center justify-end gap-1"><Calendar className="h-3 w-3" /> Created {formatDate(quote.createdAt)}</p>
            <p className="mt-1 flex items-center justify-end gap-1">
              <Clock className="h-3 w-3" />
              Valid until <span className={`font-bold ${isExpired ? 'text-rose-600' : 'text-navy'}`}>{formatDate(quote.validUntil)}</span>
            </p>
          </div>
        </div>

        {/* Customer info */}
        {quote.customer && (
          <div className="mt-4 grid grid-cols-1 gap-3 rounded-xl bg-slate-50 p-3 text-xs sm:grid-cols-3">
            <div className="flex items-center gap-2">
              <UserIcon className="h-4 w-4 text-slate-400" />
              <div>
                <p className="text-[0.65rem] uppercase tracking-wide text-slate-400">Billed To</p>
                <p className="font-semibold text-navy">
                  {quote.customer.businessName || `${quote.customer.firstName} ${quote.customer.lastName}`}
                </p>
              </div>
            </div>
            <div>
              <p className="text-[0.65rem] uppercase tracking-wide text-slate-400">Customer No.</p>
              <p className="font-semibold text-navy">{quote.customer.customerNumber}</p>
            </div>
            {quote.quoteRequest?.service && (
              <div>
                <p className="text-[0.65rem] uppercase tracking-wide text-slate-400">Service</p>
                <p className="font-semibold text-navy">{quote.quoteRequest.service.name}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Items table */}
      <div className="mb-4 rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="text-base font-bold text-navy">Line Items</h2>
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
              {quote.items.map((it) => (
                <TableRow key={it.id}>
                  <TableCell className="pl-5 max-w-xs text-slate-700">
                    <span className="line-clamp-2">{it.description}</span>
                  </TableCell>
                  <TableCell className="text-right text-slate-600">{toNumber(it.quantity)}</TableCell>
                  <TableCell className="text-right text-slate-600"><Money amount={it.unitPrice} /></TableCell>
                  <TableCell className="text-right text-slate-600">{toNumber(it.discount) > 0 ? <Money amount={it.discount} /> : '—'}</TableCell>
                  <TableCell className="pr-5 text-right font-bold text-navy"><Money amount={it.lineTotal} /></TableCell>
                </TableRow>
              ))}
              {quote.items.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="py-6 text-center text-sm text-slate-400">No line items.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Totals + Notes */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Notes & terms */}
        <div className="space-y-3 lg:col-span-2">
          {quote.notes && (
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="mb-2 text-sm font-bold uppercase tracking-wide text-slate-500">Notes</h3>
              <p className="text-sm text-slate-700 whitespace-pre-line">{quote.notes}</p>
            </div>
          )}
          {quote.terms && (
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="mb-2 text-sm font-bold uppercase tracking-wide text-slate-500">Terms &amp; Conditions</h3>
              <p className="text-sm text-slate-700 whitespace-pre-line">{quote.terms}</p>
            </div>
          )}
          {!quote.notes && !quote.terms && (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-5 text-center text-sm text-slate-400">
              No additional notes or terms.
            </div>
          )}
        </div>

        {/* Totals */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-500">Summary</h3>
          <div className="space-y-2 text-sm">
            <Row label="Subtotal" value={<Money amount={quote.subtotal} />} />
            {toNumber(quote.discount) > 0 && (
              <Row label="Discount" value={<span className="text-rose-600">- <Money amount={quote.discount} /></span>} />
            )}
            {toNumber(quote.tax) > 0 && <Row label="Tax" value={<Money amount={quote.tax} />} />}
            <div className="mt-2 border-t border-slate-200 pt-2">
              <Row label={<span className="text-base font-extrabold text-navy">Total</span>} value={<span className="text-lg font-extrabold text-navy"><Money amount={quote.total} /></span>} />
            </div>
          </div>

          {/* Actions */}
          <div className="mt-4 space-y-2">
            {isActionable && !isExpired && (
              <>
                <Button variant="accent" size="md" className="w-full" disabled={actioning !== null} onClick={() => setConfirm('accept')}>
                  {actioning === 'accept' ? <><Loader2 className="h-4 w-4 animate-spin" /> Processing...</> : <><CheckCircle2 className="h-4 w-4" /> Accept Quotation</>}
                </Button>
                <Button variant="ghost" size="md" className="w-full" disabled={actioning !== null} onClick={() => setConfirm('reject')}>
                  {actioning === 'reject' ? <><Loader2 className="h-4 w-4 animate-spin" /> Declining...</> : <><XCircle className="h-4 w-4" /> Decline</>}
                </Button>
              </>
            )}
            {isAccepted && (
              <div className="rounded-xl bg-emerald-50 p-3 text-center text-xs font-semibold text-emerald-700">
                <CheckCircle2 className="mx-auto mb-1 h-5 w-5" /> Accepted on {quote.approvedAt ? formatDate(quote.approvedAt) : formatDate(quote.createdAt)}
                <div className="mt-2">
                  <Button variant="primary" size="sm" className="w-full" onClick={() => navigate('customer-orders')}>
                    <ShoppingCart className="h-4 w-4" /> View My Orders
                  </Button>
                </div>
              </div>
            )}
            {isRejected && (
              <div className="rounded-xl bg-rose-50 p-3 text-center text-xs font-semibold text-rose-700">
                <XCircle className="mx-auto mb-1 h-5 w-5" /> This quotation was declined.
              </div>
            )}
            {isExpired && !isAccepted && !isRejected && (
              <div className="rounded-xl bg-slate-100 p-3 text-center text-xs font-semibold text-slate-500">
                <Clock className="mx-auto mb-1 h-5 w-5" /> This quotation has expired. Please request a new one.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Confirm dialog */}
      <Dialog open={!!confirm} onOpenChange={(open) => !open && setConfirm(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-navy">
              {confirm === 'accept' ? 'Accept this quotation?' : 'Decline this quotation?'}
            </DialogTitle>
            <DialogDescription>
              {confirm === 'accept'
                ? 'Accepting will create a new order and redirect you to it. A 50% deposit will be required to begin production.'
                : 'Declining will close this quotation. You can request a new one if needed.'}
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-xl bg-slate-50 p-3 text-xs">
            <div className="flex justify-between"><span className="text-slate-500">Quotation</span><span className="font-bold text-navy">{quote.quoteNumber}</span></div>
            <div className="mt-1 flex justify-between"><span className="text-slate-500">Total</span><span className="font-bold text-navy"><Money amount={quote.total} /></span></div>
          </div>
          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => setConfirm(null)} disabled={actioning !== null}>Cancel</Button>
            <Button
              variant={confirm === 'accept' ? 'accent' : 'danger'}
              size="sm"
              disabled={actioning !== null}
              onClick={() => confirm && handleAction(confirm)}
            >
              {actioning ? 'Processing...' : confirm === 'accept' ? 'Accept & Create Order' : 'Decline Quotation'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </CustomerLayout>
  );
}

export default CustomerQuoteDetail;

// ---------- Sub components ----------
function Row({ label, value }: { label: React.ReactNode; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-slate-500">{label}</span>
      <span className="text-navy">{value}</span>
    </div>
  );
}
