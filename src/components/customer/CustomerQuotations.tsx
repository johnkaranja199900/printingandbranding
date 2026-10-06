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
  FileText, CheckCircle2, XCircle, Clock, ChevronRight, Search,
} from 'lucide-react';

// ---------- API types ----------
interface QuotationItem { id: string; description: string; quantity: string | number; unitPrice: string | number; lineTotal: string | number; }
interface Quotation {
  id: string;
  quoteNumber: string;
  status: string;
  currency: string;
  subtotal: string | number;
  discount: string | number;
  tax: string | number;
  total: string | number;
  validUntil: string;
  sentAt: string | null;
  approvedAt: string | null;
  createdAt: string;
  items: QuotationItem[];
  quoteRequest?: { requestNumber: string; subject: string } | null;
}
interface ListResponse { data: Quotation[]; meta: { total: number; page: number; pageSize: number; totalPages: number } }

type Filter = 'all' | 'pending' | 'accepted' | 'expired';

// ---------- Component ----------
export function CustomerQuotations() {
  const { navigate, pushToast } = useAppStore();
  const [items, setItems] = useState<Quotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>('all');
  const [search, setSearch] = useState('');
  const [actioning, setActioning] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get<ListResponse>('/quotations?pageSize=50');
      setItems(res.data ?? []);
    } catch (e: any) {
      pushToast({ message: e.message ?? 'Failed to load quotations.', type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [pushToast]);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    return items.filter((q) => {
      if (filter === 'pending' && !['SENT', 'CUSTOMER_VIEWED'].includes(q.status)) return false;
      if (filter === 'accepted' && q.status !== 'CUSTOMER_ACCEPTED') return false;
      if (filter === 'expired' && q.status !== 'EXPIRED') return false;
      if (search) {
        const s = search.toLowerCase();
        const matches =
          q.quoteNumber.toLowerCase().includes(s) ||
          (q.quoteRequest?.subject ?? '').toLowerCase().includes(s);
        if (!matches) return false;
      }
      return true;
    });
  }, [items, filter, search]);

  const handleAction = async (q: Quotation, action: 'accept' | 'reject') => {
    setActioning(q.id);
    try {
      const res = await apiClient.patch<{ order?: { id: string; orderNumber: string } }>(`/quotations/${q.id}`, { action });
      if (action === 'accept') {
        pushToast({
          title: 'Quotation accepted',
          message: `Order ${res.order?.orderNumber ?? ''} created. Proceed to payment.`,
          type: 'success',
        });
        navigate('customer-orders');
      } else {
        pushToast({ message: 'Quotation declined.', type: 'info' });
        load();
      }
    } catch (e: any) {
      pushToast({ message: e.message ?? 'Action failed.', type: 'error' });
    } finally {
      setActioning(null);
    }
  };

  return (
    <CustomerLayout>
      <div className="mb-6 flex flex-col gap-1">
        <Eyebrow>Customer Portal</Eyebrow>
        <h1 className="text-2xl font-extrabold text-navy sm:text-3xl">My Quotations</h1>
        <p className="text-sm text-slate-500">Review, accept or decline the quotations we&rsquo;ve prepared for you.</p>
      </div>

      {/* Filters + search */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Tabs value={filter} onValueChange={(v) => setFilter(v as Filter)}>
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="pending">Pending</TabsTrigger>
            <TabsTrigger value="accepted">Accepted</TabsTrigger>
            <TabsTrigger value="expired">Expired</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search quote number / subject..."
            className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/20"
          />
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-40 rounded-2xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<FileText className="h-5 w-5" />}
          title="No quotations found"
          description="When we prepare a quotation for your quote request, it will appear here."
          action={<Button variant="accent" size="sm" onClick={() => navigate('quote')}>Request a Quote</Button>}
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {filtered.map((q) => {
            const isActionable = ['SENT', 'CUSTOMER_VIEWED'].includes(q.status);
            const isAccepted = q.status === 'CUSTOMER_ACCEPTED';
            const isExpired = q.status === 'EXPIRED' || new Date(q.validUntil) < new Date();
            return (
              <div
                key={q.id}
                className="group cursor-pointer rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
                onClick={() => navigate('customer-quote-detail', { id: q.id })}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-navy">{q.quoteNumber}</span>
                      <StatusBadge status={q.status} />
                    </div>
                    <p className="mt-1 truncate text-sm text-slate-600">
                      {q.quoteRequest?.subject ?? 'Quotation'}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-400">
                      {q.quoteRequest?.requestNumber ?? ''} · {formatDate(q.createdAt)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-extrabold text-navy"><Money amount={q.total} /></p>
                    <p className="text-xs text-slate-500">{q.items?.length ?? 0} item(s)</p>
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3 text-xs">
                  <div className="flex items-center gap-1.5 text-slate-500">
                    <Clock className="h-3.5 w-3.5" />
                    Valid until <span className="font-semibold text-navy">{formatDate(q.validUntil)}</span>
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-400 transition-transform group-hover:translate-x-0.5" />
                </div>

                {/* Action footer */}
                {isActionable && (
                  <div className="mt-3 flex gap-2" onClick={(e) => e.stopPropagation()}>
                    <Button
                      variant="accent" size="sm"
                      disabled={actioning === q.id}
                      onClick={() => handleAction(q, 'accept')}
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      {actioning === q.id ? 'Processing...' : 'Accept'}
                    </Button>
                    <Button
                      variant="ghost" size="sm"
                      disabled={actioning === q.id}
                      onClick={() => handleAction(q, 'reject')}
                    >
                      <XCircle className="h-4 w-4" /> Reject
                    </Button>
                  </div>
                )}
                {isAccepted && (
                  <div className="mt-3 flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">
                    <CheckCircle2 className="h-4 w-4" /> Accepted — view the resulting order
                  </div>
                )}
                {isExpired && !isAccepted && (
                  <div className="mt-3 flex items-center gap-2 rounded-xl bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-500">
                    <Clock className="h-4 w-4" /> This quotation has expired.
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </CustomerLayout>
  );
}

export default CustomerQuotations;
