'use client';

import { useEffect, useMemo, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { Button, NavButton } from '@/components/shared/Button';
import { Eyebrow, PageHero, Money, EmptyState } from '@/components/shared/primitives';
import { ArrowRight, BookOpen, Search } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Book {
  id: string;
  title: string;
  subtitle?: string | null;
  isbn?: string | null;
  description?: string | null;
  genre?: string | null;
  language?: string | null;
  publicationStatus?: string | null;
  pageCount?: number | null;
  coverType?: string | null;
  format?: string | null;
  sellingPrice?: string | null;
  coverImageUrl?: string | null;
  isFeatured?: boolean;
  author: { firstName: string; lastName: string; penName?: string | null };
}

const COVER_GRADIENTS = [
  'from-navy to-navy-soft',
  'from-gold to-[#8a6508]',
  'from-emerald-900 to-navy',
  'from-rose-900 to-navy',
  'from-violet-900 to-navy',
  'from-sky-900 to-navy',
];

function coverGradientFor(title: string) {
  const sum = title.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  return COVER_GRADIENTS[sum % COVER_GRADIENTS.length];
}

const DEFAULT_GENRES = ['All', 'Fiction', 'Academic', 'Children', 'History', 'Business', 'Education', 'Religion'];

export function BooksView() {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('All');
  const [visible, setVisible] = useState(9);
  const [search, setSearch] = useState('');

  useEffect(() => {
    apiClient
      .get<{ data: Book[] }>('/public/books?page=1&pageSize=100')
      .then((d: any) => setBooks(d?.data ?? d ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const genres = useMemo(() => {
    const set = new Set<string>();
    books.forEach((b) => b.genre && set.add(b.genre));
    return ['All', ...Array.from(set).sort()];
  }, [books]);

  const tabs = genres.length > 1 ? genres : DEFAULT_GENRES;

  const filtered = useMemo(() => {
    return books.filter((b) => {
      if (filter !== 'All' && b.genre !== filter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const hay = `${b.title} ${b.subtitle ?? ''} ${b.author.firstName} ${b.author.lastName} ${b.author.penName ?? ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [books, filter, search]);

  return (
    <>
      <PageHero
        eyebrow="Bookstore"
        title="Discover books published with us"
        description="Browse our catalogue of published titles — fiction, academic, children's books, history and more from authors across Kenya."
        breadcrumbs="Home / Books"
        actions={<NavButton to="publishing" variant="accent" size="lg"><BookOpen className="h-4 w-4" /> Publish Your Book</NavButton>}
      />

      <section className="py-12 lg:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* Filters */}
          <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap gap-2">
              {tabs.map((g) => (
                <button
                  key={g}
                  onClick={() => { setFilter(g); setVisible(9); }}
                  className={cn(
                    'rounded-full px-4 py-1.5 text-sm font-bold transition-colors',
                    filter === g ? 'bg-navy text-white shadow-md' : 'border border-slate-200 bg-white text-navy-soft hover:border-gold hover:text-gold',
                  )}
                >
                  {g}
                </button>
              ))}
            </div>
            <div className="relative sm:w-72">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search title or author..."
                className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/20"
              />
            </div>
          </div>

          {/* Grid */}
          {loading ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {[0, 1, 2, 3, 4, 5].map((i) => <div key={i} className="h-80 animate-pulse rounded-2xl bg-slate-200" />)}
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={<BookOpen className="h-6 w-6" />}
              title="No books found"
              description={search ? "Try a different search term." : `No books in the "${filter}" category yet. Check back soon.`}
              action={<NavButton to="publishing" variant="primary" size="md">Publish Your Book</NavButton>}
            />
          ) : (
            <>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {filtered.slice(0, visible).map((b) => (
                  <BookCard key={b.id} book={b} />
                ))}
              </div>
              {visible < filtered.length && (
                <div className="mt-10 text-center">
                  <Button
                    variant="light"
                    size="lg"
                    onClick={() => setVisible((v) => v + 6)}
                  >
                    Load more books ({filtered.length - visible} remaining)
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </section>
    </>
  );
}

function BookCard({ book }: { book: Book }) {
  const initials = (book.title ?? '').split(' ').slice(0, 2).map((w) => w[0] ?? '').join('').toUpperCase();
  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all hover:-translate-y-1 hover:shadow-xl">
      <div className="relative h-56 overflow-hidden bg-slate-100">
        {book.coverImageUrl ? (
          <img src={book.coverImageUrl} alt={book.title} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
        ) : (
          <div className={cn('flex h-full w-full items-center justify-center bg-gradient-to-br', coverGradientFor(book.title))}>
            <span className="text-4xl font-extrabold text-white/90">{initials}</span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-navy/30 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
        {book.isFeatured && (
          <span className="absolute left-3 top-3 rounded-full bg-gold px-2.5 py-0.5 text-xs font-bold text-navy">Featured</span>
        )}
      </div>
      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-center gap-2">
          {book.genre && <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-navy-soft">{book.genre}</span>}
          {book.language && <span className="text-xs text-slate-400">· {book.language}</span>}
        </div>
        <h3 className="mt-2 line-clamp-2 text-lg font-bold text-navy">{book.title}</h3>
        {book.subtitle && <p className="mt-0.5 line-clamp-1 text-xs text-slate-500">{book.subtitle}</p>}
        <p className="mt-1 text-xs text-slate-500">by {book.author.penName || `${book.author.firstName} ${book.author.lastName}`}</p>
        {book.description && <p className="mt-2 line-clamp-2 text-sm text-slate-600">{book.description}</p>}
        <div className="mt-auto flex items-center justify-between border-t border-slate-100 pt-4">
          {book.sellingPrice ? <span className="text-base font-extrabold text-navy"><Money amount={book.sellingPrice} /></span> : <span className="text-xs text-slate-400">Price on request</span>}
          <NavButton to="book-detail" params={{ id: book.id }} variant="ghost" size="sm">View <ArrowRight className="h-3.5 w-3.5" /></NavButton>
        </div>
      </div>
    </article>
  );
}

export default BooksView;
