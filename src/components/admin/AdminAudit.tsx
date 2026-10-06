'use client';

import { useEffect, useState, Fragment } from 'react';
import { AdminLayout } from '@/components/shared/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/shared/Button';
import { EmptyState } from '@/components/shared/primitives';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useAppStore } from '@/stores/app-store';
import { apiClient } from '@/lib/api-client';
import { cn } from '@/lib/utils';
import { formatDate } from '@/lib/types';
import {
  Shield, Search, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, History,
} from 'lucide-react';

interface AuditEntry {
  id: string;
  actorId: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  oldValuesJson: string | null;
  newValuesJson: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
  actor?: { name: string; email: string } | null;
}

interface AuditResponse {
  data: AuditEntry[];
  meta: { page: number; pageSize: number; total: number; totalPages: number };
}

const ACTION_OPTIONS = [
  { value: 'all', label: 'All actions' },
  { value: 'auth.login', label: 'auth.login' },
  { value: 'auth.logout', label: 'auth.logout' },
  { value: 'staff.created', label: 'staff.created' },
  { value: 'staff.updated', label: 'staff.updated' },
  { value: 'quotation.created', label: 'quotation.created' },
  { value: 'quotation.sent', label: 'quotation.sent' },
  { value: 'quotation.approved', label: 'quotation.approved' },
  { value: 'order.created', label: 'order.created' },
  { value: 'order.updated', label: 'order.updated' },
  { value: 'order.status_changed', label: 'order.status_changed' },
  { value: 'payment.recorded', label: 'payment.recorded' },
  { value: 'inventory.adjusted', label: 'inventory.adjusted' },
  { value: 'quote_request.created', label: 'quote_request.created' },
];

const ACTION_COLOR: Record<string, string> = {
  'auth.login': 'bg-emerald-100 text-emerald-700',
  'auth.logout': 'bg-slate-100 text-slate-700',
  'created': 'bg-sky-100 text-sky-700',
  'updated': 'bg-amber-100 text-amber-700',
  'deleted': 'bg-rose-100 text-rose-700',
};

function actionColor(action: string): string {
  if (ACTION_COLOR[action]) return ACTION_COLOR[action];
  if (action.includes('created')) return ACTION_COLOR.created;
  if (action.includes('updated')) return ACTION_COLOR.updated;
  if (action.includes('deleted')) return ACTION_COLOR.deleted;
  return 'bg-slate-100 text-slate-700';
}

export default function AdminAudit() {
  const { pushToast } = useAppStore();
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [meta, setMeta] = useState({ page: 1, pageSize: 15, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [action, setAction] = useState('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => { setPage(1); }, [action, search]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), pageSize: '15' });
    if (action !== 'all') params.set('action', action);
    apiClient.get<AuditResponse>(`/admin/audit?${params.toString()}`)
      .then((d: any) => {
        if (!active) return;
        let list: AuditEntry[] = d?.data ?? [];
        if (search.trim()) {
          const q = search.toLowerCase();
          list = list.filter(e =>
            e.action.toLowerCase().includes(q) ||
            e.entityType.toLowerCase().includes(q) ||
            (e.actor?.name ?? '').toLowerCase().includes(q) ||
            (e.actor?.email ?? '').toLowerCase().includes(q),
          );
        }
        setEntries(list);
        setMeta(d?.meta ?? { page: 1, pageSize: 15, total: list.length, totalPages: 1 });
      })
      .catch((e: any) => pushToast({ message: e?.message ?? 'Failed to load audit log.', type: 'error' }))
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [action, page, search]);

  const toggle = (id: string) => setExpanded(prev => prev === id ? null : id);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-xs font-bold uppercase tracking-[0.18em] text-gold">Admin · Audit Log</div>
            <h1 className="mt-1 text-2xl font-extrabold text-navy sm:text-3xl">Audit Log</h1>
            <p className="mt-1 text-sm text-slate-500">Complete traceability of every action across the system.</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-2">
            <p className="text-xs text-slate-500">Total events</p>
            <p className="text-lg font-extrabold text-navy">{meta.total.toLocaleString()}</p>
          </div>
        </div>

        <Card className="border-slate-200">
          <CardHeader className="border-b border-slate-100">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle className="flex items-center gap-2 text-navy"><Shield className="h-4 w-4 text-gold" /> Activity</CardTitle>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    placeholder="Search actor, action, entity..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-9 sm:w-72"
                  />
                </div>
                <Select value={action} onValueChange={setAction}>
                  <SelectTrigger className="w-full sm:w-56">
                    <SelectValue placeholder="Filter by action" />
                  </SelectTrigger>
                  <SelectContent>
                    {ACTION_OPTIONS.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="space-y-2 p-4">
                {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : entries.length === 0 ? (
              <div className="p-6">
                <EmptyState icon={<History className="h-5 w-5" />} title="No audit entries found" description="Try adjusting your filters." />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead className="w-10" />
                    <TableHead>Timestamp</TableHead>
                    <TableHead>Actor</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Entity</TableHead>
                    <TableHead className="hidden md:table-cell">IP</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entries.map((e) => {
                    const isOpen = expanded === e.id;
                    const hasDiff = Boolean(e.oldValuesJson || e.newValuesJson);
                    return (
                      <Fragment key={e.id}>
                        <TableRow className={cn('cursor-pointer', isOpen && 'bg-slate-50')} onClick={() => hasDiff && toggle(e.id)}>
                          <TableCell className="text-slate-400">
                            {hasDiff && (isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />)}
                          </TableCell>
                          <TableCell className="text-xs text-slate-600">
                            <div className="font-semibold text-navy">{formatDate(e.createdAt, true)}</div>
                          </TableCell>
                          <TableCell>
                            <div className="font-semibold text-navy">{e.actor?.name ?? 'System'}</div>
                            <div className="text-xs text-slate-500">{e.actor?.email ?? '—'}</div>
                          </TableCell>
                          <TableCell>
                            <span className={cn('inline-flex items-center rounded-md px-2 py-0.5 text-xs font-bold', actionColor(e.action))}>
                              {e.action}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="font-semibold text-navy">{e.entityType}</div>
                            {e.entityId && <div className="text-xs text-slate-500 font-mono truncate max-w-[160px]">{e.entityId}</div>}
                          </TableCell>
                          <TableCell className="hidden md:table-cell font-mono text-xs text-slate-500">{e.ipAddress ?? '—'}</TableCell>
                        </TableRow>
                        {isOpen && hasDiff && (
                          <TableRow>
                            <TableCell colSpan={6} className="bg-slate-50 p-4">
                              <div className="grid gap-4 md:grid-cols-2">
                                <DiffBlock title="Old Values" json={e.oldValuesJson} tone="rose" />
                                <DiffBlock title="New Values" json={e.newValuesJson} tone="emerald" />
                              </div>
                              {e.userAgent && (
                                <div className="mt-3 rounded-lg border border-slate-200 bg-white p-3">
                                  <p className="text-xs font-bold uppercase tracking-wide text-slate-500">User Agent</p>
                                  <p className="mt-1 break-all font-mono text-xs text-slate-600">{e.userAgent}</p>
                                </div>
                              )}
                            </TableCell>
                          </TableRow>
                        )}
                      </Fragment>
                    );
                  })}
                </TableBody>
              </Table>
            )}

            {/* Pagination */}
            {!loading && meta.totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-slate-100 p-4">
                <p className="text-xs text-slate-500">Page {meta.page} of {meta.totalPages} · {meta.total} events</p>
                <div className="flex items-center gap-2">
                  <Button variant="light" size="sm" disabled={meta.page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}>
                    <ChevronLeft className="h-4 w-4" /> Prev
                  </Button>
                  <Button variant="light" size="sm" disabled={meta.page >= meta.totalPages} onClick={() => setPage(p => Math.min(meta.totalPages, p + 1))}>
                    Next <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}

function DiffBlock({ title, json, tone }: { title: string; json: string | null; tone: 'rose' | 'emerald' }) {
  let pretty = '—';
  try {
    if (json) pretty = JSON.stringify(JSON.parse(json), null, 2);
  } catch {
    pretty = json ?? '—';
  }
  const styles = tone === 'rose' ? 'border-rose-200 bg-rose-50/40' : 'border-emerald-200 bg-emerald-50/40';
  const labelStyle = tone === 'rose' ? 'text-rose-700' : 'text-emerald-700';
  return (
    <div className={cn('rounded-lg border p-3', styles)}>
      <p className={cn('text-xs font-bold uppercase tracking-wide', labelStyle)}>{title}</p>
      <pre className="mt-1 max-h-48 overflow-auto whitespace-pre-wrap break-words font-mono text-xs text-slate-700">{pretty}</pre>
    </div>
  );
}
