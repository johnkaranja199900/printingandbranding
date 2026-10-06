'use client';

import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

// Status mapping for order/quotation/payment/production statuses
const STATUS_STYLES: Record<string, string> = {
  // Order
  PENDING: 'bg-amber-100 text-amber-800',
  CONFIRMED: 'bg-blue-100 text-blue-800',
  AWAITING_PAYMENT: 'bg-amber-100 text-amber-800',
  QUEUED: 'bg-slate-100 text-slate-700',
  IN_PRODUCTION: 'bg-sky-100 text-sky-800',
  QUALITY_CHECK: 'bg-violet-100 text-violet-800',
  READY: 'bg-emerald-100 text-emerald-800',
  COMPLETED: 'bg-emerald-100 text-emerald-800',
  CANCELLED: 'bg-rose-100 text-rose-800',
  REFUNDED: 'bg-rose-100 text-rose-800',
  // Payment
  UNPAID: 'bg-rose-100 text-rose-800',
  PARTIALLY_PAID: 'bg-amber-100 text-amber-800',
  PAID: 'bg-emerald-100 text-emerald-800',
  OVERPAID: 'bg-emerald-100 text-emerald-800',
  // Quotation
  DRAFT: 'bg-slate-100 text-slate-700',
  PENDING_REVIEW: 'bg-amber-100 text-amber-800',
  APPROVED: 'bg-blue-100 text-blue-800',
  SENT: 'bg-sky-100 text-sky-800',
  CUSTOMER_VIEWED: 'bg-sky-100 text-sky-800',
  CUSTOMER_ACCEPTED: 'bg-emerald-100 text-emerald-800',
  CUSTOMER_REJECTED: 'bg-rose-100 text-rose-800',
  EXPIRED: 'bg-slate-100 text-slate-500',
  CANCELLED: 'bg-rose-100 text-rose-800',
  // Quote request
  SUBMITTED: 'bg-sky-100 text-sky-800',
  UNDER_REVIEW: 'bg-amber-100 text-amber-800',
  PRICING: 'bg-amber-100 text-amber-800',
  QUOTED: 'bg-violet-100 text-violet-800',
  // Payment record
  SUCCESSFUL: 'bg-emerald-100 text-emerald-800',
  FAILED: 'bg-rose-100 text-rose-800',
  PENDING: 'bg-amber-100 text-amber-800',
  PROCESSING: 'bg-sky-100 text-sky-800',
  // User status
  ACTIVE: 'bg-emerald-100 text-emerald-800',
  INACTIVE: 'bg-slate-100 text-slate-600',
  SUSPENDED: 'bg-rose-100 text-rose-800',
  // generic
  new: 'bg-sky-100 text-sky-800',
  assigned: 'bg-amber-100 text-amber-800',
  closed: 'bg-slate-100 text-slate-600',
  replied: 'bg-emerald-100 text-emerald-800',
  spam: 'bg-rose-100 text-rose-800',
};

const LABELS: Record<string, string> = {
  PENDING: 'Pending',
  CONFIRMED: 'Confirmed',
  AWAITING_PAYMENT: 'Awaiting Payment',
  QUEUED: 'Queued',
  IN_PRODUCTION: 'In Production',
  QUALITY_CHECK: 'Quality Check',
  READY: 'Ready',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
  REFUNDED: 'Refunded',
  UNPAID: 'Unpaid',
  PARTIALLY_PAID: 'Partially Paid',
  PAID: 'Paid',
  OVERPAID: 'Overpaid',
  DRAFT: 'Draft',
  PENDING_REVIEW: 'Pending Review',
  APPROVED: 'Approved',
  SENT: 'Sent',
  CUSTOMER_VIEWED: 'Viewed',
  CUSTOMER_ACCEPTED: 'Accepted',
  CUSTOMER_REJECTED: 'Rejected',
  EXPIRED: 'Expired',
  SUBMITTED: 'Submitted',
  UNDER_REVIEW: 'Under Review',
  PRICING: 'Pricing',
  QUOTED: 'Quoted',
  SUCCESSFUL: 'Successful',
  FAILED: 'Failed',
  PROCESSING: 'Processing',
  ACTIVE: 'Active',
  INACTIVE: 'Inactive',
  SUSPENDED: 'Suspended',
  MANUSCRIPT_SUBMITTED: 'Manuscript',
  EDITING: 'Editing',
  DESIGN: 'Design',
  PROOFREADING: 'Proofreading',
  PRINTING: 'Printing',
  PUBLISHED: 'Published',
  ARCHIVED: 'Archived',
};

export function StatusBadge({ status, label, className }: { status: string; label?: string; className?: string }) {
  const style = STATUS_STYLES[status] ?? 'bg-slate-100 text-slate-700';
  const text = label ?? LABELS[status] ?? (status ?? '').replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize', style, className)}>
      {text}
    </span>
  );
}

export function PriorityBadge({ priority }: { priority: string }) {
  const styles: Record<string, string> = {
    NORMAL: 'bg-sky-100 text-sky-800',
    URGENT: 'bg-amber-100 text-amber-800',
    VERY_URGENT: 'bg-rose-100 text-rose-800',
    SCHEDULED: 'bg-violet-100 text-violet-800',
  };
  return (
    <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize', styles[priority] ?? 'bg-slate-100 text-slate-700')}>
      {(priority ?? '').replace(/_/g, ' ').toLowerCase()}
    </span>
  );
}

export function Money({ amount, currency = 'KES', className }: { amount: unknown; currency?: string; className?: string }) {
  const n = Number(amount ?? 0);
  const formatted = Number.isFinite(n)
    ? n.toLocaleString('en-KE', { maximumFractionDigits: 0 })
    : '0';
  return <span className={className}>{currency} {formatted}</span>;
}

export function EmptyState({ icon, title, description, action }: { icon?: ReactNode; title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
      {icon && <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-navy-soft text-gold">{icon}</div>}
      <h3 className="text-base font-bold text-navy">{title}</h3>
      {description && <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('text-xs font-bold uppercase tracking-[0.18em] text-gold', className)}>{children}</div>;
}

export function PageHero({ eyebrow, title, description, actions, breadcrumbs }: { eyebrow?: string; title: string; description?: string; actions?: ReactNode; breadcrumbs?: string }) {
  return (
    <section className="bg-gradient-to-br from-navy via-navy-soft to-navy text-white">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        {breadcrumbs && <div className="mb-3 text-sm text-white/70">{breadcrumbs}</div>}
        {eyebrow && <Eyebrow className="mb-3">{eyebrow}</Eyebrow>}
        <h1 className="max-w-3xl text-3xl font-extrabold leading-tight sm:text-4xl lg:text-5xl">{title}</h1>
        {description && <p className="mt-4 max-w-2xl text-base text-white/80 sm:text-lg">{description}</p>}
        {actions && <div className="mt-6 flex flex-wrap gap-3">{actions}</div>}
      </div>
    </section>
  );
}
