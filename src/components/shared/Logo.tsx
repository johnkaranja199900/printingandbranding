'use client';

import { cn } from '@/lib/utils';

export function Logo({ className, light = false }: { className?: string; light?: boolean }) {
  return (
    <div className={cn('flex items-center gap-3', className)}>
      <div className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-navy to-blue-900 text-lg font-extrabold text-white shadow-lg">
        P
      </div>
      <div className="leading-tight">
        <strong className={cn('block text-[1.02rem] font-bold', light ? 'text-white' : 'text-navy')}>Print & Publish Co.</strong>
        <small className={cn('text-xs', light ? 'text-white/60' : 'text-slate-500')}>Publishing • Printing • Branding</small>
      </div>
    </div>
  );
}

export function LogoMark({ className }: { className?: string }) {
  return (
    <div className={cn('grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-navy to-blue-900 text-lg font-extrabold text-white shadow-lg', className)}>
      P
    </div>
  );
}
