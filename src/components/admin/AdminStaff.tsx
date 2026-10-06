'use client';

import { useEffect, useState, useMemo } from 'react';
import { AdminLayout } from '@/components/shared/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/shared/Button';
import { EmptyState, StatusBadge } from '@/components/shared/primitives';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { useAppStore } from '@/stores/app-store';
import { apiClient } from '@/lib/api-client';
import { cn } from '@/lib/utils';
import { formatDate, timeAgo } from '@/lib/types';
import {
  Users, Search, Plus, MoreHorizontal, Pencil, Power, ShieldOff, Key, UserPlus,
} from 'lucide-react';

interface StaffUser {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  role: string;
  status: string;
  lastLoginAt?: string | null;
  createdAt: string;
  customer?: { customerNumber: string } | null;
  author?: { authorNumber: string } | null;
}

interface StaffResp { data: StaffUser[]; meta: { total: number; page: number; pageSize: number; totalPages: number } }

const ROLES = [
  { value: 'SUPER_ADMIN', label: 'Super Admin' },
  { value: 'ADMIN', label: 'Administrator' },
  { value: 'MANAGER', label: 'Manager' },
  { value: 'SALES', label: 'Sales' },
  { value: 'PRODUCTION', label: 'Production' },
  { value: 'DESIGNER', label: 'Designer' },
  { value: 'PUBLISHER', label: 'Publisher' },
  { value: 'INVENTORY_MANAGER', label: 'Inventory Manager' },
  { value: 'FINANCE', label: 'Finance' },
  { value: 'STAFF', label: 'Staff' },
];

const ROLE_LABEL: Record<string, string> = Object.fromEntries(ROLES.map(r => [r.value, r.label]));

export default function AdminStaff() {
  const { pushToast } = useAppStore();
  const [staff, setStaff] = useState<StaffUser[]>([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, pageSize: 25, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState('all');
  const [search, setSearch] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<StaffUser | null>(null);
  const [saving, setSaving] = useState(false);

  // form state for new staff
  const [form, setForm] = useState({ name: '', email: '', phone: '', role: 'STAFF', password: '' });
  // edit form
  const [editForm, setEditForm] = useState({ name: '', phone: '', role: 'STAFF', status: 'ACTIVE', password: '' });

  const fetchStaff = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ pageSize: '50' });
      if (role !== 'all') params.set('role', role);
      if (search) params.set('search', search);
      const d = await apiClient.get<StaffResp>(`/admin/staff?${params.toString()}`);
      setStaff(d?.data ?? []);
      setMeta(d?.meta ?? { total: 0, page: 1, pageSize: 50, totalPages: 1 });
    } catch (e: any) {
      pushToast({ message: e?.message ?? 'Failed to load staff.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchStaff(); }, [role, search]);

  const stats = useMemo(() => {
    const byRole: Record<string, number> = {};
    let active = 0;
    let suspended = 0;
    staff.forEach(s => {
      byRole[s.role] = (byRole[s.role] ?? 0) + 1;
      if (s.status === 'ACTIVE') active++;
      if (s.status === 'SUSPENDED') suspended++;
    });
    return { total: staff.length, active, suspended, byRole };
  }, [staff]);

  const handleCreate = async () => {
    if (!form.name || !form.email || !form.password) {
      pushToast({ message: 'Name, email and password are required.', type: 'warning' });
      return;
    }
    if (form.password.length < 8) {
      pushToast({ message: 'Password must be at least 8 characters.', type: 'warning' });
      return;
    }
    setSaving(true);
    try {
      await apiClient.post('/admin/staff', {
        name: form.name, email: form.email, phone: form.phone, role: form.role, password: form.password,
      });
      pushToast({ message: 'Staff member created.', type: 'success' });
      setForm({ name: '', email: '', phone: '', role: 'STAFF', password: '' });
      setAddOpen(false);
      fetchStaff();
    } catch (e: any) {
      pushToast({ message: e?.message ?? 'Failed to create staff.', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (s: StaffUser) => {
    setEditTarget(s);
    setEditForm({ name: s.name, phone: s.phone ?? '', role: s.role, status: s.status, password: '' });
  };

  const handleUpdate = async () => {
    if (!editTarget) return;
    setSaving(true);
    try {
      const payload: any = {
        name: editForm.name,
        phone: editForm.phone,
        role: editForm.role,
        status: editForm.status,
      };
      if (editForm.password) {
        if (editForm.password.length < 8) {
          pushToast({ message: 'Password must be at least 8 characters.', type: 'warning' });
          setSaving(false);
          return;
        }
        payload.password = editForm.password;
      }
      await apiClient.patch(`/admin/staff/${editTarget.id}`, payload);
      pushToast({ message: 'Staff member updated.', type: 'success' });
      setEditTarget(null);
      fetchStaff();
    } catch (e: any) {
      pushToast({ message: e?.message ?? 'Failed to update staff.', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (s: StaffUser) => {
    const next = s.status === 'SUSPENDED' ? 'ACTIVE' : 'SUSPENDED';
    try {
      await apiClient.patch(`/admin/staff/${s.id}`, { status: next });
      pushToast({ message: `${s.name} is now ${next.toLowerCase()}.`, type: 'success' });
      fetchStaff();
    } catch (e: any) {
      pushToast({ message: e?.message ?? 'Failed to change status.', type: 'error' });
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-xs font-bold uppercase tracking-[0.18em] text-gold">Admin · Staff Management</div>
            <h1 className="mt-1 text-2xl font-extrabold text-navy sm:text-3xl">Staff & Users</h1>
            <p className="mt-1 text-sm text-slate-500">Manage internal team members, roles, and access.</p>
          </div>
          <Button variant="accent" size="md" onClick={() => setAddOpen(true)}>
            <UserPlus className="h-4 w-4" /> Add Staff
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatCard label="Total staff" value={stats.total} accent="navy" />
          <StatCard label="Active" value={stats.active} accent="emerald" />
          <StatCard label="Suspended" value={stats.suspended} accent="rose" />
          <StatCard label="Roles" value={Object.keys(stats.byRole).length} accent="gold" />
        </div>

        {/* Role breakdown */}
        <Card className="border-slate-200">
          <CardHeader className="border-b border-slate-100">
            <CardTitle className="flex items-center gap-2 text-navy"><Users className="h-4 w-4 text-gold" /> By Role</CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.byRole).sort((a, b) => b[1] - a[1]).map(([r, count]) => (
                <Badge key={r} variant="secondary" className="bg-slate-100 px-3 py-1.5 text-xs">
                  <span className="font-bold text-navy">{ROLE_LABEL[r] ?? r}</span>
                  <span className="ml-2 rounded-full bg-navy px-1.5 py-0.5 text-[10px] text-white">{count}</span>
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Filters + Table */}
        <Card className="border-slate-200">
          <CardHeader className="border-b border-slate-100">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle className="text-navy">All Staff ({meta.total})</CardTitle>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    placeholder="Search name, email, phone..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-9 sm:w-72"
                  />
                </div>
                <Select value={role} onValueChange={setRole}>
                  <SelectTrigger className="w-full sm:w-48">
                    <SelectValue placeholder="All roles" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All roles</SelectItem>
                    {ROLES.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="space-y-2 p-4">
                {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
              </div>
            ) : staff.length === 0 ? (
              <div className="p-6">
                <EmptyState icon={<Users className="h-5 w-5" />} title="No staff members found" description="Adjust filters or add a new staff member." />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead>Name</TableHead>
                    <TableHead className="hidden md:table-cell">Contact</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="hidden lg:table-cell">Last Login</TableHead>
                    <TableHead className="w-10 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {staff.map(s => (
                    <TableRow key={s.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-full bg-navy text-xs font-bold text-white">
                            {s.name?.[0]?.toUpperCase() ?? '?'}
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-navy truncate">{s.name}</p>
                            <p className="text-xs text-slate-500 truncate md:hidden">{s.email}</p>
                            {s.customer && <p className="text-[10px] text-gold font-semibold">{s.customer.customerNumber}</p>}
                            {s.author && <p className="text-[10px] text-gold font-semibold">{s.author.authorNumber}</p>}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <p className="text-sm text-navy-soft">{s.email}</p>
                        {s.phone && <p className="text-xs text-slate-500">{s.phone}</p>}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-semibold text-navy">{ROLE_LABEL[s.role] ?? s.role}</Badge>
                      </TableCell>
                      <TableCell><StatusBadge status={s.status} /></TableCell>
                      <TableCell className="hidden lg:table-cell text-xs text-slate-500">
                        {s.lastLoginAt ? <span>{timeAgo(s.lastLoginAt)}</span> : <span className="text-slate-400">Never</span>}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="rounded-lg p-2 text-slate-500 hover:bg-slate-100">
                              <MoreHorizontal className="h-4 w-4" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEdit(s)}>
                              <Pencil className="mr-2 h-4 w-4" /> Edit details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openEdit(s)}>
                              <Key className="mr-2 h-4 w-4" /> Reset password
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => toggleStatus(s)}>
                              {s.status === 'SUSPENDED' ? (
                                <><Power className="mr-2 h-4 w-4 text-emerald-600" /> Activate</>
                              ) : (
                                <><ShieldOff className="mr-2 h-4 w-4 text-rose-600" /> Suspend</>
                              )}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Add Staff Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-navy"><UserPlus className="h-4 w-4 text-gold" /> Add Staff Member</DialogTitle>
            <DialogDescription>Create a new internal user account.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="add-name">Full name *</Label>
              <Input id="add-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Jane Doe" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="add-email">Email *</Label>
                <Input id="add-email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="jane@printpublish.co.ke" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="add-phone">Phone</Label>
                <Input id="add-phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+254 700 000 000" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Role *</Label>
              <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ROLES.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="add-password">Temporary password *</Label>
              <Input id="add-password" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Min 8 characters" />
              <p className="text-xs text-slate-500">User will be prompted to change this on first login.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" size="md" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button variant="primary" size="md" onClick={handleCreate} disabled={saving}>
              <Plus className="h-4 w-4" /> {saving ? 'Creating...' : 'Create Staff'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Staff Dialog */}
      <Dialog open={!!editTarget} onOpenChange={(o) => !o && setEditTarget(null)}>
        <DialogContent>
          {editTarget && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-navy"><Pencil className="h-4 w-4 text-gold" /> Edit {editTarget.name}</DialogTitle>
                <DialogDescription>{editTarget.email}</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="edit-name">Full name</Label>
                  <Input id="edit-name" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="edit-phone">Phone</Label>
                    <Input id="edit-phone" value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Status</Label>
                    <Select value={editForm.status} onValueChange={(v) => setEditForm({ ...editForm, status: v })}>
                      <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ACTIVE">Active</SelectItem>
                        <SelectItem value="INACTIVE">Inactive</SelectItem>
                        <SelectItem value="SUSPENDED">Suspended</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Role</Label>
                  <Select value={editForm.role} onValueChange={(v) => setEditForm({ ...editForm, role: v })}>
                    <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ROLES.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="edit-password">Reset password</Label>
                  <Input id="edit-password" type="password" value={editForm.password} onChange={(e) => setEditForm({ ...editForm, password: e.target.value })} placeholder="Leave blank to keep current" />
                </div>
              </div>
              <DialogFooter>
                <Button variant="ghost" size="md" onClick={() => setEditTarget(null)}>Cancel</Button>
                <Button variant="primary" size="md" onClick={handleUpdate} disabled={saving}>
                  {saving ? 'Saving...' : 'Save Changes'}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}

function StatCard({ label, value, accent }: { label: string; value: number; accent: 'navy' | 'gold' | 'emerald' | 'rose' }) {
  const styles: Record<string, string> = {
    navy: 'from-navy to-navy-soft text-white',
    gold: 'from-gold to-[#9a7308] text-[#1a1508]',
    emerald: 'from-emerald-700 to-emerald-600 text-white',
    rose: 'from-rose-700 to-rose-600 text-white',
  };
  return (
    <div className={cn('rounded-2xl bg-gradient-to-br p-4 shadow-sm', styles[accent])}>
      <p className="text-xs font-semibold uppercase tracking-wide opacity-80">{label}</p>
      <p className="mt-1 text-3xl font-extrabold">{value}</p>
    </div>
  );
}
