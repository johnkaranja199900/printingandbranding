'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAppStore } from '@/stores/app-store';
import { apiClient } from '@/lib/api-client';
import { AdminLayout } from '@/components/shared/AdminLayout';
import { Button } from '@/components/shared/Button';
import { StatusBadge, Money, EmptyState, Eyebrow } from '@/components/shared/primitives';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { timeAgo } from '@/lib/types';
import {
  BookOpen, FileText, TrendingUp, Plus, Bell, PenTool, CheckCircle2,
  Clock, Star, AlertCircle, ArrowRight,
} from 'lucide-react';

// ----- Types -----
interface BookAuthor { id: string; firstName: string; lastName: string; penName?: string | null; }
interface Book {
  id: string;
  title: string;
  subtitle?: string | null;
  isbn?: string | null;
  description?: string | null;
  genre?: string | null;
  language: string;
  publicationStatus: string;
  pageCount?: number | null;
  coverType?: string | null;
  paperType?: string | null;
  format?: string | null;
  sellingPrice?: string | number | null;
  coverImageUrl?: string | null;
  isFeatured: boolean;
  isPublished: boolean;
  publicationDate?: string | Date | null;
  createdAt?: string | Date;
  updatedAt?: string | Date;
  author: BookAuthor;
}

interface Notification {
  id: string;
  title?: string | null;
  message: string;
  type?: string | null;
  isRead: boolean;
  createdAt: string | Date;
}

// ----- Helpers -----
const PROGRESS_BY_STATUS: Record<string, number> = {
  DRAFT: 5,
  MANUSCRIPT_SUBMITTED: 15,
  EDITING: 35,
  DESIGN: 55,
  PROOFREADING: 75,
  APPROVED: 85,
  PRINTING: 95,
  PUBLISHED: 100,
  ARCHIVED: 100,
};

const IN_PROGRESS_STATUSES = ['EDITING', 'DESIGN', 'PROOFREADING', 'APPROVED', 'PRINTING'];
const MANUSCRIPT_STATUSES = ['MANUSCRIPT_SUBMITTED', 'EDITING', 'DESIGN', 'PROOFREADING'];

function progressFor(status: string): number {
  return PROGRESS_BY_STATUS[status] ?? 0;
}

// ----- Skeletons -----
function StatsSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i} className="rounded-2xl">
          <CardContent className="flex items-center gap-3">
            <Skeleton className="h-12 w-12 rounded-xl" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-6 w-12" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function ListSkeleton() {
  return (
    <Card className="rounded-2xl">
      <CardHeader>
        <Skeleton className="h-5 w-32" />
      </CardHeader>
      <CardContent className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-lg" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
            <Skeleton className="h-6 w-16 rounded-full" />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

// ----- Main component -----
export function AuthorDashboard() {
  const { user, navigate, pushToast } = useAppStore();
  const authorId = user?.author?.id ?? null;

  const [books, setBooks] = useState<Book[] | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!authorId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [b, n] = await Promise.all([
        apiClient
          .get<{ data: Book[] }>(`/public/books?authorId=${encodeURIComponent(authorId)}`)
          .then((res: any) => (res?.data ?? []) as Book[]),
        apiClient
          .get<{ items: Notification[] }>('/notifications')
          .then((res: any) => (res?.items ?? []) as Notification[]),
      ]);
      setBooks(b);
      setNotifications(n);
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load dashboard.');
      pushToast({ message: e?.message ?? 'Failed to load dashboard.', type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [authorId, pushToast]);

  useEffect(() => { load(); }, [load]);

  // ----- Derived stats -----
  const allBooks = books ?? [];
  const totalBooks = allBooks.length;
  const publishedCount = allBooks.filter((b) => b.publicationStatus === 'PUBLISHED').length;
  const inProgressCount = allBooks.filter((b) => IN_PROGRESS_STATUSES.includes(b.publicationStatus)).length;
  const draftsCount = allBooks.filter((b) => b.publicationStatus === 'DRAFT').length;
  const manuscriptsInProgress = allBooks
    .filter((b) => MANUSCRIPT_STATUSES.includes(b.publicationStatus))
    .sort((a, b) => progressFor(b.publicationStatus) - progressFor(a.publicationStatus));
  const recentBooks = [...allBooks]
    .sort((a, b) => new Date(b.updatedAt ?? b.createdAt ?? 0).getTime() - new Date(a.updatedAt ?? a.createdAt ?? 0).getTime())
    .slice(0, 5);

  const firstName = user?.name?.split(' ')[0] ?? 'Author';
  const penName = user?.author?.penName;
  const authorNumber = user?.author?.authorNumber ?? '—';

  // ----- No author profile guard -----
  if (!authorId) {
    return (
      <AdminLayout>
        <div className="mx-auto max-w-2xl py-12">
          <EmptyState
            icon={<AlertCircle className="h-5 w-5" />}
            title="Author profile not linked"
            description="Your user account isn't linked to an author profile yet. Please contact support at hello@printpublish.co.ke to have your author record attached so you can manage your books."
            action={<Button variant="primary" onClick={() => navigate('contact')}><PenTool className="h-4 w-4" /> Contact Support</Button>}
          />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      {/* Hero / Greeting */}
      <section className="overflow-hidden rounded-3xl bg-gradient-to-br from-navy via-navy-soft to-[#1a2438] text-white">
        <div className="flex flex-col gap-6 p-6 sm:p-8 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <Eyebrow className="mb-2 text-gold-soft">Author Portal · {authorNumber}</Eyebrow>
            <h1 className="text-2xl font-extrabold sm:text-3xl">Welcome back, {firstName}</h1>
            <p className="mt-2 max-w-xl text-sm text-white/80">
              {penName ? <>Writing as <span className="font-semibold text-gold-soft">{penName}</span> · </> : null}
              Track your manuscripts in production, monitor published titles, and submit new work for publishing.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="accent" onClick={() => navigate('quote')}>
              <Plus className="h-4 w-4" /> Submit New Manuscript
            </Button>
            <Button variant="outline" onClick={() => navigate('author-books')}>
              <BookOpen className="h-4 w-4" /> View My Books
            </Button>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="mt-6">
        {loading ? <StatsSkeleton /> : (
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            <StatCard icon={<BookOpen className="h-5 w-5" />} label="Total Books" value={totalBooks} accent="navy" />
            <StatCard icon={<CheckCircle2 className="h-5 w-5" />} label="Published" value={publishedCount} accent="emerald" />
            <StatCard icon={<TrendingUp className="h-5 w-5" />} label="In Progress" value={inProgressCount} accent="sky" />
            <StatCard icon={<FileText className="h-5 w-5" />} label="Drafts" value={draftsCount} accent="slate" />
          </div>
        )}
      </section>

      {/* Empty state */}
      {!loading && totalBooks === 0 && (
        <section className="mt-6">
          <EmptyState
            icon={<BookOpen className="h-5 w-5" />}
            title="No books yet"
            description="You haven't submitted any manuscripts for publishing yet. Start by requesting a publishing quote — our team will guide you through editing, design, ISBN assignment, and printing."
            action={
              <Button variant="accent" onClick={() => navigate('quote')}>
                <Plus className="h-4 w-4" /> Submit Your First Manuscript
              </Button>
            }
          />
        </section>
      )}

      {/* Main grid */}
      {!loading && totalBooks > 0 && (
        <section className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* My Books recent list */}
          <div className="lg:col-span-2">
            {loading ? <ListSkeleton /> : (
              <Card className="rounded-2xl">
                <CardHeader className="flex-row items-center justify-between">
                  <CardTitle className="text-base font-bold text-navy">My Books</CardTitle>
                  <button
                    onClick={() => navigate('author-books')}
                    className="inline-flex items-center gap-1 text-xs font-bold text-gold hover:underline"
                  >
                    View all <ArrowRight className="h-3 w-3" />
                  </button>
                </CardHeader>
                <CardContent className="space-y-2">
                  {recentBooks.map((book) => (
                    <button
                      key={book.id}
                      onClick={() => navigate('author-books')}
                      className="flex w-full items-center gap-3 rounded-xl border border-slate-100 p-3 text-left transition-colors hover:border-gold/40 hover:bg-gold/5"
                    >
                      <BookCoverMini book={book} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="truncate text-sm font-bold text-navy">{book.title}</p>
                          {book.isFeatured && <Star className="h-3.5 w-3.5 shrink-0 fill-gold text-gold" />}
                        </div>
                        <p className="truncate text-xs text-slate-500">
                          {book.genre ?? 'Uncategorized'} · {book.format ?? 'No format'} · {book.pageCount ?? '—'} pp
                        </p>
                        <p className="mt-0.5 text-[0.7rem] text-slate-400">
                          Updated {book.updatedAt ? timeAgo(book.updatedAt) : '—'}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <StatusBadge status={book.publicationStatus} />
                        {book.sellingPrice != null && (
                          <span className="text-xs font-bold text-navy"><Money amount={book.sellingPrice} /></span>
                        )}
                      </div>
                    </button>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Notifications panel */}
          <div>
            {loading ? (
              <Card className="rounded-2xl">
                <CardHeader><Skeleton className="h-5 w-32" /></CardHeader>
                <CardContent className="space-y-3">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="space-y-1.5">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-full" />
                    </div>
                  ))}
                </CardContent>
              </Card>
            ) : (
              <Card className="rounded-2xl">
                <CardHeader className="flex-row items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-base font-bold text-navy">
                    <Bell className="h-4 w-4 text-gold" /> Notifications
                  </CardTitle>
                  {notifications.length > 0 && (
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-600">{notifications.length}</span>
                  )}
                </CardHeader>
                <CardContent className="space-y-3">
                  {notifications.length === 0 ? (
                    <div className="py-6 text-center text-sm text-slate-500">
                      <Bell className="mx-auto mb-2 h-6 w-6 text-slate-300" />
                      You're all caught up.
                    </div>
                  ) : (
                    notifications.slice(0, 6).map((n) => (
                      <div key={n.id} className={cn('rounded-xl border p-3', n.isRead ? 'border-slate-100 bg-white' : 'border-gold/30 bg-gold/5')}>
                        <div className="flex items-start gap-2">
                          <span className={cn('mt-1.5 h-2 w-2 shrink-0 rounded-full', n.isRead ? 'bg-slate-300' : 'bg-gold')} />
                          <div className="min-w-0 flex-1">
                            {n.title && <p className="text-sm font-bold text-navy">{n.title}</p>}
                            <p className="text-xs text-slate-600">{n.message}</p>
                            <p className="mt-1 text-[0.7rem] text-slate-400">{timeAgo(n.createdAt)}</p>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </section>
      )}

      {/* Manuscripts in progress */}
      {!loading && manuscriptsInProgress.length > 0 && (
        <section className="mt-6">
          <Card className="rounded-2xl">
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base font-bold text-navy">
                <PenTool className="h-4 w-4 text-gold" /> Manuscripts in Progress
              </CardTitle>
              <span className="rounded-full bg-sky-100 px-2.5 py-0.5 text-xs font-bold text-sky-800">{manuscriptsInProgress.length} active</span>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {manuscriptsInProgress.map((book) => {
                const pct = progressFor(book.publicationStatus);
                return (
                  <button
                    key={book.id}
                    onClick={() => navigate('author-books')}
                    className="rounded-xl border border-slate-200 p-4 text-left transition-colors hover:border-gold/40 hover:bg-gold/5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-navy">{book.title}</p>
                        <p className="truncate text-xs text-slate-500">
                          {book.genre ?? 'Uncategorized'} · {book.format ?? '—'} · {book.pageCount ?? '—'} pp
                        </p>
                      </div>
                      <StatusBadge status={book.publicationStatus} />
                    </div>
                    <div className="mt-3">
                      <div className="mb-1 flex items-center justify-between text-[0.7rem] font-semibold text-slate-500">
                        <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> Production progress</span>
                        <span>{pct}%</span>
                      </div>
                      <Progress value={pct} className="h-2 bg-slate-200" />
                      <p className="mt-1 text-[0.7rem] text-slate-400">
                        Last updated {book.updatedAt ? timeAgo(book.updatedAt) : '—'}
                      </p>
                    </div>
                  </button>
                );
              })}
            </CardContent>
          </Card>
        </section>
      )}

      {/* Error banner */}
      {error && !loading && (
        <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          <AlertCircle className="mr-2 inline h-4 w-4" />
          {error}
        </div>
      )}
    </AdminLayout>
  );
}

export default AuthorDashboard;

// ----- Sub-components -----
function StatCard({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: number; accent: 'navy' | 'emerald' | 'sky' | 'slate' }) {
  const accentClasses: Record<string, string> = {
    navy: 'bg-navy text-white',
    emerald: 'bg-emerald-500 text-white',
    sky: 'bg-sky-500 text-white',
    slate: 'bg-slate-600 text-white',
  };
  return (
    <Card className="rounded-2xl">
      <CardContent className="flex items-center gap-3">
        <div className={cn('grid h-12 w-12 place-items-center rounded-xl', accentClasses[accent])}>
          {icon}
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</p>
          <p className="text-2xl font-extrabold text-navy">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function BookCoverMini({ book }: { book: Book }) {
  if (book.coverImageUrl) {
    return (
      <div className="h-12 w-9 shrink-0 overflow-hidden rounded-md border border-slate-200 bg-slate-100">
        <img src={book.coverImageUrl} alt={book.title} className="h-full w-full object-cover" />
      </div>
    );
  }
  // Gradient placeholder
  const gradients = [
    'from-navy to-navy-soft',
    'from-gold to-amber-600',
    'from-emerald-600 to-teal-700',
    'from-rose-600 to-pink-700',
    'from-violet-600 to-purple-700',
  ];
  const idx = (book.title?.charCodeAt(0) ?? 0) % gradients.length;
  return (
    <div className={cn('grid h-12 w-9 shrink-0 place-items-center rounded-md bg-gradient-to-br text-[0.6rem] font-bold text-white', gradients[idx])}>
      {book.title?.slice(0, 2).toUpperCase() ?? 'BK'}
    </div>
  );
}
