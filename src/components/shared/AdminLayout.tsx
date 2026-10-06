'use client';

import { useAppStore, type ViewKey } from '@/stores/app-store';
import { cn } from '@/lib/utils';
import { LogoMark } from './Logo';
import { apiClient } from '@/lib/api-client';
import {
  LayoutDashboard, ShoppingCart, FileText, BarChart3, Boxes, BookOpen,
  Image, Bell, Settings, Users, Shield, MessageSquare, LogOut, Menu, X, Search, Bot,
} from 'lucide-react';
import { useState, useEffect } from 'react';

interface NavItem { label: string; view: ViewKey; icon: React.ReactNode; badge?: number }

const NAV_GROUPS: { title: string; items: NavItem[] }[] = [
  {
    title: 'Overview',
    items: [
      { label: 'Dashboard', view: 'admin-dashboard', icon: <LayoutDashboard className="h-4 w-4" /> },
      { label: 'Orders', view: 'admin-orders', icon: <ShoppingCart className="h-4 w-4" /> },
      { label: 'Quotations', view: 'admin-quotations', icon: <FileText className="h-4 w-4" /> },
      { label: 'Sales', view: 'admin-sales', icon: <BarChart3 className="h-4 w-4" /> },
    ],
  },
  {
    title: 'Operations',
    items: [
      { label: 'Inventory', view: 'admin-inventory', icon: <Boxes className="h-4 w-4" /> },
      { label: 'Publishing', view: 'admin-publishing', icon: <BookOpen className="h-4 w-4" /> },
      { label: 'Portfolio', view: 'admin-portfolio', icon: <Image className="h-4 w-4" /> },
      { label: 'Notifications', view: 'admin-notifications', icon: <Bell className="h-4 w-4" /> },
    ],
  },
  {
    title: 'Engagement',
    items: [
      { label: 'WhatsApp Bot', view: 'admin-whatsapp-bot', icon: <Bot className="h-4 w-4" /> },
    ],
  },
  {
    title: 'Administration',
    items: [
      { label: 'Reports', view: 'admin-reports', icon: <BarChart3 className="h-4 w-4" /> },
      { label: 'Customers', view: 'admin-customers', icon: <Users className="h-4 w-4" /> },
      { label: 'Staff', view: 'admin-staff', icon: <Users className="h-4 w-4" /> },
      { label: 'Messages', view: 'admin-contacts', icon: <MessageSquare className="h-4 w-4" /> },
      { label: 'Audit Log', view: 'admin-audit', icon: <Shield className="h-4 w-4" /> },
      { label: 'Settings', view: 'admin-settings', icon: <Settings className="h-4 w-4" /> },
    ],
  },
];

export function AdminLayout({ children }: { children: React.ReactNode }) {
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
      <button onClick={() => navigate('admin-dashboard')} className="flex items-center gap-3 border-b border-white/10 p-4 text-left">
        <LogoMark />
        <div className="leading-tight">
          <strong className="block text-sm font-bold text-white">Print & Publish</strong>
          <small className="text-xs text-white/50">Admin Console</small>
        </div>
      </button>

      <div className="sidebar-scroll flex-1 overflow-y-auto p-3">
        {NAV_GROUPS.map((group) => (
          <div key={group.title} className="mb-4">
            <div className="px-3 py-2 text-[0.7rem] font-bold uppercase tracking-[0.14em] text-white/40">{group.title}</div>
            {group.items.map((item) => (
              <button
                key={item.view}
                onClick={() => { navigate(item.view); setMobileOpen(false); }}
                className={cn(
                  'mb-0.5 flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm font-semibold transition-colors',
                  view === item.view ? 'bg-white/10 text-white' : 'text-white/70 hover:bg-white/5 hover:text-white',
                )}
              >
                <span className="flex items-center gap-3">{item.icon}{item.label}</span>
                {item.view === 'admin-notifications' && unreadCount > 0 && (
                  <span className="grid h-5 min-w-5 place-items-center rounded-full bg-rose-500 px-1.5 text-[0.65rem] font-bold text-white">{unreadCount}</span>
                )}
              </button>
            ))}
          </div>
        ))}
      </div>

      <div className="border-t border-white/10 p-3">
        <div className="mb-2 flex items-center gap-3 rounded-lg bg-white/5 p-3">
          <div className="grid h-9 w-9 place-items-center rounded-full bg-gold text-sm font-bold text-navy">{user?.name?.[0] ?? 'A'}</div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-white">{user?.name}</p>
            <p className="truncate text-xs text-white/50 capitalize">{user?.role.replace(/_/g, ' ').toLowerCase()}</p>
          </div>
        </div>
        <button onClick={handleLogout} className="flex w-full items-center justify-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-sm font-semibold text-white/70 hover:bg-white/5 hover:text-white">
          <LogOut className="h-4 w-4" /> Sign Out
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 bg-gradient-to-b from-navy to-[#111827] lg:block">
        {sidebar}
      </aside>

      {/* Mobile sidebar drawer */}
      {mobileOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setMobileOpen(false)} />
          <aside className="fixed inset-y-0 left-0 z-50 w-72 bg-gradient-to-b from-navy to-[#111827] lg:hidden">
            {sidebar}
          </aside>
        </>
      )}

      {/* Main */}
      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
          <div className="flex items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
            <div className="flex items-center gap-3">
              <button onClick={() => setMobileOpen(true)} className="rounded-lg p-2 text-navy hover:bg-slate-100 lg:hidden">
                <Menu className="h-5 w-5" />
              </button>
              <div className="hidden md:block">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search orders, customers, quotations..."
                    className="w-72 rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm focus:border-gold focus:bg-white focus:outline-none focus:ring-2 focus:ring-gold/20"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        const q = (e.target as HTMLInputElement).value;
                        if (q) navigate('admin-orders', { search: q });
                      }
                    }}
                  />
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => navigate('admin-notifications')} className="relative rounded-lg p-2 text-navy-soft hover:bg-slate-100">
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && <span className="absolute right-1 top-1 grid h-4 min-w-4 place-items-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">{unreadCount}</span>}
              </button>
              <button onClick={() => navigate('admin-dashboard')} className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-semibold text-navy hover:bg-slate-50">
                <div className="grid h-7 w-7 place-items-center rounded-full bg-gold text-xs font-bold text-navy">{user?.name?.[0] ?? 'A'}</div>
                <span className="hidden sm:inline">{user?.name?.split(' ')[0]}</span>
              </button>
            </div>
          </div>
        </header>

        <div className="p-4 sm:p-6 lg:p-8">{children}</div>
      </div>
    </div>
  );
}
