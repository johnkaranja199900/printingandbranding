'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { AdminLayout } from '@/components/shared/AdminLayout';
import { apiClient } from '@/lib/api-client';
import { useAppStore } from '@/stores/app-store';
import { Button } from '@/components/shared/Button';
import { Money, EmptyState, Eyebrow } from '@/components/shared/primitives';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import {
  Boxes, Plus, Search, AlertTriangle, RefreshCw, Edit3, Trash2, ArrowUpCircle, ArrowDownCircle,
  Package, Wallet, TrendingDown, X,
} from 'lucide-react';

interface InventoryItem {
  id: string; sku: string; name: string; category: string; unit: string;
  quantity: number; reorderLevel: number; unitCost: string;
  supplierId?: string | null; location?: string | null; isActive: boolean;
  description?: string | null;
  supplier?: { name: string } | null;
}

export function AdminInventory() {
  const { pushToast } = useAppStore();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');

  const [showAdd, setShowAdd] = useState(false);
  const [editTarget, setEditTarget] = useState<InventoryItem | null>(null);
  const [adjustTarget, setAdjustTarget] = useState<InventoryItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<InventoryItem | null>(null);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams({ page: String(page), pageSize: '15' });
      if (search) qs.set('search', search);
      const r = await apiClient.get<{ data: InventoryItem[]; meta: any }>(`/admin/inventory?${qs.toString()}`) as any;
      setItems(r?.data ?? []);
      setTotalPages(r?.meta?.totalPages ?? 1);
      setTotal(r?.meta?.total ?? 0);
    } catch (e: any) {
      pushToast({ message: e.message ?? 'Failed to load inventory', type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const applySearch = () => { setPage(1); setSearch(searchInput.trim()); };

  const summary = useMemo(() => {
    const totalItems = items.length;
    const lowStock = items.filter((i) => Number(i.quantity) <= Number(i.reorderLevel)).length;
    const totalValue = items.reduce((s, i) => s + Number(i.quantity) * Number(i.unitCost), 0);
    return { totalItems, lowStock, totalValue };
  }, [items]);

  const summaryCards = [
    { label: 'Total Items', value: summary.totalItems, icon: Boxes, tone: 'navy' },
    { label: 'Low Stock', value: summary.lowStock, icon: AlertTriangle, tone: 'rose' },
    { label: 'Inventory Value', value: <Money amount={summary.totalValue} />, icon: Wallet, tone: 'emerald' },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Eyebrow>Operations</Eyebrow>
            <h1 className="mt-1 text-2xl font-extrabold text-navy sm:text-3xl">Inventory</h1>
            <p className="mt-1 text-sm text-slate-500">Track stock levels, adjust quantities, and manage material costs.</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="md" onClick={fetchItems} disabled={loading}>
              <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} /> Refresh
            </Button>
            <Button variant="accent" size="md" onClick={() => setShowAdd(true)}>
              <Plus className="h-4 w-4" /> Add Item
            </Button>
          </div>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)
          ) : (
            summaryCards.map((c, i) => (
              <Card key={i} className="rounded-2xl">
                <CardContent className="pt-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{c.label}</p>
                      <p className="mt-1 text-2xl font-extrabold text-navy">{c.value}</p>
                    </div>
                    <div className={cn(
                      'grid h-11 w-11 place-items-center rounded-xl',
                      c.tone === 'navy' && 'bg-navy text-gold',
                      c.tone === 'rose' && 'bg-rose-100 text-rose-700',
                      c.tone === 'emerald' && 'bg-emerald-100 text-emerald-700',
                    )}>
                      <c.icon className="h-5 w-5" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Search */}
        <Card className="rounded-2xl">
          <CardContent className="pt-5">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') applySearch(); }}
                  placeholder="Search by name or SKU…"
                  className="pl-9"
                />
              </div>
              <Button variant="accent" size="md" onClick={applySearch}>Search</Button>
              {search && (
                <Button variant="ghost" size="md" onClick={() => { setSearch(''); setSearchInput(''); setPage(1); }}>
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
            <p className="mt-3 text-xs text-slate-500">{total} item{total !== 1 ? 's' : ''} found</p>
          </CardContent>
        </Card>

        {/* Desktop table */}
        <Card className="hidden overflow-hidden rounded-2xl md:block">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50 hover:bg-slate-50">
                <TableHead className="px-4 py-3 text-xs uppercase text-slate-500">SKU</TableHead>
                <TableHead className="px-4 py-3 text-xs uppercase text-slate-500">Name</TableHead>
                <TableHead className="px-4 py-3 text-xs uppercase text-slate-500">Category</TableHead>
                <TableHead className="px-4 py-3 text-xs uppercase text-slate-500">Quantity</TableHead>
                <TableHead className="px-4 py-3 text-xs uppercase text-slate-500">Reorder @</TableHead>
                <TableHead className="px-4 py-3 text-xs uppercase text-slate-500">Unit Cost</TableHead>
                <TableHead className="px-4 py-3 text-xs uppercase text-slate-500">Total Value</TableHead>
                <TableHead className="px-4 py-3 text-right text-xs uppercase text-slate-500">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <TableRow key={i}>{Array.from({ length: 8 }).map((_, j) => <TableCell key={j}><Skeleton className="h-5 w-full" /></TableCell>)}</TableRow>
                ))
              ) : items.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="py-12"><EmptyState icon={<Boxes className="h-5 w-5" />} title="No inventory items" description="Add your first inventory item to begin tracking." action={<Button variant="accent" size="sm" onClick={() => setShowAdd(true)}><Plus className="h-4 w-4" /> Add Item</Button>} /></TableCell></TableRow>
              ) : (
                items.map((it) => {
                  const qty = Number(it.quantity);
                  const reorder = Number(it.reorderLevel);
                  const isLow = qty <= reorder;
                  const totalVal = qty * Number(it.unitCost);
                  return (
                    <TableRow key={it.id} className={cn(isLow && 'bg-amber-50/40')}>
                      <TableCell className="px-4 py-3 font-mono text-xs font-bold text-slate-600">{it.sku}</TableCell>
                      <TableCell className="px-4 py-3">
                        <div className="font-bold text-navy">{it.name}</div>
                        {it.supplier && <div className="text-xs text-slate-400">{it.supplier.name}</div>}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-sm text-slate-600">{it.category}</TableCell>
                      <TableCell className="px-4 py-3">
                        <span className={cn('font-bold', isLow ? 'text-rose-600' : 'text-navy')}>{qty}</span>
                        <span className="text-xs text-slate-400"> {it.unit}</span>
                        {isLow && <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-xs font-bold text-rose-700"><AlertTriangle className="h-3 w-3" /> Low</span>}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-sm text-slate-600">{reorder} {it.unit}</TableCell>
                      <TableCell className="px-4 py-3 font-semibold text-navy"><Money amount={it.unitCost} /></TableCell>
                      <TableCell className="px-4 py-3 font-bold text-navy"><Money amount={totalVal} /></TableCell>
                      <TableCell className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="outline" size="sm" onClick={() => setAdjustTarget(it)}>
                            <ArrowUpCircle className="h-3.5 w-3.5" /> Adjust
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => setEditTarget(it)}><Edit3 className="h-3.5 w-3.5" /></Button>
                          <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(it)} className="text-rose-500 hover:text-rose-700"><Trash2 className="h-3.5 w-3.5" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </Card>

        {/* Mobile cards */}
        <div className="space-y-3 md:hidden">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-36 rounded-2xl" />)
          ) : items.length === 0 ? (
            <EmptyState icon={<Boxes className="h-5 w-5" />} title="No inventory items" description="Add your first item." action={<Button variant="accent" size="sm" onClick={() => setShowAdd(true)}><Plus className="h-4 w-4" /> Add Item</Button>} />
          ) : (
            items.map((it) => {
              const isLow = Number(it.quantity) <= Number(it.reorderLevel);
              return (
                <Card key={it.id} className={cn('rounded-2xl', isLow && 'border-amber-300 bg-amber-50/30')}>
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-mono text-xs text-slate-500">{it.sku}</p>
                        <p className="mt-1 font-bold text-navy">{it.name}</p>
                      </div>
                      {isLow && <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-xs font-bold text-rose-700"><AlertTriangle className="h-3 w-3" /> Low</span>}
                    </div>
                    <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                      <div><p className="text-slate-400">Qty</p><p className={cn('font-bold', isLow ? 'text-rose-600' : 'text-navy')}>{it.quantity} {it.unit}</p></div>
                      <div><p className="text-slate-400">Reorder</p><p className="font-bold text-navy">{it.reorderLevel}</p></div>
                      <div><p className="text-slate-400">Unit cost</p><p className="font-bold text-navy"><Money amount={it.unitCost} /></p></div>
                    </div>
                    <div className="mt-3 flex gap-2">
                      <Button variant="outline" size="sm" className="flex-1" onClick={() => setAdjustTarget(it)}><ArrowUpCircle className="h-3.5 w-3.5" /> Adjust</Button>
                      <Button variant="ghost" size="sm" onClick={() => setEditTarget(it)}><Edit3 className="h-3.5 w-3.5" /></Button>
                      <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(it)} className="text-rose-500"><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1}>Prev</Button>
            <span className="rounded-lg bg-white px-3 py-1.5 text-sm font-semibold text-navy shadow-sm">Page {page} / {totalPages}</span>
            <Button variant="ghost" size="sm" onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page === totalPages}>Next</Button>
          </div>
        )}
      </div>

      {/* Add Item dialog */}
      <AddItemDialog open={showAdd} onOpenChange={setShowAdd} onSaved={() => { setShowAdd(false); fetchItems(); }} />

      {/* Edit dialog */}
      {editTarget && (
        <EditItemDialog item={editTarget} onOpenChange={(o) => !o && setEditTarget(null)} onSaved={() => { setEditTarget(null); fetchItems(); }} />
      )}

      {/* Adjust dialog */}
      {adjustTarget && (
        <AdjustDialog item={adjustTarget} onOpenChange={(o) => !o && setAdjustTarget(null)} onSaved={() => { setAdjustTarget(null); fetchItems(); }} />
      )}

      {/* Delete dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Inventory Item</DialogTitle>
            <DialogDescription>
              You're about to remove <span className="font-bold text-navy">{deleteTarget?.name}</span> ({deleteTarget?.sku}). This action cannot be undone. The item will be marked inactive.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button variant="danger" onClick={async () => {
              try {
                await apiClient.delete(`/admin/inventory/${deleteTarget!.id}`);
                pushToast({ message: 'Item removed.', type: 'success' });
                setDeleteTarget(null);
                fetchItems();
              } catch (e: any) {
                pushToast({ message: e.message ?? 'Failed to delete', type: 'error' });
              }
            }}>Delete Item</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}

function AddItemDialog({ open, onOpenChange, onSaved }: { open: boolean; onOpenChange: (o: boolean) => void; onSaved: () => void }) {
  const { pushToast } = useAppStore();
  const [form, setForm] = useState({
    name: '', sku: '', category: 'General', unit: 'pcs', quantity: '0', reorderLevel: '5', unitCost: '0',
    location: '', description: '',
  });
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!form.name.trim() || !form.sku.trim()) {
      pushToast({ message: 'Name and SKU are required.', type: 'warning' });
      return;
    }
    setSaving(true);
    try {
      await apiClient.post('/admin/inventory', {
        name: form.name.trim(),
        sku: form.sku.trim().toUpperCase(),
        category: form.category.trim() || 'General',
        unit: form.unit.trim() || 'pcs',
        quantity: Number(form.quantity) || 0,
        reorderLevel: Number(form.reorderLevel) || 0,
        unitCost: Number(form.unitCost) || 0,
        location: form.location.trim() || undefined,
        description: form.description.trim() || undefined,
      });
      pushToast({ message: 'Inventory item created.', type: 'success' });
      setForm({ name: '', sku: '', category: 'General', unit: 'pcs', quantity: '0', reorderLevel: '5', unitCost: '0', location: '', description: '' });
      onSaved();
    } catch (e: any) {
      pushToast({ message: e.message ?? 'Failed to create item', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Inventory Item</DialogTitle>
          <DialogDescription>Record details for a new stock item.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="mb-1.5 block text-sm">Name *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="A4 Paper 80gsm" />
            </div>
            <div>
              <Label className="mb-1.5 block text-sm">SKU *</Label>
              <Input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} placeholder="PAP-A4-80" className="font-mono" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="mb-1.5 block text-sm">Category</Label>
              <Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
            </div>
            <div>
              <Label className="mb-1.5 block text-sm">Unit</Label>
              <Input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} placeholder="pcs, reams, kg, litres" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label className="mb-1.5 block text-sm">Quantity</Label>
              <Input type="number" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
            </div>
            <div>
              <Label className="mb-1.5 block text-sm">Reorder @</Label>
              <Input type="number" value={form.reorderLevel} onChange={(e) => setForm({ ...form, reorderLevel: e.target.value })} />
            </div>
            <div>
              <Label className="mb-1.5 block text-sm">Unit cost (KES)</Label>
              <Input type="number" value={form.unitCost} onChange={(e) => setForm({ ...form, unitCost: e.target.value })} />
            </div>
          </div>
          <div>
            <Label className="mb-1.5 block text-sm">Location (optional)</Label>
            <Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="Warehouse A · Shelf 3" />
          </div>
          <div>
            <Label className="mb-1.5 block text-sm">Description (optional)</Label>
            <Textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button variant="accent" onClick={submit} disabled={saving}>{saving ? 'Saving…' : 'Create Item'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EditItemDialog({ item, onOpenChange, onSaved }: { item: InventoryItem; onOpenChange: (o: boolean) => void; onSaved: () => void }) {
  const { pushToast } = useAppStore();
  const [form, setForm] = useState({
    name: item.name, category: item.category, unit: item.unit,
    reorderLevel: String(item.reorderLevel), unitCost: String(item.unitCost),
    location: item.location ?? '', description: item.description ?? '',
  });
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    setSaving(true);
    try {
      await apiClient.patch(`/admin/inventory/${item.id}`, {
        name: form.name.trim(),
        category: form.category.trim() || 'General',
        unit: form.unit.trim() || 'pcs',
        reorderLevel: Number(form.reorderLevel) || 0,
        unitCost: Number(form.unitCost) || 0,
        location: form.location.trim() || null,
        description: form.description.trim() || null,
      });
      pushToast({ message: 'Item updated.', type: 'success' });
      onSaved();
    } catch (e: any) {
      pushToast({ message: e.message ?? 'Failed to update', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit {item.name}</DialogTitle>
          <DialogDescription>SKU {item.sku} — update non-stock fields here. Use “Adjust Stock” for quantity changes.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <div>
            <Label className="mb-1.5 block text-sm">Name</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="mb-1.5 block text-sm">Category</Label>
              <Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
            </div>
            <div>
              <Label className="mb-1.5 block text-sm">Unit</Label>
              <Input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="mb-1.5 block text-sm">Reorder @</Label>
              <Input type="number" value={form.reorderLevel} onChange={(e) => setForm({ ...form, reorderLevel: e.target.value })} />
            </div>
            <div>
              <Label className="mb-1.5 block text-sm">Unit cost (KES)</Label>
              <Input type="number" value={form.unitCost} onChange={(e) => setForm({ ...form, unitCost: e.target.value })} />
            </div>
          </div>
          <div>
            <Label className="mb-1.5 block text-sm">Location</Label>
            <Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
          </div>
          <div>
            <Label className="mb-1.5 block text-sm">Description</Label>
            <Textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button variant="accent" onClick={submit} disabled={saving}>{saving ? 'Saving…' : 'Save Changes'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AdjustDialog({ item, onOpenChange, onSaved }: { item: InventoryItem; onOpenChange: (o: boolean) => void; onSaved: () => void }) {
  const { pushToast } = useAppStore();
  const [adjustment, setAdjustment] = useState<string>('');
  const [reason, setReason] = useState<string>('');
  const [saving, setSaving] = useState(false);

  const newQty = Number(item.quantity) + (Number(adjustment) || 0);
  const isLow = newQty <= Number(item.reorderLevel);

  const submit = async () => {
    const adj = Number(adjustment);
    if (!adj || adj === 0) {
      pushToast({ message: 'Enter a non-zero adjustment.', type: 'warning' });
      return;
    }
    setSaving(true);
    try {
      await apiClient.patch(`/admin/inventory/${item.id}`, { adjustment: adj, reason: reason.trim() || 'Manual adjustment' });
      pushToast({ message: 'Stock adjusted.', type: 'success' });
      onSaved();
    } catch (e: any) {
      pushToast({ message: e.message ?? 'Failed to adjust', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const quickAdd = (n: number) => setAdjustment(String(Number(adjustment || 0) + n));

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Adjust Stock — {item.name}</DialogTitle>
          <DialogDescription>
            Current: <span className="font-bold text-navy">{item.quantity} {item.unit}</span> · Reorder at: {item.reorderLevel} {item.unit}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label className="mb-1.5 block text-sm">Adjustment (+/-)</Label>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => quickAdd(-10)}><ArrowDownCircle className="h-4 w-4 text-rose-500" /> -10</Button>
              <Button variant="ghost" size="sm" onClick={() => quickAdd(-1)}><ArrowDownCircle className="h-4 w-4 text-rose-500" /> -1</Button>
              <Input type="number" value={adjustment} onChange={(e) => setAdjustment(e.target.value)} placeholder="e.g. +20 or -5" className="flex-1" />
              <Button variant="ghost" size="sm" onClick={() => quickAdd(1)}><ArrowUpCircle className="h-4 w-4 text-emerald-500" /> +1</Button>
              <Button variant="ghost" size="sm" onClick={() => quickAdd(10)}><ArrowUpCircle className="h-4 w-4 text-emerald-500" /> +10</Button>
            </div>
          </div>
          <div className="rounded-xl bg-slate-50 p-3 text-center text-sm">
            New quantity: <span className={cn('font-extrabold', isLow ? 'text-rose-600' : 'text-emerald-700')}>{newQty} {item.unit}</span>
            {isLow && newQty >= 0 && <span className="ml-2 inline-flex items-center gap-1 text-xs text-rose-600"><AlertTriangle className="h-3 w-3" /> at/below reorder</span>}
          </div>
          <div>
            <Label className="mb-1.5 block text-sm">Reason</Label>
            <Textarea rows={2} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Stock received from supplier / Damaged units / Manual correction" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button variant="accent" onClick={submit} disabled={saving || !adjustment}>{saving ? 'Saving…' : 'Confirm Adjustment'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default AdminInventory;
