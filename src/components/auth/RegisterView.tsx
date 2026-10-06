'use client';

import { useState } from 'react';
import { useAppStore } from '@/stores/app-store';
import { apiClient } from '@/lib/api-client';
import { Button } from '@/components/shared/Button';
import { LogoMark } from '@/components/shared/Logo';
import { UserPlus, BookUser, Building2 } from 'lucide-react';

export function RegisterView() {
  const { navigate, setUser, pushToast } = useAppStore();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [accountType, setAccountType] = useState<'customer' | 'author'>('customer');
  const [businessName, setBusinessName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !phone || !password) { pushToast({ message: 'All fields are required.', type: 'warning' }); return; }
    if (password.length < 8) { pushToast({ message: 'Password must be at least 8 characters.', type: 'warning' }); return; }
    setLoading(true);
    try {
      await apiClient.post('/auth/register', { name, email, phone, password, accountType, businessName: accountType === 'customer' ? businessName : undefined });
      const me = await apiClient.get('/auth/me');
      setUser(me as any);
      pushToast({ message: 'Account created! Welcome.', type: 'success' });
      navigate(accountType === 'author' ? 'author-dashboard' : 'customer-dashboard');
    } catch (e: any) {
      pushToast({ message: e.message ?? 'Registration failed.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-gradient-to-br from-slate-100 via-white to-slate-200 px-4 py-12">
      <div className="w-full max-w-lg">
        <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-2xl">
          <div className="text-center">
            <div className="mx-auto mb-4"><LogoMark /></div>
            <h1 className="text-2xl font-extrabold text-navy">Create your account</h1>
            <p className="mt-1 text-sm text-slate-500">Join Print & Publish Co. to request quotes, track orders and manage projects.</p>
          </div>

          {/* Account type toggle */}
          <div className="mt-6 grid grid-cols-2 gap-3">
            <button onClick={() => setAccountType('customer')} className={`rounded-xl border p-4 text-left transition-all ${accountType === 'customer' ? 'border-gold bg-gold/5 ring-2 ring-gold/20' : 'border-slate-200 bg-white hover:border-slate-300'}`}>
              <Building2 className={`h-6 w-6 ${accountType === 'customer' ? 'text-gold' : 'text-slate-400'}`} />
              <p className="mt-2 font-bold text-navy">Customer</p>
              <p className="text-xs text-slate-500">Order printing, branding, publishing services</p>
            </button>
            <button onClick={() => setAccountType('author')} className={`rounded-xl border p-4 text-left transition-all ${accountType === 'author' ? 'border-gold bg-gold/5 ring-2 ring-gold/20' : 'border-slate-200 bg-white hover:border-slate-300'}`}>
              <BookUser className={`h-6 w-6 ${accountType === 'author' ? 'text-gold' : 'text-slate-400'}`} />
              <p className="mt-2 font-bold text-navy">Author</p>
              <p className="text-xs text-slate-500">Publish your books, track manuscripts</p>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-bold text-navy">Full Name</label>
              <input value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm focus:border-gold focus:bg-white focus:outline-none focus:ring-2 focus:ring-gold/20" placeholder="Jane Njeri" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-bold text-navy">Email</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm focus:border-gold focus:bg-white focus:outline-none focus:ring-2 focus:ring-gold/20" placeholder="you@example.com" />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-bold text-navy">Phone</label>
                <input value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm focus:border-gold focus:bg-white focus:outline-none focus:ring-2 focus:ring-gold/20" placeholder="+254 7XX XXX XXX" />
              </div>
            </div>
            {accountType === 'customer' && (
              <div>
                <label className="mb-1.5 block text-sm font-bold text-navy">Business Name <span className="text-slate-400 font-normal">(optional)</span></label>
                <input value={businessName} onChange={(e) => setBusinessName(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm focus:border-gold focus:bg-white focus:outline-none focus:ring-2 focus:ring-gold/20" placeholder="Acme Ltd." />
              </div>
            )}
            <div>
              <label className="mb-1.5 block text-sm font-bold text-navy">Password</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm focus:border-gold focus:bg-white focus:outline-none focus:ring-2 focus:ring-gold/20" placeholder="At least 8 characters" />
            </div>
            <Button type="submit" variant="primary" size="lg" className="w-full" disabled={loading}>
              {loading ? 'Creating account...' : <>Create Account <UserPlus className="h-4 w-4" /></>}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-500">
            Already have an account? <button onClick={() => navigate('login')} className="font-bold text-gold hover:underline">Sign in</button>
          </p>
        </div>
      </div>
    </div>
  );
}
