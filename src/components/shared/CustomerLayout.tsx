'use client';

import { useAppStore, type ViewKey } from '@/stores/app-store';
import { cn } from '@/lib/utils';
import { LogoMark } from './Logo';
import { apiClient } from '@/lib/api-client';
import {
  LayoutDashboard, FileText, ShoppingCart, Wallet, Bell, User,
  LogOut, Menu, Home as HomeIcon,
} from 'lucide-react';
import { useState, useEffect } from 'react';

const NAV: { label: string; view: ViewKey; icon: React.ReactNode }[] = [
  { label: 'Dashboard', view: 'customer-dashboard', icon: <LayoutDashboard className="h-4 w-4" /> },
  { label: 'My Quotations', view: 'customer-quotations', icon: <FileText className="h-4 w-4" /> },
  { label: 'My Orders', view: 'customer-orders', icon: <ShoppingCart className="h-4 w-4" /> },
  { label: 'Payments', view: 'customer-payments', icon: <Wallet className="h-4 w-4" /> },
  { label: 'Notifications', view: 'customer-notifications', icon: <Bell className="h-4 w-4" /> },
  { label: 'Profile', view: 'customer-profile', icon: <User className="h-4 w-4" /> },
];

export function CustomerLayout({ children }: { children: React.ReactNode }) {
  const { user, view, navigate, logout, setUser, pushToast } = useAppStore();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    apiClient.get<{ unreadCount: number }>('/notifications?unread=true').then((d: any) => {
      setUnreadCount(d?.unreadCount ?? 0);
    }).catch(() => {});
  }, [view]);

  const handleLogout = async () => {
    try { await apiClient.post('/auth/logout'); } catch {}
    setUser(null);
    navigate('home');
    pushToast({ message: 'Signed out successfully.', type: 'info' });
  };

  const sidebar = (
    <div className="flex h-full flex-col">
      <button onClick={() => navigate('customer-dashboard')} className="flex items-center gap-3 border-b border-white/10 p-4 text-left">
        <LogoMark />
        <div className="leading-tight">
          <strong className="block text-sm font-bold text-white">Customer Portal</strong>
          <small className="text-xs text-white/50">{user?.customer?.customerNumber ?? 'CUS-—'}</small>
        </div>
      </button>

      <nav className="sidebar-scroll flex-1 overflow-y-auto p-3">
        {NAV.map((item) => (
          <button
            key={item.view}
            onClick={() => { navigate(item.view); setMobileOpen(false); }}
            className={cn(
              'mb-0.5 flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm font-semibold transition-colors',
              view === item.view || view.startsWith(item.view.split('-')[0] + '-') ? 'bg-white/10 text-white' : 'text-white/70 hover:bg-white/5 hover:text-white',
            )}
          >
            <span className="flex items-center gap-3">{item.icon}{item.label}</span>
            {item.view === 'customer-notifications' && unreadCount > 0 && (
              <span className="grid h-5 min-w-5 place-items-center rounded-full bg-rose-500 px-1.5 text-[0.65rem] font-bold text-white">{unreadCount}</span>
            )}
          </button>
        ))}
      </nav>

      <div className="border-t border-white/10 p-3">
        <div className="mb-2 flex items-center gap-3 rounded-lg bg-white/5 p-3">
          <div className="grid h-9 w-9 place-items-center rounded-full bg-gold text-sm font-bold text-navy">{user?.name?.[0] ?? 'C'}</div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-white">{user?.name}</p>
            <p className="truncate text-xs text-white/50">{user?.email}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => navigate('home')} className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-sm font-semibold text-white/70 hover:bg-white/5 hover:text-white">
            <HomeIcon className="h-4 w-4" /> Site
          </button>
          <button onClick={handleLogout} className="flex items-center justify-center gap-2 rounded-lg border border-rose-300/20 bg-rose-500/10 px-3 py-2 text-sm font-semibold text-rose-300 hover:bg-rose-500/20">
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 bg-gradient-to-b from-navy to-[#111827] lg:block">
        {sidebar}
      </aside>

      {mobileOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setMobileOpen(false)} />
          <aside className="fixed inset-y-0 left-0 z-50 w-72 bg-gradient-to-b from-navy to-[#111827] lg:hidden">
            {sidebar}
          </aside>
        </>
      )}

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
          <div className="flex items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
            <div className="flex items-center gap-3">
              <button onClick={() => setMobileOpen(true)} className="rounded-lg p-2 text-navy hover:bg-slate-100 lg:hidden">
                <Menu className="h-5 w-5" />
              </button>
              <h1 className="text-lg font-bold text-navy">{NAV.find((n) => view === n.view || view.startsWith(n.view + '-'))?.label ?? 'Dashboard'}</h1>
            </div>
            <button onClick={() => navigate('quote')} className="rounded-xl bg-gold px-4 py-2 text-sm font-bold text-navy hover:brightness-110">
              Request a Quote
            </button>
          </div>
        </header>

        <div className="p-4 sm:p-6 lg:p-8">{children}</div>
      </div>
    </div>
  );
}
