'use client';

import { useAppStore } from '@/stores/app-store';
import { cn } from '@/lib/utils';
import { CheckCircle2, XCircle, Info, AlertTriangle, X } from 'lucide-react';

export function Toaster() {
  const { toasts, dismissToast } = useAppStore();
  return (
    <div className="pointer-events-none fixed inset-x-0 top-4 z-[100] flex flex-col items-center gap-2 px-4">
      {toasts.map((t) => {
        const Icon = t.type === 'success' ? CheckCircle2 : t.type === 'error' ? XCircle : t.type === 'warning' ? AlertTriangle : Info;
        const accent = t.type === 'success' ? 'border-emerald-200' : t.type === 'error' ? 'border-rose-200' : t.type === 'warning' ? 'border-amber-200' : 'border-sky-200';
        const iconColor = t.type === 'success' ? 'text-emerald-500' : t.type === 'error' ? 'text-rose-500' : t.type === 'warning' ? 'text-amber-500' : 'text-sky-500';
        return (
          <div key={t.id} className={cn('pointer-events-auto flex w-full max-w-md items-start gap-3 rounded-2xl border bg-white p-4 shadow-xl animate-in slide-in-from-top-4', accent)}>
            <Icon className={cn('mt-0.5 h-5 w-5 flex-shrink-0', iconColor)} />
            <div className="flex-1">
              {t.title && <p className="text-sm font-bold text-navy">{t.title}</p>}
              <p className="text-sm text-slate-600">{t.message}</p>
            </div>
            <button onClick={() => dismissToast(t.id)} className="text-slate-400 hover:text-slate-600">
              <X className="h-4 w-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
