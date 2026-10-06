'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAppStore } from '@/stores/app-store';
import { apiClient } from '@/lib/api-client';
import { AdminLayout } from '@/components/shared/AdminLayout';
import { Button } from '@/components/shared/Button';
import { StatusBadge, Money, EmptyState, Eyebrow } from '@/components/shared/primitives';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { timeAgo } from '@/lib/types';
import {
  BookOpen, Plus, Star, AlertCircle, BookMarked, FileText, Loader2,
  CheckCircle2, BookCopy, Layers,
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

type FilterKey = 'all' | 'draft' | 'in-progress' | 'published';

const DRAFT_STATUSES = ['DRAFT', 'MANUSCRIPT_SUBMITTED'];
const IN_PROGRESS_STATUSES = ['EDITING', 'DESIGN', 'PROOFREADING', 'APPROVED', 'PRINTING'];

function matchesFilter(book: Book, filter: FilterKey): boolean {
  switch (filter) {
    case 'all': return true;
    case 'draft': return DRAFT_STATUSES.includes(book.publicationStatus);
    case 'in-progress': return IN_PROGRESS_STATUSES.includes(book.publicationStatus);
    case 'published': return book.publicationStatus === 'PUBLISHED';
  }
}

// ----- Component -----
export function AuthorBooks() {
  const { user, navigate, pushToast } = useAppStore();
  const authorId = user?.author?.id ?? null;

  const [books, setBooks] = useState<Book[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterKey>('all');

  const load = useCallback(async () => {
    if (!authorId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get<{ data: Book[] }>(
        `/public/books?authorId=${encodeURIComponent(authorId)}`,
      );
      setBooks(((res as any)?.data ?? []) as Book[]);
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load books.');
      pushToast({ message: e?.message ?? 'Failed to load books.', type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [authorId, pushToast]);

  useEffect(() => { load(); }, [load]);

  const allBooks = books ?? [];
  const filtered = useMemo(() => allBooks.filter((b) => matchesFilter(b, filter)), [allBooks, filter]);

  const counts = useMemo(() => ({
    all: allBooks.length,
    draft: allBooks.filter((b) => DRAFT_STATUSES.includes(b.publicationStatus)).length,
    'in-progress': allBooks.filter((b) => IN_PROGRESS_STATUSES.includes(b.publicationStatus)).length,
    published: allBooks.filter((b) => b.publicationStatus === 'PUBLISHED').length,
  }), [allBooks]);

  // ----- No author profile guard -----
  if (!authorId) {
    return (
      <AdminLayout>
        <div className="mx-auto max-w-2xl py-12">
          <EmptyState
            icon={<AlertCircle className="h-5 w-5" />}
            title="Author profile not linked"
            description="Your user account isn't linked to an author profile yet. Please contact support at hello@printpublish.co.ke to have your author record attached."
            action={<Button variant="primary" onClick={() => navigate('contact')}>Contact Support</Button>}
          />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      {/* Header */}
      <section className="overflow-hidden rounded-3xl bg-gradient-to-br from-navy via-navy-soft to-[#1a2438] text-white">
        <div className="flex flex-col gap-4 p-6 sm:p-8 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <Eyebrow className="mb-2 text-gold-soft">Author Portal · {user?.author?.authorNumber ?? '—'}</Eyebrow>
            <h1 className="text-2xl font-extrabold sm:text-3xl">My Books</h1>
            <p className="mt-2 max-w-xl text-sm text-white/80">
              Manage your full catalogue — drafts, manuscripts in production, and published titles.
            </p>
          </div>
          <Button variant="accent" onClick={() => navigate('quote')}>
            <Plus className="h-4 w-4" /> Request New Publication
          </Button>
        </div>
      </section>

      {/* Filters */}
      <section className="mt-6">
        <Tabs value={filter} onValueChange={(v) => setFilter(v as FilterKey)}>
          <TabsList className="h-auto flex-wrap gap-1 rounded-2xl bg-slate-100 p-1">
            <FilterTab value="all" label="All" count={counts.all} icon={<BookCopy className="h-3.5 w-3.5" />} active={filter === 'all'} />
            <FilterTab value="draft" label="Drafts" count={counts.draft} icon={<FileText className="h-3.5 w-3.5" />} active={filter === 'draft'} />
            <FilterTab value="in-progress" label="In Progress" count={counts['in-progress']} icon={<Loader2 className="h-3.5 w-3.5" />} active={filter === 'in-progress'} />
            <FilterTab value="published" label="Published" count={counts.published} icon={<CheckCircle2 className="h-3.5 w-3.5" />} active={filter === 'published'} />
          </TabsList>
        </Tabs>
      </section>

      {/* Body */}
      <section className="mt-6">
        {loading ? (
          <BookGridSkeleton />
        ) : error ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
            <AlertCircle className="mr-2 inline h-4 w-4" />{error}
          </div>
        ) : allBooks.length === 0 ? (
          <EmptyState
            icon={<BookOpen className="h-5 w-5" />}
            title="No books yet"
            description="You haven't submitted any manuscripts for publishing yet. Start by requesting a publishing quote — our team will guide you through editing, design, ISBN assignment, and printing."
            action={<Button variant="accent" onClick={() => navigate('quote')}><Plus className="h-4 w-4" /> Submit Your First Manuscript</Button>}
          />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<BookMarked className="h-5 w-5" />}
            title={`No ${labelForFilter(filter)} books`}
            description="Try switching to a different filter to see more of your books."
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filtered.map((book) => (
              <BookCard key={book.id} book={book} onOpen={() => navigate('book-detail', { id: book.id })} />
            ))}
          </div>
        )}
      </section>
    </AdminLayout>
  );
}

export default AuthorBooks;

// ----- Sub-components -----
function labelForFilter(f: FilterKey): string {
  switch (f) {
    case 'all': return '';
    case 'draft': return 'draft';
    case 'in-progress': return 'in-progress';
    case 'published': return 'published';
  }
}

function FilterTab({ value, label, count, icon, active }: { value: string; label: string; count: number; icon: React.ReactNode; active: boolean }) {
  return (
    <TabsTrigger value={value} className={cn('gap-2 rounded-xl px-3 py-2 text-xs font-bold capitalize data-[state=active]:bg-white data-[state=active]:text-navy data-[state=active]:shadow-sm', active ? 'bg-white text-navy shadow-sm' : 'text-slate-600')}>
      {icon}
      {label}
      <span className={cn('rounded-full px-1.5 py-0.5 text-[0.65rem]', active ? 'bg-navy text-white' : 'bg-slate-200 text-slate-600')}>{count}</span>
    </TabsTrigger>
  );
}

function BookCard({ book, onOpen }: { book: Book; onOpen: () => void }) {
  return (
    <button
      onClick={onOpen}
      className="group flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-gold/40 hover:shadow-lg"
    >
      {/* Cover */}
      <div className="relative aspect-[3/4] w-full overflow-hidden bg-slate-100">
        {book.coverImageUrl ? (
          <img src={book.coverImageUrl} alt={book.title} className="h-full w-full object-cover transition-transform group-hover:scale-105" />
        ) : (
          <BookCoverPlaceholder title={book.title} />
        )}
        {/* Status pill */}
        <div className="absolute left-2 top-2">
          <StatusBadge status={book.publicationStatus} className="shadow-sm" />
        </div>
        {/* Featured / Published badges */}
        <div className="absolute right-2 top-2 flex flex-col gap-1">
          {book.isFeatured && (
            <span className="grid h-7 w-7 place-items-center rounded-full bg-gold text-[#1a1508] shadow-sm" title="Featured">
              <Star className="h-3.5 w-3.5 fill-current" />
            </span>
          )}
          {book.isPublished && (
            <span className="grid h-7 w-7 place-items-center rounded-full bg-emerald-500 text-white shadow-sm" title="Published">
              <CheckCircle2 className="h-3.5 w-3.5" />
            </span>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col gap-2 p-4">
        <div>
          <h3 className="line-clamp-2 text-sm font-bold leading-tight text-navy group-hover:text-gold">{book.title}</h3>
          {book.subtitle && <p className="mt-0.5 line-clamp-1 text-xs text-slate-500">{book.subtitle}</p>}
        </div>

        <div className="flex flex-wrap gap-1.5 text-[0.7rem] text-slate-500">
          {book.genre && (
            <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-1.5 py-0.5">
              <Layers className="h-3 w-3" /> {book.genre}
            </span>
          )}
          {book.format && (
            <span className="rounded-md bg-slate-100 px-1.5 py-0.5">{book.format}</span>
          )}
          {book.pageCount != null && (
            <span className="rounded-md bg-slate-100 px-1.5 py-0.5">{book.pageCount} pp</span>
          )}
        </div>

        <div className="mt-auto flex items-center justify-between pt-2">
          <div>
            {book.sellingPrice != null ? (
              <span className="text-sm font-extrabold text-navy"><Money amount={book.sellingPrice} /></span>
            ) : (
              <span className="text-xs text-slate-400">Price not set</span>
            )}
            {book.publicationDate && (
              <p className="text-[0.7rem] text-slate-400">Published {new Date(book.publicationDate).getFullYear()}</p>
            )}
            {!book.isPublished && book.updatedAt && (
              <p className="text-[0.7rem] text-slate-400">Updated {timeAgo(book.updatedAt)}</p>
            )}
          </div>
          <span className="rounded-lg bg-navy px-2.5 py-1 text-[0.7rem] font-bold text-white opacity-0 transition-opacity group-hover:opacity-100">
            View
          </span>
        </div>
      </div>
    </button>
  );
}

function BookCoverPlaceholder({ title }: { title: string }) {
  const gradients = [
    'from-navy via-navy-soft to-[#1a2438]',
    'from-gold via-amber-600 to-amber-800',
    'from-emerald-600 via-teal-700 to-cyan-800',
    'from-rose-600 via-pink-700 to-fuchsia-800',
    'from-violet-600 via-purple-700 to-indigo-800',
    'from-sky-600 via-blue-700 to-indigo-800',
  ];
  const idx = (title?.charCodeAt(0) ?? 0) % gradients.length;
  const initials = title?.split(' ').slice(0, 2).map((w) => w[0]?.toUpperCase()).join('') ?? 'BK';
  return (
    <div className={cn('relative flex h-full w-full flex-col items-center justify-center gap-2 bg-gradient-to-br p-3 text-center', gradients[idx])}>
      <div className="grid h-12 w-12 place-items-center rounded-xl bg-white/15 text-base font-extrabold text-white backdrop-blur">{initials}</div>
      <p className="line-clamp-3 text-[0.65rem] font-bold uppercase tracking-wide text-white/80">{title}</p>
    </div>
  );
}

function BookGridSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <Card key={i} className="overflow-hidden rounded-2xl">
          <Skeleton className="aspect-[3/4] w-full rounded-none" />
          <CardContent className="space-y-2 p-4">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
            <div className="flex gap-1.5">
              <Skeleton className="h-4 w-12 rounded-md" />
              <Skeleton className="h-4 w-10 rounded-md" />
            </div>
            <div className="flex justify-between pt-2">
              <Skeleton className="h-5 w-16" />
              <Skeleton className="h-5 w-10" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
