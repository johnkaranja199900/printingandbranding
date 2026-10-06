'use client';

import { useState } from 'react';
import { useAppStore } from '@/stores/app-store';
import { apiClient } from '@/lib/api-client';
import { Button } from '@/components/shared/Button';
import { LogoMark } from '@/components/shared/Logo';
import { Eye, EyeOff, LogIn, ShieldCheck, User } from 'lucide-react';

export function LoginView() {
  const { navigate, setUser, pushToast, params } = useAppStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);

  const fillDemo = (role: 'admin' | 'customer') => {
    setEmail(role === 'admin' ? 'admin@printpublish.co.ke' : 'jane.njeri@example.com');
    setPassword(role === 'admin' ? 'admin123' : 'password123');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) { pushToast({ message: 'Email and password are required.', type: 'warning' }); return; }
    setLoading(true);
    try {
      // 1. Authenticate — login API sets the session cookie
      const res = await apiClient.post<{ id: string; email: string; name: string; role: string }>('/auth/login', { email, password });
      // 2. Fetch full user profile (includes customer/author linkage)
      const me = await apiClient.get<any>('/auth/me');
      const role = (me as any)?.role ?? res.role;

      // 3. Determine the role-based default portal
      let defaultPortal: string;
      if (role === 'AUTHOR') defaultPortal = 'author-dashboard';
      else if (role && !['CUSTOMER', 'AUTHOR'].includes(role)) defaultPortal = 'admin-dashboard';
      else defaultPortal = 'customer-dashboard';

      // 4. Use params.redirect ONLY if it's valid for this user's role
      //    (prevents a customer being redirected to an admin page, etc.)
      const redirect = params.redirect as string | undefined;
      const isValidRedirect = (r: string) => {
        if (role === 'CUSTOMER') return r.startsWith('customer-');
        if (role === 'AUTHOR') return r.startsWith('author-') || r.startsWith('customer-');
        return r.startsWith('admin-'); // staff roles
      };
      const target = redirect && isValidRedirect(redirect) ? redirect : defaultPortal;

      // 5. Set user FIRST (enables portal access in the render guard),
      //    THEN navigate to the target portal view.
      setUser(me as any);
      navigate(target as any, {}); // clear params (esp. redirect) on navigate
      pushToast({ message: `Welcome back, ${res.name.split(' ')[0]}!`, type: 'success' });
    } catch (e: any) {
      pushToast({ message: e.message ?? 'Login failed.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-gradient-to-br from-slate-100 via-white to-slate-200 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-2xl">
          <div className="text-center">
            <div className="mx-auto mb-4"><LogoMark /></div>
            <h1 className="text-2xl font-extrabold text-navy">Welcome back</h1>
            <p className="mt-1 text-sm text-slate-500">Sign in to your account to continue</p>
          </div>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-bold text-navy">Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm focus:border-gold focus:bg-white focus:outline-none focus:ring-2 focus:ring-gold/20" placeholder="you@example.com" autoComplete="email" />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-bold text-navy">Password</label>
              <div className="relative">
                <input type={showPwd ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 pr-10 text-sm focus:border-gold focus:bg-white focus:outline-none focus:ring-2 focus:ring-gold/20" placeholder="••••••••" autoComplete="current-password" />
                <button type="button" onClick={() => setShowPwd(!showPwd)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <Button type="submit" variant="primary" size="lg" className="w-full" disabled={loading}>
              {loading ? 'Signing in...' : <>Sign In <LogIn className="h-4 w-4" /></>}
            </Button>
          </form>

          <div className="mt-6 rounded-xl bg-slate-50 p-4">
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">Demo accounts</p>
            <div className="grid gap-2">
              <button onClick={() => fillDemo('admin')} className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-2.5 text-left text-xs hover:border-gold">
                <ShieldCheck className="h-5 w-5 text-navy" />
                <div>
                  <p className="font-bold text-navy">Admin / Staff</p>
                  <p className="text-slate-500">admin@printpublish.co.ke · admin123</p>
                </div>
              </button>
              <button onClick={() => fillDemo('customer')} className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-2.5 text-left text-xs hover:border-gold">
                <User className="h-5 w-5 text-gold" />
                <div>
                  <p className="font-bold text-navy">Customer</p>
                  <p className="text-slate-500">jane.njeri@example.com · password123</p>
                </div>
              </button>
            </div>
          </div>

          <p className="mt-6 text-center text-sm text-slate-500">
            New here? <button onClick={() => navigate('register')} className="font-bold text-gold hover:underline">Create an account</button>
          </p>
        </div>
      </div>
    </div>
  );
}
