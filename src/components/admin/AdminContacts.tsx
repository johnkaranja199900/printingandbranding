'use client';

import { useEffect, useState, useMemo } from 'react';
import { AdminLayout } from '@/components/shared/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/shared/Button';
import { EmptyState, StatusBadge } from '@/components/shared/primitives';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
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
import { formatDate, timeAgo } from '@/lib/types';
import {
  MessageSquare, Search, Mail, Phone, User, Clock, Inbox, Filter, CheckCircle2, Ban,
} from 'lucide-react';

interface ContactMessage {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  subject: string;
  message: string;
  status: string;
  assignedToId?: string | null;
  assignee?: { name: string } | null;
  createdAt: string;
}

interface StaffMember {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface ContactResp { data: ContactMessage[]; meta: any }
interface StaffResp { data: StaffMember[]; meta: any }

const STATUS_OPTIONS = [
  { value: 'all', label: 'All statuses' },
  { value: 'new', label: 'New' },
  { value: 'assigned', label: 'Assigned' },
  { value: 'replied', label: 'Replied' },
  { value: 'closed', label: 'Closed' },
  { value: 'spam', label: 'Spam' },
];

export default function AdminContacts() {
  const { pushToast } = useAppStore();
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('all');
  const [search, setSearch] = useState('');
  const [active, setActive] = useState<ContactMessage | null>(null);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [saving, setSaving] = useState(false);
  const [nextStatus, setNextStatus] = useState('');
  const [assigneeId, setAssigneeId] = useState('');

  useEffect(() => {
    apiClient.get<StaffResp>('/admin/staff?pageSize=50').then((d: any) => {
      setStaff(d?.data ?? []);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    const params = new URLSearchParams();
    if (status !== 'all') params.set('status', status);
    apiClient.get<ContactResp>(`/admin/contacts?${params.toString()}`)
      .then((d: any) => { if (active) setMessages(d?.data ?? []); })
      .catch((e: any) => pushToast({ message: e?.message ?? 'Failed to load messages.', type: 'error' }))
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [status]);

  const filtered = useMemo(() => {
    if (!search.trim()) return messages;
    const q = search.toLowerCase();
    return messages.filter(m =>
      m.name.toLowerCase().includes(q) ||
      m.email.toLowerCase().includes(q) ||
      m.subject.toLowerCase().includes(q) ||
      m.message.toLowerCase().includes(q),
    );
  }, [messages, search]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { new: 0, assigned: 0, replied: 0, closed: 0, spam: 0 };
    messages.forEach(m => { c[m.status] = (c[m.status] ?? 0) + 1; });
    return c;
  }, [messages]);

  const openMessage = (m: ContactMessage) => {
    setActive(m);
    setNextStatus(m.status);
    setAssigneeId(m.assignedToId ?? '');
  };

  const handleSave = async () => {
    if (!active) return;
    setSaving(true);
    try {
      await apiClient.patch(`/admin/contacts`, {
        id: active.id,
        status: nextStatus || active.status,
        assignedToId: assigneeId || null,
      });
      pushToast({ message: 'Message updated.', type: 'success' });
      setMessages(prev => prev.map(m => m.id === active.id
        ? { ...m, status: nextStatus || m.status, assignedToId: assigneeId || null, assignee: staff.find(s => s.id === assigneeId) ? { name: staff.find(s => s.id === assigneeId)!.name } : null }
        : m,
      ));
      setActive(null);
    } catch (e: any) {
      pushToast({ message: e?.message ?? 'Failed to update message.', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-xs font-bold uppercase tracking-[0.18em] text-gold">Admin · Messages</div>
            <h1 className="mt-1 text-2xl font-extrabold text-navy sm:text-3xl">Contact Inbox</h1>
            <p className="mt-1 text-sm text-slate-500">Manage inquiries from the public contact form.</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {(['new', 'assigned', 'replied', 'closed', 'spam'] as const).map(s => (
            <button
              key={s}
              onClick={() => setStatus(status === s ? 'all' : s)}
              className={cn(
                'rounded-xl border p-3 text-left transition',
                status === s ? 'border-gold bg-gold/5' : 'border-slate-200 bg-white hover:border-slate-300',
              )}
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{s}</p>
              <p className="text-2xl font-extrabold text-navy">{counts[s] ?? 0}</p>
            </button>
          ))}
        </div>

        <Card className="border-slate-200">
          <CardHeader className="border-b border-slate-100">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle className="flex items-center gap-2 text-navy"><Inbox className="h-4 w-4 text-gold" /> Messages</CardTitle>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    placeholder="Search messages..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-9 sm:w-72"
                  />
                </div>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger className="w-full sm:w-44">
                    <Filter className="h-3 w-3 mr-1" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="space-y-3 p-4">
                {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}
              </div>
            ) : filtered.length === 0 ? (
              <div className="p-6">
                <EmptyState icon={<MessageSquare className="h-5 w-5" />} title="No messages found" description="New contact form submissions will appear here." />
              </div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {filtered.map(m => (
                  <li key={m.id}>
                    <button onClick={() => openMessage(m)} className="flex w-full items-start gap-3 p-4 text-left transition hover:bg-slate-50 sm:p-6">
                      <div className="grid h-10 w-10 flex-shrink-0 place-items-center rounded-full bg-navy text-sm font-bold text-white">
                        {m.name?.[0]?.toUpperCase() ?? '?'}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-bold text-navy">{m.name}</p>
                          <StatusBadge status={m.status} />
                          {m.assignee && <Badge variant="secondary" className="text-xs">{m.assignee.name}</Badge>}
                          <span className="ml-auto text-xs text-slate-400">{timeAgo(m.createdAt)}</span>
                        </div>
                        <p className="mt-0.5 text-sm font-semibold text-navy-soft">{m.subject}</p>
                        <p className="mt-1 line-clamp-2 text-sm text-slate-600">{m.message}</p>
                        <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                          <span className="inline-flex items-center gap-1"><Mail className="h-3 w-3" /> {m.email}</span>
                          {m.phone && <span className="inline-flex items-center gap-1"><Phone className="h-3 w-3" /> {m.phone}</span>}
                          <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" /> {formatDate(m.createdAt)}</span>
                        </div>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Message Detail / Assign Dialog */}
      <Dialog open={!!active} onOpenChange={(o) => !o && setActive(null)}>
        <DialogContent className="sm:max-w-2xl">
          {active && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-navy">
                  <MessageSquare className="h-4 w-4 text-gold" /> {active.subject}
                </DialogTitle>
                <DialogDescription className="text-left">
                  From <strong className="text-navy">{active.name}</strong> · {active.email}{active.phone ? ` · ${active.phone}` : ''}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="whitespace-pre-wrap text-sm text-slate-700">{active.message}</p>
                  <p className="mt-3 text-xs text-slate-400">Received {formatDate(active.createdAt, true)}</p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>Assign to</Label>
                    <Select value={assigneeId || '__none__'} onValueChange={(v) => setAssigneeId(v === '__none__' ? '' : v)}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Unassigned" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">— Unassigned —</SelectItem>
                        {staff.filter(s => Boolean(s?.id)).map(s => <SelectItem key={s.id} value={s.id}>{s.name} · {s.role}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Status</Label>
                    <Select value={nextStatus || active.status} onValueChange={setNextStatus}>
                      <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="new">New</SelectItem>
                        <SelectItem value="assigned">Assigned</SelectItem>
                        <SelectItem value="replied">Replied</SelectItem>
                        <SelectItem value="closed">Closed</SelectItem>
                        <SelectItem value="spam">Spam</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              <DialogFooter className="gap-2">
                <Button variant="ghost" size="md" onClick={() => setActive(null)}>Cancel</Button>
                <Button variant="light" size="md" onClick={() => window.location.assign(`mailto:${active.email}?subject=RE: ${active.subject}`)}>
                  <Mail className="h-4 w-4" /> Reply via Email
                </Button>
                <Button variant="primary" size="md" onClick={handleSave} disabled={saving}>
                  <CheckCircle2 className="h-4 w-4" /> {saving ? 'Saving...' : 'Save changes'}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
