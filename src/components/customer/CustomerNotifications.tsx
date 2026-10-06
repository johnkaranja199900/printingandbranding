'use client';

import { useCallback, useEffect, useState } from 'react';
import { CustomerLayout } from '@/components/shared/CustomerLayout';
import { Button } from '@/components/shared/Button';
import { Eyebrow, EmptyState } from '@/components/shared/primitives';
import { apiClient } from '@/lib/api-client';
import { useAppStore, type ViewKey } from '@/stores/app-store';
import { timeAgo } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Bell, BellOff, CheckCheck, Info, CheckCircle2, AlertTriangle, XCircle, ChevronRight,
} from 'lucide-react';

// ---------- API types ----------
interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  link?: string | null;
  isRead: boolean;
  createdAt: string;
}
interface NotifResponse { items: Notification[]; unreadCount: number }

// ---------- Component ----------
export function CustomerNotifications() {
  const { navigate, pushToast } = useAppStore();
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [markingAll, setMarkingAll] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get<NotifResponse>('/notifications');
      setItems(res.items ?? []);
    } catch (e: any) {
      pushToast({ message: e.message ?? 'Failed to load notifications.', type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [pushToast]);

  useEffect(() => { load(); }, [load]);

  const markRead = async (n: Notification) => {
    if (!n.isRead) {
      try {
        await apiClient.patch(`/notifications/${n.id}`, {});
        setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, isRead: true } : x)));
      } catch {
        // ignore — still navigate
      }
    }
    if (n.link) {
      navigate(n.link as ViewKey);
    }
  };

  const markAllRead = async () => {
    const unread = items.filter((n) => !n.isRead);
    if (!unread.length) return;
    setMarkingAll(true);
    try {
      await Promise.all(unread.map((n) => apiClient.patch(`/notifications/${n.id}`, {})));
      setItems((prev) => prev.map((x) => ({ ...x, isRead: true })));
      pushToast({ message: 'All notifications marked as read.', type: 'success' });
    } catch (e: any) {
      pushToast({ message: e.message ?? 'Failed to mark all as read.', type: 'error' });
    } finally {
      setMarkingAll(false);
    }
  };

  const unreadCount = items.filter((n) => !n.isRead).length;

  return (
    <CustomerLayout>
      <div className="mb-6 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Eyebrow>Customer Portal</Eyebrow>
          <h1 className="text-2xl font-extrabold text-navy sm:text-3xl">Notifications</h1>
          <p className="text-sm text-slate-500">
            {unreadCount > 0 ? `You have ${unreadCount} unread notification${unreadCount === 1 ? '' : 's'}.` : 'You\'re all caught up.'}
          </p>
        </div>
        {unreadCount > 0 && (
          <Button variant="light" size="sm" onClick={markAllRead} disabled={markingAll}>
            <CheckCheck className="h-4 w-4" />
            {markingAll ? 'Marking...' : 'Mark all as read'}
          </Button>
        )}
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-2xl" />)}
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={<BellOff className="h-5 w-5" />}
          title="No notifications yet"
          description="Order updates, payment confirmations and announcements will appear here."
        />
      ) : (
        <div className="space-y-2">
          {items.map((n) => {
            const Icon = iconFor(n.type);
            const color = colorFor(n.type);
            return (
              <button
                key={n.id}
                onClick={() => markRead(n)}
                className={`flex w-full items-start gap-3 rounded-2xl border bg-white p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md ${
                  n.isRead ? 'border-slate-200' : 'border-gold/40 bg-gold-soft/5'
                }`}
              >
                <span className={`mt-0.5 grid h-9 w-9 flex-shrink-0 place-items-center rounded-full ${color}`}>
                  <Icon className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-bold text-navy">{n.title}</p>
                    {!n.isRead && <span className="h-2 w-2 flex-shrink-0 rounded-full bg-gold" />}
                  </div>
                  <p className="mt-0.5 text-sm text-slate-600">{n.message}</p>
                  <p className="mt-1 text-[0.7rem] text-slate-400">{timeAgo(n.createdAt)}</p>
                </div>
                {n.link && <ChevronRight className="mt-1 h-4 w-4 flex-shrink-0 text-slate-400" />}
              </button>
            );
          })}
        </div>
      )}
    </CustomerLayout>
  );
}

export default CustomerNotifications;

// ---------- Helpers ----------
function iconFor(type: string) {
  switch (type) {
    case 'success': return CheckCircle2;
    case 'warning': return AlertTriangle;
    case 'error': return XCircle;
    default: return Info;
  }
}
function colorFor(type: string) {
  switch (type) {
    case 'success': return 'bg-emerald-100 text-emerald-700';
    case 'warning': return 'bg-amber-100 text-amber-700';
    case 'error': return 'bg-rose-100 text-rose-700';
    default: return 'bg-sky-100 text-sky-700';
  }
}
