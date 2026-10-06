'use client';

import { useEffect, useState, useMemo } from 'react';
import { AdminLayout } from '@/components/shared/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/shared/Button';
import { EmptyState } from '@/components/shared/primitives';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useAppStore } from '@/stores/app-store';
import { apiClient } from '@/lib/api-client';
import { cn } from '@/lib/utils';
import { formatDate } from '@/lib/types';
import {
  Image as ImageIcon, Plus, Star, Pencil, Trash2, Search, Filter, Eye, EyeOff,
} from 'lucide-react';

interface PortfolioItem {
  id: string;
  title: string;
  slug: string;
  category: string;
  description?: string | null;
  imageUrl?: string | null;
  clientName?: string | null;
  projectDate?: string | null;
  isFeatured: boolean;
  isPublished: boolean;
  createdAt: string;
}

interface PortfolioResp { data: PortfolioItem[]; meta: any }

export default function AdminPortfolio() {
  const { pushToast } = useAppStore();
  const [items, setItems] = useState<PortfolioItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('all');
  const [search, setSearch] = useState('');
  const [addOpen, setAddOpen] = useState(false);

  // form state for new portfolio
  const [form, setForm] = useState({
    title: '', category: 'Branding', description: '', imageUrl: '', clientName: '',
    isFeatured: false, isPublished: true,
  });

  const fetchItems = async () => {
    setLoading(true);
    try {
      const d = await apiClient.get<PortfolioResp>('/public/portfolio?pageSize=50');
      setItems(d?.data ?? []);
    } catch (e: any) {
      pushToast({ message: e?.message ?? 'Failed to load portfolio.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchItems(); }, []);

  const categories = useMemo(() => {
    const set = new Set<string>();
    items.forEach(i => set.add(i.category));
    return ['All', ...Array.from(set).sort()];
  }, [items]);

  const filtered = useMemo(() => {
    let list = items;
    if (category !== 'All') list = list.filter(i => i.category === category);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(i =>
        i.title.toLowerCase().includes(q) ||
        (i.clientName ?? '').toLowerCase().includes(q) ||
        i.category.toLowerCase().includes(q),
      );
    }
    return list;
  }, [items, category, search]);

  const stats = useMemo(() => ({
    total: items.length,
    featured: items.filter(i => i.isFeatured).length,
    published: items.filter(i => i.isPublished).length,
    categories: categories.length - 1,
  }), [items, categories]);

  const handleCreate = async () => {
    if (!form.title.trim()) {
      pushToast({ message: 'Title is required.', type: 'warning' });
      return;
    }
    setAddOpen(false);
    pushToast({ message: 'Portfolio creation coming soon (demo mode).', type: 'info' });
    setForm({ title: '', category: 'Branding', description: '', imageUrl: '', clientName: '', isFeatured: false, isPublished: true });
  };

  const handleEdit = (item: PortfolioItem) => {
    pushToast({ message: `Edit "${item.title}" — demo mode.`, type: 'info' });
  };

  const handleDelete = (item: PortfolioItem) => {
    pushToast({ message: `Delete "${item.title}" — demo mode (not persisted).`, type: 'warning' });
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-xs font-bold uppercase tracking-[0.18em] text-gold">Admin · Portfolio</div>
            <h1 className="mt-1 text-2xl font-extrabold text-navy sm:text-3xl">Portfolio Manager</h1>
            <p className="mt-1 text-sm text-slate-500">Showcase your best work — branding, printing, publishing projects.</p>
          </div>
          <Button variant="accent" size="md" onClick={() => setAddOpen(true)}>
            <Plus className="h-4 w-4" /> Add Portfolio Item
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatCard label="Total items" value={stats.total} accent="navy" />
          <StatCard label="Published" value={stats.published} accent="emerald" />
          <StatCard label="Featured" value={stats.featured} accent="gold" />
          <StatCard label="Categories" value={stats.categories} accent="violet" />
        </div>

        {/* Filters */}
        <Card className="border-slate-200">
          <CardHeader className="border-b border-slate-100 pb-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle className="text-navy">All Portfolio Items</CardTitle>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    placeholder="Search portfolio..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-9 sm:w-72"
                  />
                </div>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger className="w-full sm:w-44">
                    <Filter className="mr-1 h-3 w-3" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            {loading ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-72 w-full rounded-2xl" />)}
              </div>
            ) : filtered.length === 0 ? (
              <EmptyState icon={<ImageIcon className="h-5 w-5" />} title="No portfolio items" description="Add your first showcase piece to highlight your best work." />
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {filtered.map(item => (
                  <Card key={item.id} className="group overflow-hidden border-slate-200 p-0">
                    <div className="relative aspect-[4/3] w-full overflow-hidden bg-slate-100">
                      {item.imageUrl ? (
                        <img src={item.imageUrl} alt={item.title} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
                      ) : (
                        <div className="grid h-full place-items-center bg-gradient-to-br from-navy to-navy-soft text-gold">
                          <ImageIcon className="h-12 w-12" />
                        </div>
                      )}
                      <div className="absolute left-2 top-2 flex gap-1.5">
                        {item.isFeatured && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-gold px-2 py-0.5 text-[10px] font-bold text-[#1a1508] shadow">
                            <Star className="h-3 w-3 fill-current" /> Featured
                          </span>
                        )}
                        <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold shadow', item.isPublished ? 'bg-emerald-500 text-white' : 'bg-slate-500 text-white')}>
                          {item.isPublished ? <><Eye className="h-3 w-3" /> Live</> : <><EyeOff className="h-3 w-3" /> Hidden</>}
                        </span>
                      </div>
                      <div className="absolute right-2 top-2 opacity-0 transition group-hover:opacity-100">
                        <div className="flex gap-1">
                          <button onClick={() => handleEdit(item)} className="grid h-7 w-7 place-items-center rounded-md bg-white/95 text-navy shadow hover:bg-white">
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button onClick={() => handleDelete(item)} className="grid h-7 w-7 place-items-center rounded-md bg-white/95 text-rose-600 shadow hover:bg-rose-50">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                    <div className="p-3">
                      <Badge variant="outline" className="mb-1 text-[10px]">{item.category}</Badge>
                      <p className="line-clamp-1 font-bold text-navy">{item.title}</p>
                      {item.clientName && <p className="mt-0.5 text-xs text-slate-500 truncate">Client: {item.clientName}</p>}
                      {item.projectDate && <p className="mt-0.5 text-[10px] text-slate-400">{formatDate(item.projectDate)}</p>}
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Add Portfolio Item Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-navy"><Plus className="h-4 w-4 text-gold" /> Add Portfolio Item</DialogTitle>
            <DialogDescription>Showcase a completed project. (Demo mode — submission shows a toast.)</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="p-title">Title *</Label>
              <Input id="p-title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Corporate Brand Refresh" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="p-category">Category</Label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['Branding', 'Printing', 'Publishing', 'Books', 'Banners', 'Cyber', 'Design'].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="p-client">Client name</Label>
                <Input id="p-client" value={form.clientName} onChange={(e) => setForm({ ...form, clientName: e.target.value })} placeholder="e.g. Nexus Logistics" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="p-image">Image URL</Label>
              <Input id="p-image" value={form.imageUrl} onChange={(e) => setForm({ ...form, imageUrl: e.target.value })} placeholder="https://..." />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="p-desc">Description</Label>
              <Textarea id="p-desc" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Brief description of the project..." />
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-6">
              <label className="flex items-center gap-3 cursor-pointer">
                <Switch checked={form.isFeatured} onCheckedChange={(v) => setForm({ ...form, isFeatured: v })} />
                <div>
                  <p className="text-sm font-semibold text-navy">Featured</p>
                  <p className="text-xs text-slate-500">Show in featured section</p>
                </div>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <Switch checked={form.isPublished} onCheckedChange={(v) => setForm({ ...form, isPublished: v })} />
                <div>
                  <p className="text-sm font-semibold text-navy">Published</p>
                  <p className="text-xs text-slate-500">Visible publicly</p>
                </div>
              </label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" size="md" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button variant="primary" size="md" onClick={handleCreate}>
              <Plus className="h-4 w-4" /> Add Item
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}

function StatCard({ label, value, accent }: { label: string; value: number; accent: 'navy' | 'gold' | 'emerald' | 'violet' }) {
  const styles: Record<string, string> = {
    navy: 'bg-navy text-white',
    gold: 'bg-gold text-[#1a1508]',
    emerald: 'bg-emerald-600 text-white',
    violet: 'bg-violet-700 text-white',
  };
  return (
    <Card className="border-slate-200 p-4">
      <div className={cn('mb-2 inline-flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold', styles[accent])}>
        {label[0]?.toUpperCase()}
      </div>
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="text-2xl font-extrabold text-navy">{value}</p>
    </Card>
  );
}
