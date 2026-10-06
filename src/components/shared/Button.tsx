'use client';

import { cn } from '@/lib/utils';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { useAppStore } from '@/stores/app-store';

type Variant = 'primary' | 'accent' | 'light' | 'ghost' | 'danger' | 'outline';
type Size = 'sm' | 'md' | 'lg';

interface BtnProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  children: ReactNode;
}

const variants: Record<Variant, string> = {
  primary: 'bg-navy text-white hover:bg-black shadow-lg shadow-navy/20',
  accent: 'bg-gold text-[#1a1508] hover:brightness-110 shadow-lg shadow-gold/20',
  light: 'bg-white text-navy border border-slate-200 hover:bg-slate-50',
  ghost: 'bg-transparent text-navy border border-navy/15 hover:bg-navy/5',
  outline: 'bg-transparent text-white border border-white/30 hover:bg-white/10',
  danger: 'bg-rose-600 text-white hover:bg-rose-700 shadow-lg shadow-rose-600/20',
};

const sizes: Record<Size, string> = {
  sm: 'px-3.5 py-2 text-xs',
  md: 'px-5 py-2.5 text-sm',
  lg: 'px-6 py-3 text-base',
};

export function Button({ variant = 'primary', size = 'md', className, children, ...rest }: BtnProps) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-xl font-bold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/50 disabled:opacity-50 disabled:pointer-events-none active:translate-y-px',
        variants[variant],
        sizes[size],
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}

// Link-style button that triggers store navigation
export function NavButton({ to, params, variant = 'primary', size = 'md', className, children }: { to: any; params?: Record<string, string>; variant?: Variant; size?: Size; className?: string; children: ReactNode }) {
  const navigate = useAppStore((s) => s.navigate);
  return (
    <button
      onClick={() => navigate(to, params)}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-xl font-bold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/50 active:translate-y-px cursor-pointer',
        variants[variant],
        sizes[size],
        className,
      )}
    >
      {children}
    </button>
  );
}
