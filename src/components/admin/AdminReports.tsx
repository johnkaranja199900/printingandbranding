'use client';

import { useEffect, useState, useMemo } from 'react';
import { AdminLayout } from '@/components/shared/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/shared/Button';
import { Money, EmptyState } from '@/components/shared/primitives';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useAppStore } from '@/stores/app-store';
import { apiClient } from '@/lib/api-client';
import { cn } from '@/lib/utils';
import { formatDate, toNumber } from '@/lib/types';
import {
  BarChart3, TrendingUp, ShoppingCart, FileText, Boxes, BookOpen, Download, FileSpreadsheet,
  ArrowDownUp, Users, Wallet, ArrowDown,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts';

interface ReportData {
  period: { from: string; to: string };
  summary: {
    totalRevenue: number;
    totalOrders: number;
    quotationCount: number;
    quotationConversion: number;
    outstanding: number;
  };
  salesByCategory: { name: string; value: number }[];
  salesByMethod: { name: string; count: number; total: number }[];
  outstandingByCustomer: { customer: string; customerNumber: string; totalDue: number; orderCount: number }[];
  staffPerf: { name: string; role: string; assignedOrders: number; completed: number; inProgress: number }[];
  inventoryValue: number;
  booksPublished: number;
  recentPayments: any[];
}

const CHART_COLORS = ['#0f172a', '#b8860b', '#15803d', '#b45309', '#6d28d9', '#0369a1', '#be185d'];
const PERIOD_OPTIONS = [
  { value: '7', label: 'Last 7 days' },
  { value: '30', label: 'Last 30 days' },
  { value: '90', label: 'Last 90 days' },
  { value: '365', label: 'Last 12 months' },
];

export default function AdminReports() {
  const { pushToast } = useAppStore();
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('30');
  const [outstandingSort, setOutstandingSort] = useState<'desc' | 'asc'>('desc');

  useEffect(() => {
    let active = true;
    setLoading(true);
    const days = parseInt(period, 10);
    const to = new Date();
    const from = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const params = new URLSearchParams({
      from: from.toISOString(),
      to: to.toISOString(),
    });
    apiClient.get<ReportData>(`/admin/reports?${params.toString()}`)
      .then((d: any) => { if (active) setData(d); })
      .catch((e: any) => pushToast({ message: e?.message ?? 'Failed to load reports.', type: 'error' }))
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [period]);

  const sortedOutstanding = useMemo(() => {
    if (!data) return [];
    const list = [...data.outstandingByCustomer];
    list.sort((a, b) => outstandingSort === 'desc' ? b.totalDue - a.totalDue : a.totalDue - b.totalDue);
    return list;
  }, [data, outstandingSort]);

  const exportCsv = () => {
    if (!data) return;
    const rows: string[] = [];
    rows.push('Section,Key,Value');
    rows.push(`Summary,Total Revenue,KES ${data.summary.totalRevenue}`);
    rows.push(`Summary,Total Orders,${data.summary.totalOrders}`);
    rows.push(`Summary,Quotation Count,${data.summary.quotationCount}`);
    rows.push(`Summary,Quotation Conversion,${data.summary.quotationConversion}%`);
    rows.push(`Summary,Outstanding,KES ${data.summary.outstanding}`);
    rows.push(`Summary,Inventory Value,KES ${data.inventoryValue}`);
    rows.push(`Summary,Books Published,${data.booksPublished}`);
    rows.push('');
    rows.push('Sales by Category,Category,Value');
    data.salesByCategory.forEach(c => rows.push(`SalesByCategory,${c.name},${c.value}`));
    rows.push('');
    rows.push('Sales by Method,Method,Count,Total');
    data.salesByMethod.forEach(m => rows.push(`SalesByMethod,${m.name},${m.count},${m.total}`));
    rows.push('');
    rows.push('Outstanding by Customer,Customer,Number,Total Due,Order Count');
    sortedOutstanding.forEach(o => rows.push(`Outstanding,${o.customer},${o.customerNumber},${o.totalDue},${o.orderCount}`));
    rows.push('');
    rows.push('Staff Performance,Name,Role,Assigned,Completed,In Progress,Completion Rate %');
    data.staffPerf.forEach(s => {
      const rate = s.assignedOrders ? Math.round((s.completed / s.assignedOrders) * 100) : 0;
      rows.push(`Staff,${s.name},${s.role},${s.assignedOrders},${s.completed},${s.inProgress},${rate}`);
    });

    const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `report-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    pushToast({ message: 'Report exported as CSV.', type: 'success' });
  };

  const exportPdf = () => {
    pushToast({ message: 'PDF export coming soon — use your browser\'s print dialog (Ctrl/Cmd + P) in the meantime.', type: 'info' });
    setTimeout(() => window.print(), 400);
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-xs font-bold uppercase tracking-[0.18em] text-gold">Admin · Reports</div>
            <h1 className="mt-1 text-2xl font-extrabold text-navy sm:text-3xl">Business Reports</h1>
            <p className="mt-1 text-sm text-slate-500">Comprehensive analytics across revenue, sales, staff performance and outstanding balances.</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="w-full sm:w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                {PERIOD_OPTIONS.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button variant="light" size="md" onClick={exportCsv}>
              <FileSpreadsheet className="h-4 w-4" /> CSV
            </Button>
            <Button variant="primary" size="md" onClick={exportPdf}>
              <Download className="h-4 w-4" /> PDF
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
              {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-28 w-full rounded-2xl" />)}
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              <Skeleton className="h-80 w-full rounded-2xl" />
              <Skeleton className="h-80 w-full rounded-2xl" />
            </div>
          </div>
        ) : !data ? (
          <EmptyState icon={<BarChart3 className="h-5 w-5" />} title="No report data" description="Try a different period." />
        ) : (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
              <KpiCard icon={<TrendingUp className="h-5 w-5" />} label="Total Revenue" value={<Money amount={data.summary.totalRevenue} />} accent="navy" />
              <KpiCard icon={<ShoppingCart className="h-5 w-5" />} label="Total Orders" value={data.summary.totalOrders.toString()} accent="gold" />
              <KpiCard icon={<FileText className="h-5 w-5" />} label="Conversion" value={`${data.summary.quotationConversion}%`} accent="emerald" />
              <KpiCard icon={<Wallet className="h-5 w-5" />} label="Outstanding" value={<Money amount={data.summary.outstanding} />} accent="rose" />
              <KpiCard icon={<Boxes className="h-5 w-5" />} label="Inventory Value" value={<Money amount={data.inventoryValue} />} accent="amber" />
              <KpiCard icon={<BookOpen className="h-5 w-5" />} label="Books Published" value={data.booksPublished.toString()} accent="violet" />
            </div>

            {/* Charts */}
            <div className="grid gap-4 lg:grid-cols-2">
              <Card className="border-slate-200">
                <CardHeader className="border-b border-slate-100">
                  <CardTitle className="flex items-center gap-2 text-navy"><BarChart3 className="h-4 w-4 text-gold" /> Sales by Category</CardTitle>
                  <CardDescription>Revenue attribution by service category.</CardDescription>
                </CardHeader>
                <CardContent className="pt-4">
                  {data.salesByCategory.length === 0 ? (
                    <EmptyState title="No sales data" description="No payments recorded in this period." />
                  ) : (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={data.salesByCategory} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                        <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-15} textAnchor="end" height={50} stroke="#64748b" />
                        <YAxis tick={{ fontSize: 11 }} stroke="#64748b" />
                        <Tooltip
                          formatter={(v: any) => [`KES ${Number(v).toLocaleString()}`, 'Revenue']}
                          contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }}
                        />
                        <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                          {data.salesByCategory.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>

              <Card className="border-slate-200">
                <CardHeader className="border-b border-slate-100">
                  <CardTitle className="flex items-center gap-2 text-navy"><BarChart3 className="h-4 w-4 text-gold" /> Sales by Payment Method</CardTitle>
                  <CardDescription>Distribution of payments across methods.</CardDescription>
                </CardHeader>
                <CardContent className="pt-4">
                  {data.salesByMethod.length === 0 ? (
                    <EmptyState title="No payment data" description="No payments recorded in this period." />
                  ) : (
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={data.salesByMethod}
                          dataKey="total"
                          nameKey="name"
                          cx="50%"
                          cy="45%"
                          outerRadius={90}
                          innerRadius={45}
                          paddingAngle={2}
                        >
                          {data.salesByMethod.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                        </Pie>
                        <Tooltip
                          formatter={(v: any, n: any, p: any) => [`KES ${Number(v).toLocaleString()} (${p?.payload?.count} payments)`, p?.payload?.name]}
                          contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }}
                        />
                        <Legend wrapperStyle={{ fontSize: 12 }} />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Outstanding by Customer */}
            <Card className="border-slate-200">
              <CardHeader className="border-b border-slate-100">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <CardTitle className="flex items-center gap-2 text-navy"><Wallet className="h-4 w-4 text-gold" /> Outstanding by Customer</CardTitle>
                  <Button variant="ghost" size="sm" onClick={() => setOutstandingSort(s => s === 'desc' ? 'asc' : 'desc')}>
                    <ArrowDownUp className="h-3.5 w-3.5" /> Sort by due ({outstandingSort === 'desc' ? 'high→low' : 'low→high'})
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {sortedOutstanding.length === 0 ? (
                  <div className="p-6"><EmptyState icon={<Wallet className="h-5 w-5" />} title="No outstanding balances" description="All customers are settled in full. 🎉" /></div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50">
                        <TableHead>Customer</TableHead>
                        <TableHead className="hidden md:table-cell">Customer #</TableHead>
                        <TableHead className="text-right">Orders</TableHead>
                        <TableHead className="text-right">Total Due</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sortedOutstanding.map(o => (
                        <TableRow key={o.customerNumber}>
                          <TableCell className="font-bold text-navy">{o.customer}</TableCell>
                          <TableCell className="hidden md:table-cell font-mono text-xs text-slate-500">{o.customerNumber}</TableCell>
                          <TableCell className="text-right text-slate-700">{o.orderCount}</TableCell>
                          <TableCell className="text-right font-bold text-rose-600"><Money amount={o.totalDue} /></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            {/* Staff Performance */}
            <Card className="border-slate-200">
              <CardHeader className="border-b border-slate-100">
                <CardTitle className="flex items-center gap-2 text-navy"><Users className="h-4 w-4 text-gold" /> Staff Performance</CardTitle>
                <CardDescription>Order throughput and completion rate by staff member.</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {data.staffPerf.length === 0 ? (
                  <div className="p-6"><EmptyState title="No staff performance data" /></div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50">
                        <TableHead>Staff</TableHead>
                        <TableHead className="hidden md:table-cell">Role</TableHead>
                        <TableHead className="text-right">Assigned</TableHead>
                        <TableHead className="text-right">Completed</TableHead>
                        <TableHead className="text-right">In Progress</TableHead>
                        <TableHead className="text-right">Completion Rate</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.staffPerf.map(s => {
                        const rate = s.assignedOrders ? Math.round((s.completed / s.assignedOrders) * 100) : 0;
                        const rateColor = rate >= 75 ? 'text-emerald-700 bg-emerald-100' : rate >= 50 ? 'text-amber-700 bg-amber-100' : 'text-rose-700 bg-rose-100';
                        return (
                          <TableRow key={s.name + s.role}>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <div className="grid h-8 w-8 place-items-center rounded-full bg-navy text-xs font-bold text-white">
                                  {s.name?.[0]?.toUpperCase() ?? '?'}
                                </div>
                                <span className="font-bold text-navy">{s.name}</span>
                              </div>
                            </TableCell>
                            <TableCell className="hidden md:table-cell">
                              <Badge variant="outline" className="text-xs">{(s.role ?? '').replace(/_/g, ' ')}</Badge>
                            </TableCell>
                            <TableCell className="text-right font-semibold text-navy">{s.assignedOrders}</TableCell>
                            <TableCell className="text-right text-emerald-700 font-semibold">{s.completed}</TableCell>
                            <TableCell className="text-right text-sky-700 font-semibold">{s.inProgress}</TableCell>
                            <TableCell className="text-right">
                              <span className={cn('inline-flex items-center rounded-md px-2 py-0.5 text-xs font-bold', rateColor)}>{rate}%</span>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            {/* Recent Payments */}
            <Card className="border-slate-200">
              <CardHeader className="border-b border-slate-100">
                <CardTitle className="flex items-center gap-2 text-navy"><TrendingUp className="h-4 w-4 text-gold" /> Recent Payments</CardTitle>
                <CardDescription>Latest 15 successful payments in the selected period.</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {!data.recentPayments || data.recentPayments.length === 0 ? (
                  <div className="p-6"><EmptyState title="No recent payments" /></div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50">
                        <TableHead>Reference</TableHead>
                        <TableHead className="hidden md:table-cell">Customer</TableHead>
                        <TableHead className="hidden md:table-cell">Order</TableHead>
                        <TableHead>Method</TableHead>
                        <TableHead className="hidden lg:table-cell">Date</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.recentPayments.map((p: any) => (
                        <TableRow key={p.id}>
                          <TableCell className="font-mono text-xs font-bold text-navy">{p.paymentReference}</TableCell>
                          <TableCell className="hidden md:table-cell text-slate-700">
                            {p.customer?.businessName ?? (p.customer ? `${p.customer.firstName} ${p.customer.lastName}` : '—')}
                          </TableCell>
                          <TableCell className="hidden md:table-cell font-mono text-xs text-slate-500">{p.order?.orderNumber ?? '—'}</TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="text-xs">{p.method}</Badge>
                          </TableCell>
                          <TableCell className="hidden lg:table-cell text-xs text-slate-500">{p.paidAt ? formatDate(p.paidAt) : '—'}</TableCell>
                          <TableCell className="text-right font-bold text-emerald-700"><Money amount={p.amount} /></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </AdminLayout>
  );
}

function KpiCard({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: React.ReactNode; accent: 'navy' | 'gold' | 'emerald' | 'rose' | 'amber' | 'violet' }) {
  const styles: Record<string, string> = {
    navy: 'bg-navy text-white',
    gold: 'bg-gold text-[#1a1508]',
    emerald: 'bg-emerald-600 text-white',
    rose: 'bg-rose-600 text-white',
    amber: 'bg-amber-600 text-white',
    violet: 'bg-violet-700 text-white',
  };
  return (
    <Card className="border-slate-200 p-4">
      <div className={cn('mb-3 inline-flex h-9 w-9 items-center justify-center rounded-lg', styles[accent])}>{icon}</div>
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-extrabold text-navy">{value}</p>
    </Card>
  );
}
