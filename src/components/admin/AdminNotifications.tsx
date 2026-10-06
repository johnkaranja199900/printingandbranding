'use client';

import { useEffect, useState, useMemo, type ReactNode } from 'react';
import { AdminLayout } from '@/components/shared/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/shared/Button';
import { EmptyState } from '@/components/shared/primitives';
import { Skeleton } from '@/components/ui/skeleton';
import { useAppStore, type ViewKey } from '@/stores/app-store';
import { apiClient } from '@/lib/api-client';
import { cn } from '@/lib/utils';
import { formatDate, timeAgo } from '@/lib/types';
import {
  Bell, CheckCheck, Inbox, Filter, CheckCircle2, AlertCircle, Info, AlertTriangle, Mail,
} from 'lucide-react';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  link?: string | null;
  isRead: boolean;
  createdAt: string;
}

const TYPE_ICON: Record<string, ReactNode> = {
  success: <CheckCircle2 className="h-4 w-4 text-emerald-500" />,
  error: <AlertCircle className="h-4 w-4 text-rose-500" />,
  warning: <AlertTriangle className="h-4 w-4 text-amber-500" />,
  info: <Info className="h-4 w-4 text-sky-500" />,
};

export default function AdminNotifications() {
  const { pushToast, navigate } = useAppStore();
  const [items, setItems] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [marking, setMarking] = useState(false);

  const fetchNotifs = async () => {
    setLoading(true);
    try {
      const data = await apiClient.get<{ items: Notification[]; unreadCount: number }>('/notifications');
      setItems(data?.items ?? []);
      setUnreadCount(data?.unreadCount ?? 0);
    } catch (e: any) {
      pushToast({ message: e?.message ?? 'Failed to load notifications.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchNotifs(); }, []);

  const visible = useMemo(
    () => filter === 'unread' ? items.filter(i => !i.isRead) : items,
    [items, filter],
  );

  const handleMarkAllRead = async () => {
    const unread = items.filter(i => !i.isRead);
    if (!unread.length) return;
    setMarking(true);
    try {
      await Promise.all(unread.map(n => apiClient.patch(`/notifications/${n.id}`)));
      setItems(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
      pushToast({ message: `Marked ${unread.length} notifications as read.`, type: 'success' });
    } catch (e: any) {
      pushToast({ message: e?.message ?? 'Failed to mark notifications.', type: 'error' });
    } finally {
      setMarking(false);
    }
  };

  const handleClick = async (n: Notification) => {
    if (!n.isRead) {
      try {
        await apiClient.patch(`/notifications/${n.id}`);
        setItems(prev => prev.map(x => x.id === n.id ? { ...x, isRead: true } : x));
        setUnreadCount(c => Math.max(0, c - 1));
      } catch {}
    }
    if (n.link) {
      navigate(n.link as ViewKey);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-xs font-bold uppercase tracking-[0.18em] text-gold">Admin · Notifications</div>
            <h1 className="mt-1 text-2xl font-extrabold text-navy sm:text-3xl">Notifications</h1>
            <p className="mt-1 text-sm text-slate-500">Stay on top of orders, payments, quotations and system alerts.</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1">
              <button
                onClick={() => setFilter('all')}
                className={cn('rounded-lg px-3 py-1.5 text-xs font-bold transition', filter === 'all' ? 'bg-navy text-white' : 'text-slate-600 hover:bg-slate-100')}
              >
                All
              </button>
              <button
                onClick={() => setFilter('unread')}
                className={cn('rounded-lg px-3 py-1.5 text-xs font-bold transition', filter === 'unread' ? 'bg-navy text-white' : 'text-slate-600 hover:bg-slate-100')}
              >
                Unread {unreadCount > 0 && <span className="ml-1 rounded-full bg-rose-500 px-1.5 py-0.5 text-[10px] text-white">{unreadCount}</span>}
              </button>
            </div>
            <Button
              variant="light"
              size="md"
              onClick={handleMarkAllRead}
              disabled={marking || unreadCount === 0}
            >
              <CheckCheck className="h-4 w-4" /> Mark all read
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatCard icon={<Bell className="h-5 w-5" />} label="Total" value={items.length} accent="navy" />
          <StatCard icon={<Mail className="h-5 w-5" />} label="Unread" value={unreadCount} accent="gold" />
          <StatCard icon={<CheckCheck className="h-5 w-5" />} label="Read" value={items.length - unreadCount} accent="emerald" />
          <StatCard icon={<AlertTriangle className="h-5 w-5" />} label="Alerts" value={items.filter(i => i.type === 'warning' || i.type === 'error').length} accent="rose" />
        </div>

        {/* List */}
        <Card className="overflow-hidden border-slate-200">
          <CardHeader className="border-b border-slate-100">
            <CardTitle className="flex items-center gap-2 text-navy">
              <Inbox className="h-4 w-4 text-gold" /> Inbox
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="space-y-3 p-4">
                {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}
              </div>
            ) : visible.length === 0 ? (
              <div className="p-6">
                <EmptyState
                  icon={<Bell className="h-5 w-5" />}
                  title={filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}
                  description={filter === 'unread' ? 'You are all caught up!' : 'System notifications will appear here once generated.'}
                />
              </div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {visible.map((n) => (
                  <li key={n.id}>
                    <button
                      onClick={() => handleClick(n)}
                      className={cn(
                        'flex w-full items-start gap-3 px-4 py-4 text-left transition-colors hover:bg-slate-50 sm:px-6',
                        !n.isRead && 'bg-gold/5',
                      )}
                    >
                      <div className={cn('mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full', n.isRead ? 'bg-slate-100' : 'bg-gold-soft/40')}>
                        {TYPE_ICON[n.type] ?? <Info className="h-4 w-4 text-sky-500" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className={cn('truncate text-sm', n.isRead ? 'font-semibold text-slate-700' : 'font-bold text-navy')}>{n.title}</p>
                          {!n.isRead && <span className="h-2 w-2 flex-shrink-0 rounded-full bg-gold" />}
                        </div>
                        <p className="mt-0.5 line-clamp-2 text-sm text-slate-600">{n.message}</p>
                        <p className="mt-1 text-xs text-slate-400">{timeAgo(n.createdAt)} · {formatDate(n.createdAt, true)}</p>
                      </div>
                      {n.link && (
                        <span className="hidden rounded-md bg-slate-100 px-2 py-1 text-[0.7rem] font-semibold text-slate-500 sm:inline-flex">
                          Open →
                        </span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}

function StatCard({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: number; accent: 'navy' | 'gold' | 'emerald' | 'rose' }) {
  const styles: Record<string, string> = {
    navy: 'bg-navy text-white',
    gold: 'bg-gold text-[#1a1508]',
    emerald: 'bg-emerald-600 text-white',
    rose: 'bg-rose-600 text-white',
  };
  return (
    <Card className="border-slate-200 p-4">
      <div className="flex items-center gap-3">
        <div className={cn('grid h-10 w-10 place-items-center rounded-xl', styles[accent])}>{icon}</div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
          <p className="text-xl font-extrabold text-navy">{value}</p>
        </div>
      </div>
    </Card>
  );
}
