'use client';

import { useAppStore, type ViewKey } from '@/stores/app-store';
import { cn } from '@/lib/utils';
import { Logo } from './Logo';
import { NavButton } from './Button';
import { Toaster } from './Toaster';
import { Menu, X, Home, FileText, MapPin, LogIn, Bell, LayoutDashboard, LogOut, User } from 'lucide-react';
import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';

const PUBLIC_NAV: { label: string; view: ViewKey }[] = [
  { label: 'Home', view: 'home' },
  { label: 'Publishing', view: 'publishing' },
  { label: 'Books', view: 'books' },
  { label: 'Printing', view: 'printing' },
  { label: 'Branding', view: 'branding' },
  { label: 'Cyber', view: 'cyber' },
  { label: 'Portfolio', view: 'portfolio' },
  { label: 'Quote', view: 'quote' },
  { label: 'Contact', view: 'contact' },
];

function isAdminRole(role: string | undefined) {
  return role && !['CUSTOMER', 'AUTHOR'].includes(role);
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, view, navigate, logout, mobileNavOpen, setMobileNavOpen, setUser } = useAppStore();
  const [scrolled, setScrolled] = useState(false);
  const [notifCount, setNotifCount] = useState(0);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (user) {
      // Fetch unread notification count
      apiClient.get<{ unreadCount: number }>('/notifications?unread=true').then((d: any) => {
        setNotifCount(d?.unreadCount ?? 0);
      }).catch(() => {});
    } else {
      setNotifCount(0);
    }
  }, [user, view]);

  const handleLogout = async () => {
    try { await apiClient.post('/auth/logout'); } catch {}
    setUser(null);
    navigate('home');
    useAppStore.getState().pushToast({ message: 'Signed out successfully.', type: 'info' });
  };

  const isPortalView = view.startsWith('admin-') || view.startsWith('customer-') || view.startsWith('author-');

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Toaster />

      {/* Top bar (public only, hidden on mobile) */}
      {!isPortalView && (
        <div className="hidden bg-navy text-white md:block">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-2 text-xs sm:px-6 lg:px-8">
            <span>📍 Nairobi, Kenya · Serving authors, businesses and institutions</span>
            <div className="flex items-center gap-4">
              <a href="tel:+254700000000" className="text-white/80 hover:text-white">+254 700 000 000</a>
              <a href="mailto:hello@printpublish.co.ke" className="text-white/80 hover:text-white">hello@printpublish.co.ke</a>
              <button onClick={() => navigate('track-order')} className="text-white/80 hover:text-white">Track Order</button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className={cn('sticky top-0 z-40 border-b bg-white/95 backdrop-blur transition-shadow', scrolled ? 'shadow-md border-slate-200' : 'border-transparent', isPortalView && 'border-slate-200')}>
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8 lg:h-20">
          <button onClick={() => navigate(user ? (isAdminRole(user.role) ? 'admin-dashboard' : user.role === 'AUTHOR' ? 'author-dashboard' : 'customer-dashboard') : 'home')} className="flex-shrink-0">
            <Logo />
          </button>

          {/* Desktop nav (public) */}
          {!isPortalView && (
            <nav className="hidden items-center gap-5 lg:flex">
              {PUBLIC_NAV.map((n) => (
                <button
                  key={n.view}
                  onClick={() => navigate(n.view)}
                  className={cn('text-sm font-semibold transition-colors', view === n.view ? 'text-gold' : 'text-navy-soft hover:text-gold')}
                >
                  {n.label}
                </button>
              ))}
            </nav>
          )}

          {/* Desktop actions */}
          <div className="hidden items-center gap-2 lg:flex">
            {user ? (
              <>
                <button
                  onClick={() => navigate(user.role === 'AUTHOR' ? 'author-dashboard' : isAdminRole(user.role) ? 'admin-dashboard' : 'customer-dashboard')}
                  className="relative rounded-xl p-2 text-navy-soft hover:bg-slate-100"
                  aria-label="Notifications"
                >
                  <Bell className="h-5 w-5" />
                  {notifCount > 0 && <span className="absolute right-1 top-1 grid h-4 min-w-4 place-items-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">{notifCount}</span>}
                </button>
                <NavButton to={user.role === 'AUTHOR' ? 'author-dashboard' : isAdminRole(user.role) ? 'admin-dashboard' : 'customer-dashboard'} variant="primary" size="md">
                  <LayoutDashboard className="h-4 w-4" /> Dashboard
                </NavButton>
                <button onClick={handleLogout} className="rounded-xl p-2 text-navy-soft hover:bg-rose-50 hover:text-rose-600" aria-label="Sign out" title="Sign out">
                  <LogOut className="h-5 w-5" />
                </button>
              </>
            ) : (
              <>
                <button onClick={() => navigate('track-order')} className="text-sm font-semibold text-navy-soft hover:text-gold">Track Order</button>
                <NavButton to="login" variant="ghost" size="md"><LogIn className="h-4 w-4" /> Login</NavButton>
                <NavButton to="quote" variant="accent" size="md">Request a Quote</NavButton>
              </>
            )}
          </div>

          {/* Mobile menu toggle */}
          <button className="lg:hidden rounded-xl p-2 text-navy hover:bg-slate-100" onClick={() => setMobileNavOpen(!mobileNavOpen)} aria-label="Menu">
            {mobileNavOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {/* Mobile nav drawer */}
        {mobileNavOpen && (
          <div className="lg:hidden border-t border-slate-200 bg-white">
            <nav className="mx-auto max-w-7xl px-4 py-4 sm:px-6">
              <div className="grid grid-cols-2 gap-2">
                {PUBLIC_NAV.map((n) => (
                  <button
                    key={n.view}
                    onClick={() => navigate(n.view)}
                    className={cn('rounded-lg px-3 py-2 text-left text-sm font-semibold', view === n.view ? 'bg-navy text-white' : 'text-navy-soft hover:bg-slate-100')}
                  >
                    {n.label}
                  </button>
                ))}
              </div>
              <div className="mt-4 flex flex-col gap-2 border-t border-slate-100 pt-4">
                {user ? (
                  <>
                    <NavButton to={user.role === 'AUTHOR' ? 'author-dashboard' : isAdminRole(user.role) ? 'admin-dashboard' : 'customer-dashboard'} variant="primary" size="md" className="w-full">
                      <LayoutDashboard className="h-4 w-4" /> Dashboard
                    </NavButton>
                    <NavButton to="track-order" variant="ghost" size="md" className="w-full"><MapPin className="h-4 w-4" /> Track Order</NavButton>
                    <button onClick={handleLogout} className="flex w-full items-center justify-center gap-2 rounded-xl border border-rose-200 px-5 py-2.5 text-sm font-bold text-rose-600 hover:bg-rose-50">
                      <LogOut className="h-4 w-4" /> Sign Out
                    </button>
                  </>
                ) : (
                  <>
                    <NavButton to="login" variant="primary" size="md" className="w-full"><LogIn className="h-4 w-4" /> Login</NavButton>
                    <NavButton to="quote" variant="accent" size="md" className="w-full">Request a Quote</NavButton>
                    <NavButton to="track-order" variant="ghost" size="md" className="w-full"><MapPin className="h-4 w-4" /> Track Order</NavButton>
                  </>
                )}
              </div>
            </nav>
          </div>
        )}
      </header>

      {/* Main content */}
      <main className="flex-1">{children}</main>

      {/* Footer (public only) */}
      {!isPortalView && <PublicFooter />}

      {/* Mobile bottom nav (public only) */}
      {!isPortalView && (
        <nav className="fixed inset-x-0 bottom-0 z-40 flex justify-between gap-2 bg-navy/95 px-4 py-2.5 text-white backdrop-blur lg:hidden">
          <MobileLink icon={<Home className="h-5 w-5" />} label="Home" view="home" active={view === 'home'} />
          <MobileLink icon={<FileText className="h-5 w-5" />} label="Quote" view="quote" active={view === 'quote'} />
          <MobileLink icon={<MapPin className="h-5 w-5" />} label="Track" view="track-order" active={view === 'track-order'} />
          {user ? (
            <MobileLink icon={<LayoutDashboard className="h-5 w-5" />} label="Dashboard" view={user.role === 'AUTHOR' ? 'author-dashboard' : isAdminRole(user.role) ? 'admin-dashboard' : 'customer-dashboard'} active={false} />
          ) : (
            <MobileLink icon={<User className="h-5 w-5" />} label="Login" view="login" active={view === 'login'} />
          )}
        </nav>
      )}

      {/* Spacer so mobile bottom nav doesn't overlap content */}
      {!isPortalView && <div className="h-16 lg:hidden" />}
    </div>
  );
}

function MobileLink({ icon, label, view, active }: { icon: React.ReactNode; label: string; view: ViewKey; active: boolean }) {
  const navigate = useAppStore((s) => s.navigate);
  return (
    <button onClick={() => navigate(view)} className={cn('flex flex-1 flex-col items-center gap-0.5 rounded-lg py-1 text-[0.7rem] font-medium transition-colors', active ? 'text-gold' : 'text-white/80')}>
      {icon}
      {label}
    </button>
  );
}

function PublicFooter() {
  const navigate = useAppStore((s) => s.navigate);
  return (
    <footer className="mt-auto bg-navy text-white">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <div className="grid grid-cols-2 gap-8 lg:grid-cols-4">
          <div className="col-span-2 lg:col-span-1">
            <Logo light />
            <p className="mt-4 max-w-xs text-sm text-white/70">
              Professional publishing, printing and branding solutions for authors, business teams and institutions across Kenya.
            </p>
          </div>
          <div>
            <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-white">Quick Links</h3>
            <ul className="space-y-2 text-sm text-white/70">
              {['publishing', 'printing', 'branding', 'cyber'].map((v) => (
                <li key={v}><button onClick={() => navigate(v as ViewKey)} className="capitalize hover:text-gold">{v}</button></li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-white">Customer Support</h3>
            <ul className="space-y-2 text-sm text-white/70">
              <li><button onClick={() => navigate('portfolio')} className="hover:text-gold">Portfolio</button></li>
              <li><button onClick={() => navigate('books')} className="hover:text-gold">Books</button></li>
              <li><button onClick={() => navigate('quote')} className="hover:text-gold">Request Quote</button></li>
              <li><button onClick={() => navigate('contact')} className="hover:text-gold">Contact</button></li>
            </ul>
          </div>
          <div>
            <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-white">Follow Us</h3>
            <ul className="space-y-2 text-sm text-white/70">
              <li>Instagram</li>
              <li>Facebook</li>
              <li>LinkedIn</li>
              <li>WhatsApp</li>
            </ul>
          </div>
        </div>
        <div className="mt-10 border-t border-white/10 pt-6 text-center text-xs text-white/50">
          © {new Date().getFullYear()} Print & Publish Co. All rights reserved. · Nairobi, Kenya
        </div>
      </div>
    </footer>
  );
}
