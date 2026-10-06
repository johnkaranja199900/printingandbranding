'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { CustomerLayout } from '@/components/shared/CustomerLayout';
import { Button } from '@/components/shared/Button';
import { Eyebrow } from '@/components/shared/primitives';
import { apiClient } from '@/lib/api-client';
import { useAppStore } from '@/stores/app-store';
import { toNumber } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import {
  User as UserIcon, Mail, Phone, Building2, Hash, BadgeCheck,
  Pencil, ShoppingBag, Wallet, Calendar, ShieldCheck,
} from 'lucide-react';

// ---------- API types ----------
interface Order {
  id: string;
  total: string | number;
  amountPaid: string | number;
  createdAt: string;
  status: string;
}
interface ListResponse<T> { data: T[]; meta: { total: number; page: number; pageSize: number; totalPages: number } }

// ---------- Component ----------
export function CustomerProfile() {
  const { user, pushToast } = useAppStore();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get<ListResponse<Order>>('/orders?pageSize=50');
      setOrders(res.data ?? []);
    } catch (e: any) {
      pushToast({ message: e.message ?? 'Failed to load profile stats.', type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [pushToast]);

  useEffect(() => { load(); }, [load]);

  const totalOrders = orders.length;
  const totalSpent = useMemo(() => orders.reduce((s, o) => s + toNumber(o.amountPaid), 0), [orders]);
  const oldestOrder = useMemo(() => {
    if (!orders.length) return null;
    return orders.reduce((a, b) => (new Date(a.createdAt) < new Date(b.createdAt) ? a : b));
  }, [orders]);

  const customer = user?.customer;

  return (
    <CustomerLayout>
      <div className="mb-6 flex flex-col gap-1">
        <Eyebrow>Customer Portal</Eyebrow>
        <h1 className="text-2xl font-extrabold text-navy sm:text-3xl">My Profile</h1>
        <p className="text-sm text-slate-500">Your account information and summary.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Profile card */}
        <div className="lg:col-span-2">
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center gap-4 border-b border-slate-100 p-5">
              <div className="grid h-16 w-16 place-items-center rounded-full bg-navy text-2xl font-bold text-gold">
                {user?.name?.[0] ?? 'C'}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h2 className="truncate text-lg font-extrabold text-navy">{user?.name}</h2>
                  <BadgeCheck className="h-5 w-5 text-gold" />
                </div>
                <p className="text-sm text-slate-500">{user?.email}</p>
                <p className="mt-0.5 text-xs font-semibold uppercase tracking-wide text-gold">
                  {customer?.customerType ?? 'Customer'}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="hidden sm:inline-flex"
                onClick={() => pushToast({ message: 'Profile editing coming soon.', type: 'info' })}
              >
                <Pencil className="h-4 w-4" /> Edit
              </Button>
            </div>

            <div className="grid grid-cols-1 gap-px bg-slate-100 sm:grid-cols-2">
              <InfoRow icon={<UserIcon className="h-4 w-4" />} label="Full Name" value={user?.name ?? '—'} />
              <InfoRow icon={<Mail className="h-4 w-4" />} label="Email" value={user?.email ?? '—'} />
              <InfoRow icon={<Phone className="h-4 w-4" />} label="Phone" value={user?.phone ?? customer?.customerNumber ?? '—'} />
              <InfoRow icon={<ShieldCheck className="h-4 w-4" />} label="Role" value={user?.role ?? 'CUSTOMER'} />
              <InfoRow icon={<Hash className="h-4 w-4" />} label="Customer No." value={customer?.customerNumber ?? '—'} />
              <InfoRow icon={<Building2 className="h-4 w-4" />} label="Business Name" value={customer?.businessName ?? '—'} />
            </div>

            <div className="border-t border-slate-100 p-4 sm:hidden">
              <Button
                variant="outline" size="sm" className="w-full"
                onClick={() => pushToast({ message: 'Profile editing coming soon.', type: 'info' })}
              >
                <Pencil className="h-4 w-4" /> Edit Profile
              </Button>
            </div>
          </div>
        </div>

        {/* Account stats */}
        <div className="flex flex-col gap-3">
          {loading ? (
            <>
              <Skeleton className="h-24 rounded-2xl" />
              <Skeleton className="h-24 rounded-2xl" />
              <Skeleton className="h-24 rounded-2xl" />
            </>
          ) : (
            <>
              <StatTile
                icon={<Calendar className="h-5 w-5" />}
                accent="sky"
                label="Member Since"
                value={oldestOrder ? new Date(oldestOrder.createdAt).toLocaleDateString('en-KE', { year: 'numeric', month: 'short' }) : 'New'}
              />
              <StatTile
                icon={<ShoppingBag className="h-5 w-5" />}
                accent="amber"
                label="Total Orders"
                value={String(totalOrders)}
              />
              <StatTile
                icon={<Wallet className="h-5 w-5" />}
                accent="emerald"
                label="Total Spent"
                value={`KES ${totalSpent.toLocaleString('en-KE', { maximumFractionDigits: 0 })}`}
              />
            </>
          )}
        </div>
      </div>
    </CustomerLayout>
  );
}

export default CustomerProfile;

// ---------- Sub components ----------
function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3 bg-white p-4">
      <span className="mt-0.5 grid h-8 w-8 flex-shrink-0 place-items-center rounded-lg bg-slate-100 text-navy">{icon}</span>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-bold uppercase tracking-wide text-slate-400">{label}</p>
        <p className="truncate text-sm font-semibold text-navy">{value}</p>
      </div>
    </div>
  );
}

function StatTile({
  icon, label, value, accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  accent: 'emerald' | 'sky' | 'amber';
}) {
  const accentBg: Record<string, string> = {
    emerald: 'bg-emerald-100 text-emerald-700',
    sky: 'bg-sky-100 text-sky-700',
    amber: 'bg-amber-100 text-amber-700',
  };
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <span className={`grid h-11 w-11 place-items-center rounded-xl ${accentBg[accent]}`}>{icon}</span>
      <div>
        <p className="text-lg font-extrabold text-navy">{value}</p>
        <p className="text-xs font-medium text-slate-500">{label}</p>
      </div>
    </div>
  );
}
