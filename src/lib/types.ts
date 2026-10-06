// Shared API response & type helpers

export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  errors?: Record<string, string>;
  meta?: {
    page?: number;
    pageSize?: number;
    total?: number;
    totalPages?: number;
  };
}

export function ok<T>(data: T, message?: string): ApiResponse<T> {
  return { success: true, message, data };
}

export function fail(message: string, errors?: Record<string, string>): ApiResponse<never> {
  return { success: false, message, errors };
}

// Reference number generation: CUS-000001, QTR-000001, ORD-000001, etc.
export function generateReference(prefix: string, count: number): string {
  const padded = String(count).padStart(6, '0');
  return `${prefix}-${padded}`;
}

export function generateTrackingToken(): string {
  return Array.from({ length: 24 }, () =>
    Math.floor(Math.random() * 36).toString(36)
  ).join('');
}

// Money helpers — server-authoritative. Operate on Prisma Decimal serialized as string.
export function toNumber(d: unknown): number {
  if (d === null || d === undefined) return 0;
  if (typeof d === 'number') return d;
  return Number(String(d));
}

export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export function formatMoney(amount: unknown, currency = 'KES'): string {
  const n = toNumber(amount);
  const formatted = n.toLocaleString('en-KE', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
  return `${currency} ${formatted}`;
}

export function formatMoneyShort(amount: unknown, currency = 'KES'): string {
  const n = toNumber(amount);
  if (n >= 1_000_000) return `${currency} ${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${currency} ${(n / 1_000).toFixed(0)}k`;
  return `${currency} ${n}`;
}

export function formatDate(d: Date | string | null | undefined, withTime = false): string {
  if (!d) return '—';
  const date = typeof d === 'string' ? new Date(d) : d;
  if (isNaN(date.getTime())) return '—';
  const opts: Intl.DateTimeFormatOptions = withTime
    ? { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }
    : { year: 'numeric', month: 'short', day: 'numeric' };
  return date.toLocaleDateString('en-KE', opts);
}

export function timeAgo(d: Date | string): string {
  const date = typeof d === 'string' ? new Date(d) : d;
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return formatDate(date);
}

// Permission helpers
export const PERMISSIONS = {
  'users.view': ['SUPER_ADMIN', 'ADMIN', 'MANAGER'],
  'users.manage': ['SUPER_ADMIN', 'ADMIN'],
  'orders.view': ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'SALES', 'PRODUCTION', 'FINANCE'],
  'orders.create': ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'SALES'],
  'orders.update': ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'SALES', 'PRODUCTION'],
  'orders.cancel': ['SUPER_ADMIN', 'ADMIN', 'MANAGER'],
  'quotes.view': ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'SALES', 'DESIGNER'],
  'quotes.create': ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'SALES'],
  'quotes.send': ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'SALES'],
  'quotes.approve': ['SUPER_ADMIN', 'ADMIN', 'MANAGER'],
  'payments.view': ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'FINANCE'],
  'payments.create': ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'FINANCE'],
  'payments.refund': ['SUPER_ADMIN', 'ADMIN', 'FINANCE'],
  'inventory.view': ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'INVENTORY_MANAGER'],
  'inventory.manage': ['SUPER_ADMIN', 'ADMIN', 'INVENTORY_MANAGER'],
  'reports.view': ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'FINANCE'],
  'staff.manage': ['SUPER_ADMIN', 'ADMIN'],
  'settings.manage': ['SUPER_ADMIN', 'ADMIN'],
  'audit.view': ['SUPER_ADMIN', 'ADMIN'],
  'publishing.manage': ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'PUBLISHER'],
} as const;

export type Permission = keyof typeof PERMISSIONS;

export function can(role: string | undefined, permission: Permission): boolean {
  if (!role) return false;
  if (role === 'SUPER_ADMIN') return true;
  const allowed = PERMISSIONS[permission] as readonly string[];
  return allowed.includes(role);
}

export function isAdmin(role: string | undefined): boolean {
  return role === 'SUPER_ADMIN' || role === 'ADMIN' || role === 'MANAGER';
}

export function isStaff(role: string | undefined): boolean {
  return role !== undefined && role !== 'CUSTOMER' && role !== 'AUTHOR';
}
