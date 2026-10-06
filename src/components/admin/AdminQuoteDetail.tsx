'use client';

import { useEffect, useState, useMemo } from 'react';
import { AdminLayout } from '@/components/shared/AdminLayout';
import { apiClient } from '@/lib/api-client';
import { useAppStore } from '@/stores/app-store';
import { Button, NavButton } from '@/components/shared/Button';
import { Money, StatusBadge, PriorityBadge, EmptyState, Eyebrow } from '@/components/shared/primitives';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { formatDate, toNumber } from '@/lib/types';
import {
  ArrowLeft, Plus, Trash2, User, Building2, Calendar, Coins, FileText, Send,
  CheckCircle2, Clock, Sparkles, AlertCircle, Tag, Hash, ListChecks,
} from 'lucide-react';

interface ServiceField { id: string; fieldKey: string; label: string; fieldType: string; isRequired: boolean; optionsJson?: string | null; helpText?: string | null; sortOrder: number }
interface QuoteRequestValue { id: string; valueText?: string | null; valueNumber?: number | null; valueDate?: string | null; serviceField: ServiceField }
interface Customer { id: string; firstName: string; lastName: string; businessName?: string | null; customerNumber: string; phone?: string | null; email?: string | null }
interface QuotationItem { id: string; description: string; quantity: number; unitPrice: string; discount: string; taxRate: string; lineTotal: string }
interface Quotation {
  id: string; quoteNumber: string; status: string; total: string; validUntil: string; createdAt: string; items: QuotationItem[];
}
interface QuoteRequest {
  id: string; requestNumber: string; subject: string; description: string; status: string; priority: string;
  requestedDeadline?: string | null; estimatedBudget?: string | null; createdAt: string; customerId: string;
  customer: Customer;
  service?: { id: string; name: string; slug: string; category?: { name: string } | null } | null;
  values: QuoteRequestValue[];
  quotations: Quotation[];
}

const REQUEST_STATUSES = ['SUBMITTED', 'UNDER_REVIEW', 'PRICING', 'QUOTED', 'APPROVED', 'REJECTED', 'CANCELLED', 'EXPIRED'];

interface DraftItem { description: string; quantity: string; unitPrice: string; discount: string; taxRate: string }

function defaultValidUntil() {
  const d = new Date();
  d.setDate(d.getDate() + 14);
  return d.toISOString().slice(0, 10);
}

export function AdminQuoteDetail() {
  const { params, navigate, pushToast } = useAppStore();
  const id = params.id;
  const isQuotationMode = params.type === 'quotation';

  const [request, setRequest] = useState<QuoteRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<DraftItem[]>([{ description: '', quantity: '1', unitPrice: '', discount: '0', taxRate: '0' }]);
  const [notes, setNotes] = useState('');
  const [terms, setTerms] = useState('50% deposit required to commence production. Balance due on collection.\nQuotation valid for 14 days.');
  const [validUntil, setValidUntil] = useState(defaultValidUntil());
  const [taxRate, setTaxRate] = useState('0');
  const [saving, setSaving] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState(false);

  const fetchData = async () => {
    if (!id) return;
    setLoading(true);
    try {
      if (isQuotationMode) {
        // Fetch the quotation, derive its quoteRequest
        const q: any = await apiClient.get(`/quotations/${id}`);
        const qr = q?.quoteRequest;
        if (qr) {
          const derived: QuoteRequest = {
            id: qr.id, requestNumber: qr.requestNumber, subject: qr.subject, description: qr.description,
            status: qr.status, priority: qr.priority, requestedDeadline: qr.requestedDeadline,
            estimatedBudget: qr.estimatedBudget, createdAt: qr.createdAt, customerId: qr.customerId,
            customer: q.customer, service: qr.service, values: qr.values ?? [], quotations: [{
              id: q.id, quoteNumber: q.quoteNumber, status: q.status, total: q.total, validUntil: q.validUntil,
              createdAt: q.createdAt, items: q.items ?? [],
            }],
          };
          setRequest(derived);
        } else {
          pushToast({ message: 'Quotation has no linked quote request.', type: 'warning' });
        }
      } else {
        const r = await apiClient.get<QuoteRequest>(`/quote-requests/${id}`) as any;
        setRequest(r);
      }
    } catch (e: any) {
      pushToast({ message: e.message ?? 'Failed to load quote request', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [id, isQuotationMode]);

  const totals = useMemo(() => {
    let subtotal = 0, discount = 0;
    for (const it of items) {
      const qty = Number(it.quantity) || 0;
      const price = Number(it.unitPrice) || 0;
      const disc = Number(it.discount) || 0;
      subtotal += qty * price;
      discount += disc;
    }
    const tr = Number(taxRate) || 0;
    const tax = ((subtotal - discount) * tr) / 100;
    const total = subtotal - discount + tax;
    return { subtotal, discount, tax, total };
  }, [items, taxRate]);

  const updateItem = (i: number, patch: Partial<DraftItem>) => {
    setItems((arr) => arr.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));
  };
  const addItem = () => setItems((arr) => [...arr, { description: '', quantity: '1', unitPrice: '', discount: '0', taxRate: '0' }]);
  const removeItem = (i: number) => setItems((arr) => arr.filter((_, idx) => idx !== i));

  const submitQuotation = async () => {
    if (!request) return;
    if (items.length === 0 || items.every((it) => !it.description.trim())) {
      pushToast({ message: 'Add at least one line item with a description.', type: 'warning' });
      return;
    }
    const cleanItems = items
      .filter((it) => it.description.trim())
      .map((it) => ({
        description: it.description.trim(),
        quantity: Number(it.quantity) || 1,
        unitPrice: Number(it.unitPrice) || 0,
        discount: Number(it.discount) || 0,
        taxRate: Number(it.taxRate) || Number(taxRate) || 0,
      }));
    setSaving(true);
    try {
      await apiClient.post('/quotations', {
        customerId: request.customerId,
        quoteRequestId: request.id,
        items: cleanItems,
        notes: notes.trim() || undefined,
        terms: terms.trim() || undefined,
        validUntil,
        taxRate: Number(taxRate) || 0,
      });
      pushToast({ message: 'Quotation created and sent to customer!', type: 'success' });
      // Reset form
      setItems([{ description: '', quantity: '1', unitPrice: '', discount: '0', taxRate: '0' }]);
      setNotes('');
      fetchData();
    } catch (e: any) {
      pushToast({ message: e.message ?? 'Failed to create quotation', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const updateRequestStatus = async (newStatus: string) => {
    if (!request) return;
    setStatusUpdating(true);
    try {
      await apiClient.patch(`/quote-requests/${request.id}`, { status: newStatus });
      pushToast({ message: `Request marked as ${(newStatus ?? '').replace(/_/g, ' ').toLowerCase()}.`, type: 'success' });
      fetchData();
    } catch (e: any) {
      pushToast({ message: e.message ?? 'Failed to update status', type: 'error' });
    } finally {
      setStatusUpdating(false);
    }
  };

  if (loading || !request) {
    return (
      <AdminLayout>
        <div className="space-y-4">
          <Skeleton className="h-10 w-32" />
          <div className="grid gap-6 lg:grid-cols-2">
            <Skeleton className="h-96 rounded-2xl" />
            <Skeleton className="h-96 rounded-2xl" />
          </div>
        </div>
      </AdminLayout>
    );
  }

  const customerName = request.customer.businessName || `${request.customer.firstName} ${request.customer.lastName}`.trim();

  return (
    <AdminLayout>
      <div className="space-y-6">
        <button onClick={() => navigate('admin-quotations')} className="flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-navy">
          <ArrowLeft className="h-4 w-4" /> Back to Quotations
        </button>

        {/* Header */}
        <Card className="overflow-hidden rounded-2xl">
          <div className="bg-gradient-to-br from-navy via-navy-soft to-navy p-6 text-white sm:p-8">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <Eyebrow className="text-gold">Quote Request</Eyebrow>
                <h1 className="mt-1 text-2xl font-extrabold sm:text-3xl">{request.requestNumber}</h1>
                <p className="mt-1 text-sm text-white/70">{request.subject}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <StatusBadge status={request.status} className="bg-white/10 text-white" />
                <PriorityBadge priority={request.priority} />
              </div>
            </div>
          </div>
          <CardContent className="pt-5">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-sm text-slate-500">Update request status:</span>
              <Select value={request.status} onValueChange={updateRequestStatus} disabled={statusUpdating}>
                <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {REQUEST_STATUSES.map((s) => <SelectItem key={s} value={s}>{(s ?? '').replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase())}</SelectItem>)}
                </SelectContent>
              </Select>
              {isQuotationMode && (
                <span className="ml-auto rounded-full bg-violet-100 px-3 py-1 text-xs font-bold text-violet-700">
                  Viewing as Quotation
                </span>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* LEFT: Request details + service specs */}
          <div className="space-y-6">
            <Card className="rounded-2xl">
              <CardHeader className="border-b pb-4">
                <CardTitle className="flex items-center gap-2 text-navy"><User className="h-5 w-5 text-gold" /> Customer</CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-3 text-sm">
                <DetailRow icon={<User className="h-4 w-4" />} label="Name" value={customerName} />
                <DetailRow icon={<Building2 className="h-4 w-4" />} label="Business" value={request.customer.businessName || '—'} />
                <DetailRow icon={<Tag className="h-4 w-4" />} label="Customer #" value={request.customer.customerNumber} />
                <DetailRow icon={<FileText className="h-4 w-4" />} label="Phone" value={request.customer.phone || '—'} />
              </CardContent>
            </Card>

            <Card className="rounded-2xl">
              <CardHeader className="border-b pb-4">
                <CardTitle className="flex items-center gap-2 text-navy"><Sparkles className="h-5 w-5 text-gold" /> Request Brief</CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-3 text-sm">
                <DetailRow icon={<FileText className="h-4 w-4" />} label="Service" value={request.service?.name ?? '—'} />
                {request.service?.category && <DetailRow icon={<Tag className="h-4 w-4" />} label="Category" value={request.service.category.name} />}
                <DetailRow icon={<Calendar className="h-4 w-4" />} label="Submitted" value={formatDate(request.createdAt)} />
                {request.requestedDeadline && <DetailRow icon={<Clock className="h-4 w-4" />} label="Deadline" value={formatDate(request.requestedDeadline)} />}
                {request.estimatedBudget && <DetailRow icon={<Coins className="h-4 w-4" />} label="Budget" value={<Money amount={request.estimatedBudget} />} />}
                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="mb-1 text-xs font-bold uppercase tracking-wide text-slate-500">Description</p>
                  <p className="text-sm whitespace-pre-wrap text-slate-700">{request.description}</p>
                </div>
              </CardContent>
            </Card>

            {request.values.length > 0 && (
              <Card className="rounded-2xl">
                <CardHeader className="border-b pb-4">
                  <CardTitle className="flex items-center gap-2 text-navy"><ListChecks className="h-5 w-5 text-gold" /> Service Specifications</CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  <dl className="grid gap-2.5 sm:grid-cols-2">
                    {request.values
                      .slice()
                      .sort((a, b) => (a.serviceField.sortOrder ?? 0) - (b.serviceField.sortOrder ?? 0))
                      .map((v) => (
                        <div key={v.id} className="rounded-lg border border-slate-200 p-3">
                          <dt className="text-xs font-bold uppercase tracking-wide text-slate-500">{v.serviceField.label}</dt>
                          <dd className="mt-1 text-sm font-semibold text-navy">{formatValue(v, v.serviceField.fieldType)}</dd>
                        </div>
                      ))}
                  </dl>
                </CardContent>
              </Card>
            )}

            {/* Existing quotations */}
            <Card className="rounded-2xl">
              <CardHeader className="border-b pb-4">
                <CardTitle className="flex items-center gap-2 text-navy"><FileText className="h-5 w-5 text-gold" /> Existing Quotations</CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                {request.quotations.length === 0 ? (
                  <EmptyState icon={<FileText className="h-5 w-5" />} title="No quotations yet" description="Build one on the right." />
                ) : (
                  <ul className="space-y-2">
                    {request.quotations.map((q) => (
                      <li key={q.id} className="rounded-xl border border-slate-200 p-3">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-gold">{q.quoteNumber}</span>
                          <StatusBadge status={q.status} />
                        </div>
                        <div className="mt-1 flex items-center justify-between text-xs text-slate-500">
                          <span>Sent {formatDate(q.createdAt)}</span>
                          <span className="font-bold text-navy"><Money amount={q.total} /></span>
                        </div>
                        <p className="mt-1 text-xs text-slate-400">Valid until {formatDate(q.validUntil)} · {q.items.length} item{q.items.length !== 1 ? 's' : ''}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>

          {/* RIGHT: Build quotation */}
          <Card className="sticky top-24 self-start rounded-2xl">
            <CardHeader className="border-b pb-4">
              <CardTitle className="flex items-center gap-2 text-navy"><Send className="h-5 w-5 text-gold" /> Build Quotation</CardTitle>
              <p className="text-xs text-slate-500">Add line items — totals update live. Server recalculates on submit.</p>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="space-y-3">
                {items.map((it, i) => {
                  const lineSubtotal = (Number(it.quantity) || 0) * (Number(it.unitPrice) || 0);
                  const lineTotal = lineSubtotal - (Number(it.discount) || 0);
                  return (
                    <div key={i} className="rounded-xl border border-slate-200 p-3">
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wide text-slate-500">Item #{i + 1}</span>
                        {items.length > 1 && (
                          <button onClick={() => removeItem(i)} className="text-rose-500 hover:text-rose-700"><Trash2 className="h-4 w-4" /></button>
                        )}
                      </div>
                      <Input
                        value={it.description}
                        onChange={(e) => updateItem(i, { description: e.target.value })}
                        placeholder="Description — e.g. 200 books, 100 pages, A5"
                        className="mb-2"
                      />
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <Label className="mb-1 block text-xs text-slate-500">Qty</Label>
                          <Input type="number" value={it.quantity} onChange={(e) => updateItem(i, { quantity: e.target.value })} />
                        </div>
                        <div>
                          <Label className="mb-1 block text-xs text-slate-500">Unit Price</Label>
                          <Input type="number" value={it.unitPrice} onChange={(e) => updateItem(i, { unitPrice: e.target.value })} />
                        </div>
                        <div>
                          <Label className="mb-1 block text-xs text-slate-500">Discount</Label>
                          <Input type="number" value={it.discount} onChange={(e) => updateItem(i, { discount: e.target.value })} />
                        </div>
                      </div>
                      <div className="mt-2 flex items-center justify-between text-xs">
                        <span className="text-slate-400">Line total</span>
                        <span className="font-bold text-navy">KES {lineTotal.toLocaleString()}</span>
                      </div>
                    </div>
                  );
                })}

                <Button variant="ghost" size="sm" className="w-full" onClick={addItem}>
                  <Plus className="h-4 w-4" /> Add line item
                </Button>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div>
                    <Label className="mb-1.5 block text-sm">Valid until</Label>
                    <Input type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} />
                  </div>
                  <div>
                    <Label className="mb-1.5 block text-sm">Tax rate %</Label>
                    <Input type="number" value={taxRate} onChange={(e) => setTaxRate(e.target.value)} />
                  </div>
                </div>

                <div>
                  <Label className="mb-1.5 block text-sm">Notes (optional)</Label>
                  <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Payment terms, turnaround, exclusions…" />
                </div>
                <div>
                  <Label className="mb-1.5 block text-sm">Terms & conditions</Label>
                  <Textarea rows={3} value={terms} onChange={(e) => setTerms(e.target.value)} />
                </div>

                {/* Live totals */}
                <div className="rounded-xl bg-slate-50 p-3">
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between"><span className="text-slate-500">Subtotal</span><span className="font-semibold text-navy">KES {totals.subtotal.toLocaleString()}</span></div>
                    <div className="flex justify-between"><span className="text-slate-500">Discount</span><span className="font-semibold text-rose-600">- KES {totals.discount.toLocaleString()}</span></div>
                    <div className="flex justify-between"><span className="text-slate-500">Tax ({taxRate}%)</span><span className="font-semibold text-navy">KES {totals.tax.toLocaleString()}</span></div>
                    <div className="flex justify-between border-t pt-1.5 text-base"><span className="font-bold text-navy">Total</span><span className="font-extrabold text-gold">KES {Math.round(totals.total).toLocaleString()}</span></div>
                  </div>
                </div>

                <Button variant="accent" size="lg" className="w-full" onClick={submitQuotation} disabled={saving}>
                  <Send className="h-4 w-4" /> {saving ? 'Sending…' : 'Create & Send Quotation'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}

function DetailRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="flex items-center gap-2 text-slate-500">{icon} {label}</span>
      <span className="text-right font-semibold text-navy">{value}</span>
    </div>
  );
}

function formatValue(v: QuoteRequestValue, fieldType: string): string {
  if (fieldType === 'NUMBER' || fieldType === 'DECIMAL') {
    return v.valueNumber != null ? String(v.valueNumber) : '—';
  }
  if (fieldType === 'DATE') {
    return v.valueDate ? formatDate(v.valueDate) : '—';
  }
  if (fieldType === 'CHECKBOX' && v.valueText) {
    try { return JSON.parse(v.valueText).join(', '); } catch { return v.valueText; }
  }
  return v.valueText ?? '—';
}

export default AdminQuoteDetail;
