'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ViewKey =
  // Public
  | 'home' | 'about' | 'publishing' | 'books' | 'printing' | 'branding'
  | 'cyber' | 'portfolio' | 'quote' | 'contact' | 'track-order' | 'book-detail'
  // Auth
  | 'login' | 'register'
  // Customer
  | 'customer-dashboard' | 'customer-quotations' | 'customer-orders'
  | 'customer-payments' | 'customer-profile' | 'customer-notifications'
  | 'customer-quote-detail' | 'customer-order-detail'
  // Author
  | 'author-dashboard' | 'author-books'
  // Admin
  | 'admin-dashboard' | 'admin-orders' | 'admin-quotations' | 'admin-sales'
  | 'admin-inventory' | 'admin-publishing' | 'admin-portfolio'
  | 'admin-notifications' | 'admin-reports' | 'admin-staff' | 'admin-settings'
  | 'admin-audit' | 'admin-contacts' | 'admin-customers'
  | 'admin-quote-detail' | 'admin-order-detail'
  | 'admin-whatsapp-bot';

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  phone?: string | null;
  role: string;
  avatarUrl?: string | null;
  customer?: { id: string; customerNumber: string; customerType: string; businessName?: string | null } | null;
  author?: { id: string; authorNumber: string; penName?: string | null } | null;
}

export interface Toast {
  id: string;
  title?: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
}

interface AppState {
  view: ViewKey;
  params: Record<string, string>;
  navigate: (view: ViewKey, params?: Record<string, string>) => void;

  user: SessionUser | null;
  setUser: (u: SessionUser | null) => void;
  logout: () => void;

  mobileNavOpen: boolean;
  setMobileNavOpen: (open: boolean) => void;

  toasts: Toast[];
  pushToast: (t: Omit<Toast, 'id'>) => void;
  dismissToast: (id: string) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      view: 'home',
      params: {},
      navigate: (view, params = {}) => {
        set({ view, params, mobileNavOpen: false });
        if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
      },
      user: null,
      setUser: (u) => set({ user: u }),
      logout: () => set({ user: null, view: 'home' }),
      mobileNavOpen: false,
      setMobileNavOpen: (open) => set({ mobileNavOpen: open }),
      toasts: [],
      pushToast: (t) => {
        const id = Math.random().toString(36).slice(2);
        set({ toasts: [...get().toasts, { ...t, id }] });
        setTimeout(() => get().dismissToast(id), 5000);
      },
      dismissToast: (id) => set({ toasts: get().toasts.filter((t) => t.id !== id) }),
    }),
    {
      name: 'pp-app-store',
      // Persist view + params so detail pages survive refresh, but STRIP
      // `redirect` — it's a one-shot login param and must not survive across
      // browser sessions (otherwise a customer could be redirected to an
      // admin page or vice-versa on next visit).
      partialize: (s) => {
        const { redirect: _drop, ...restParams } = s.params as any;
        return { view: s.view, params: restParams } as any;
      },
    },
  ),
);

export async function bootstrapSession() {
  try {
    const res = await fetch('/api/auth/me', { credentials: 'same-origin' });
    const json = await res.json();
    if (json.success && json.data) {
      useAppStore.getState().setUser(json.data as SessionUser);
    } else {
      useAppStore.getState().setUser(null);
    }
  } catch {
    useAppStore.getState().setUser(null);
  }
}
