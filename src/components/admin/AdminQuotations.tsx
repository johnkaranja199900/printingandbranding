'use client';

import { useEffect, useState, useCallback } from 'react';
import { AdminLayout } from '@/components/shared/AdminLayout';
import { apiClient } from '@/lib/api-client';
import { useAppStore } from '@/stores/app-store';
import { Button } from '@/components/shared/Button';
import { Money, StatusBadge, PriorityBadge, EmptyState, Eyebrow } from '@/components/shared/primitives';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatDate, timeAgo } from '@/lib/types';
import {
  FileText, Inbox, RefreshCw, Eye, ArrowRight, Clock, Building2, User, Calendar, Coins,
} from 'lucide-react';

interface QuoteRequest {
  id: string; requestNumber: string; customerId: string; serviceId: string;
  subject: string; description: string; status: string; priority: string;
  requestedDeadline?: string | null; estimatedBudget?: string | null; createdAt: string;
  customer: { id: string; firstName: string; lastName: string; businessName?: string | null; customerNumber: string };
  service: { id: string; name: string; slug: string } | null;
}

interface Quotation {
  id: string; quoteNumber: string; status: string; currency: string; subtotal: string;
  discount: string; tax: string; total: string; validUntil: string; sentAt?: string | null; createdAt: string;
  customer: { id: string; firstName: string; lastName: string; businessName?: string | null; customerNumber: string };
  quoteRequest?: { requestNumber: string; subject: string } | null;
}

const REQUEST_STATUSES = ['SUBMITTED', 'UNDER_REVIEW', 'PRICING', 'QUOTED', 'APPROVED', 'REJECTED', 'CANCELLED', 'EXPIRED'];
const QUOTE_STATUSES = ['SENT', 'CUSTOMER_VIEWED', 'CUSTOMER_ACCEPTED', 'CUSTOMER_REJECTED', 'EXPIRED', 'CANCELLED'];

export function AdminQuotations() {
  const { navigate, pushToast } = useAppStore();
  const [tab, setTab] = useState<'requests' | 'quotations'>('requests');
  const [requests, setRequests] = useState<QuoteRequest[]>([]);
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [requestStatus, setRequestStatus] = useState<string>('all');
  const [quoteStatus, setQuoteStatus] = useState<string>('all');

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams({ pageSize: '50' });
      if (requestStatus !== 'all') qs.set('status', requestStatus);
      const r = await apiClient.get<{ data: QuoteRequest[] }>(`/quote-requests?${qs.toString()}`) as any;
      setRequests(r?.data ?? []);
    } catch (e: any) {
      pushToast({ message: e.message ?? 'Failed to load requests', type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [requestStatus]);

  const fetchQuotations = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams({ pageSize: '50' });
      if (quoteStatus !== 'all') qs.set('status', quoteStatus);
      const r = await apiClient.get<{ data: Quotation[] }>(`/quotations?${qs.toString()}`) as any;
      setQuotations(r?.data ?? []);
    } catch (e: any) {
      pushToast({ message: e.message ?? 'Failed to load quotations', type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [quoteStatus]);

  useEffect(() => {
    if (tab === 'requests') fetchRequests();
    else fetchQuotations();
  }, [tab, fetchRequests, fetchQuotations]);

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Eyebrow>Sales Pipeline</Eyebrow>
            <h1 className="mt-1 text-2xl font-extrabold text-navy sm:text-3xl">Quotations</h1>
            <p className="mt-1 text-sm text-slate-500">Manage incoming quote requests and send quotations to customers.</p>
          </div>
          <Button variant="ghost" size="md" onClick={() => (tab === 'requests' ? fetchRequests() : fetchQuotations())} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </Button>
        </div>

        <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="requests" className="gap-2"><Inbox className="h-4 w-4" /> Quote Requests</TabsTrigger>
            <TabsTrigger value="quotations" className="gap-2"><FileText className="h-4 w-4" /> Quotations</TabsTrigger>
          </TabsList>

          {/* Requests tab */}
          <TabsContent value="requests" className="space-y-4">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm text-slate-500">{requests.length} request{requests.length !== 1 ? 's' : ''} pending review</p>
              <Select value={requestStatus} onValueChange={setRequestStatus}>
                <SelectTrigger className="w-48"><SelectValue placeholder="Filter by status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  {REQUEST_STATUSES.map((s) => <SelectItem key={s} value={s}>{s.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase())}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {loading ? (
              <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-2xl" />)}</div>
            ) : requests.length === 0 ? (
              <EmptyState icon={<Inbox className="h-5 w-5" />} title="No quote requests" description="Customer-submitted requests will appear here." />
            ) : (
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {requests.map((r) => (
                  <Card key={r.id} className="cursor-pointer rounded-2xl transition-shadow hover:shadow-md" onClick={() => navigate('admin-quote-detail', { id: r.id })}>
                    <CardContent className="pt-5">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-bold text-gold">{r.requestNumber}</p>
                          <p className="mt-1 line-clamp-2 font-bold text-navy">{r.subject}</p>
                        </div>
                        <PriorityBadge priority={r.priority} />
                      </div>
                      <div className="mt-3 space-y-1.5 text-xs text-slate-600">
                        <p className="flex items-center gap-1.5"><User className="h-3.5 w-3.5 text-slate-400" /> {r.customer.businessName || `${r.customer.firstName} ${r.customer.lastName}`}</p>
                        <p className="flex items-center gap-1.5"><FileText className="h-3.5 w-3.5 text-slate-400" /> {r.service?.name ?? 'General'}</p>
                        {r.requestedDeadline && <p className="flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5 text-slate-400" /> Due {formatDate(r.requestedDeadline)}</p>}
                        {r.estimatedBudget && <p className="flex items-center gap-1.5"><Coins className="h-3.5 w-3.5 text-slate-400" /> Budget <Money amount={r.estimatedBudget} /></p>}
                      </div>
                      <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">
                        <StatusBadge status={r.status} />
                        <span className="flex items-center gap-1 text-xs text-slate-400"><Clock className="h-3 w-3" /> {timeAgo(r.createdAt)}</span>
                      </div>
                      <Button variant="ghost" size="sm" className="mt-2 w-full">
                        Open workspace <ArrowRight className="h-3.5 w-3.5" />
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Quotations tab */}
          <TabsContent value="quotations" className="space-y-4">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm text-slate-500">{quotations.length} quotation{quotations.length !== 1 ? 's' : ''} sent</p>
              <Select value={quoteStatus} onValueChange={setQuoteStatus}>
                <SelectTrigger className="w-48"><SelectValue placeholder="Filter by status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  {QUOTE_STATUSES.map((s) => <SelectItem key={s} value={s}>{s.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase())}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <Card className="hidden overflow-hidden rounded-2xl md:block">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50 hover:bg-slate-50">
                    <TableHead className="px-4 py-3 text-xs uppercase text-slate-500">Quote #</TableHead>
                    <TableHead className="px-4 py-3 text-xs uppercase text-slate-500">Customer</TableHead>
                    <TableHead className="px-4 py-3 text-xs uppercase text-slate-500">Request</TableHead>
                    <TableHead className="px-4 py-3 text-xs uppercase text-slate-500">Status</TableHead>
                    <TableHead className="px-4 py-3 text-xs uppercase text-slate-500">Total</TableHead>
                    <TableHead className="px-4 py-3 text-xs uppercase text-slate-500">Sent</TableHead>
                    <TableHead className="px-4 py-3 text-xs uppercase text-slate-500">Valid Until</TableHead>
                    <TableHead className="px-4 py-3 text-right text-xs uppercase text-slate-500">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>
                        {Array.from({ length: 8 }).map((_, j) => <TableCell key={j}><Skeleton className="h-5 w-full" /></TableCell>)}
                      </TableRow>
                    ))
                  ) : quotations.length === 0 ? (
                    <TableRow><TableCell colSpan={8} className="py-12"><EmptyState icon={<FileText className="h-5 w-5" />} title="No quotations yet" description="Build a quotation from a quote request to see it here." /></TableCell></TableRow>
                  ) : (
                    quotations.map((q) => (
                      <TableRow
                        key={q.id}
                        className="cursor-pointer"
                        onClick={() => navigate('admin-quote-detail', { id: q.id, type: 'quotation' })}
                      >
                        <TableCell className="px-4 py-3 font-bold text-gold">{q.quoteNumber}</TableCell>
                        <TableCell className="px-4 py-3">
                          <div className="font-semibold text-navy">{q.customer.businessName || `${q.customer.firstName} ${q.customer.lastName}`}</div>
                          <div className="text-xs text-slate-400">{q.customer.customerNumber}</div>
                        </TableCell>
                        <TableCell className="px-4 py-3 text-sm text-slate-600">{q.quoteRequest?.requestNumber ?? '—'}</TableCell>
                        <TableCell className="px-4 py-3"><StatusBadge status={q.status} /></TableCell>
                        <TableCell className="px-4 py-3 font-bold text-navy"><Money amount={q.total} /></TableCell>
                        <TableCell className="px-4 py-3 text-sm text-slate-500">{q.sentAt ? formatDate(q.sentAt) : '—'}</TableCell>
                        <TableCell className="px-4 py-3 text-sm text-slate-500">{formatDate(q.validUntil)}</TableCell>
                        <TableCell className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                          <Button variant="outline" size="sm" onClick={() => navigate('admin-quote-detail', { id: q.id, type: 'quotation' })}>
                            <Eye className="h-3.5 w-3.5" /> View
                          </Button>
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
                Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-2xl" />)
              ) : quotations.length === 0 ? (
                <EmptyState icon={<FileText className="h-5 w-5" />} title="No quotations yet" description="Build one from a quote request." />
              ) : quotations.map((q) => (
                <Card key={q.id} className="cursor-pointer rounded-2xl" onClick={() => navigate('admin-quote-detail', { id: q.id, type: 'quotation' })}>
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-bold text-gold">{q.quoteNumber}</p>
                        <p className="mt-1 font-semibold text-navy">{q.customer.businessName || `${q.customer.firstName} ${q.customer.lastName}`}</p>
                      </div>
                      <StatusBadge status={q.status} />
                    </div>
                    <div className="mt-3 flex items-center justify-between">
                      <span className="font-bold text-navy"><Money amount={q.total} /></span>
                      <span className="text-xs text-slate-400">Valid until {formatDate(q.validUntil)}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}

export default AdminQuotations;
