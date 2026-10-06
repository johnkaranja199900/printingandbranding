'use client';

import { useEffect, useState } from 'react';
import { useAppStore } from '@/stores/app-store';
import { apiClient } from '@/lib/api-client';
import { NavButton } from '@/components/shared/Button';
import { Eyebrow, Money, EmptyState, StatusBadge } from '@/components/shared/primitives';
import { ArrowRight, BookOpen, User, Calendar, FileText, BookMarked, Languages, Hash, Ruler, Layers, Tag, ChevronLeft } from 'lucide-react';
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
  paperType?: string | null;
  format?: string | null;
  sellingPrice?: string | null;
  coverImageUrl?: string | null;
  isFeatured?: boolean;
  author: {
    firstName: string;
    lastName: string;
    penName?: string | null;
    bio?: string | null;
  };
  manuscripts?: { id: string; versionNumber: number; status: string }[];
}

interface BookListItem {
  id: string;
  title: string;
  genre?: string | null;
  coverImageUrl?: string | null;
  sellingPrice?: string | null;
  author: { firstName: string; lastName: string; penName?: string | null };
}

const COVER_GRADIENTS = [
  'from-navy to-navy-soft',
  'from-gold to-[#8a6508]',
  'from-emerald-900 to-navy',
  'from-rose-900 to-navy',
  'from-violet-900 to-navy',
];

function coverGradientFor(title: string) {
  const sum = title.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  return COVER_GRADIENTS[sum % COVER_GRADIENTS.length];
}

export function BookDetailView() {
  const { params, navigate } = useAppStore();
  const [book, setBook] = useState<Book | null>(null);
  const [related, setRelated] = useState<BookListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const id = params?.id;
    if (!id) { setError('No book specified.'); setLoading(false); return; }
    setLoading(true);
    apiClient
      .get<Book>(`/public/books/${id}`)
      .then((d) => {
        const b = d as any;
        setBook(b);
        setLoading(false);
        // Fetch related by genre
        if (b?.genre) {
          apiClient
            .get<{ data: BookListItem[] }>(`/public/books?page=1&pageSize=10`)
            .then((res: any) => {
              const list: BookListItem[] = res?.data ?? res ?? [];
              setRelated(list.filter((x) => x.genre === b.genre && x.id !== b.id).slice(0, 4));
            })
            .catch(() => {});
        }
      })
      .catch((e: any) => { setError(e.message ?? 'Book not found'); setLoading(false); });
  }, [params?.id]);

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr]">
          <div className="h-[420px] animate-pulse rounded-3xl bg-slate-200" />
          <div className="space-y-4">
            <div className="h-6 w-24 animate-pulse rounded bg-slate-200" />
            <div className="h-10 w-3/4 animate-pulse rounded bg-slate-200" />
            <div className="h-4 w-1/2 animate-pulse rounded bg-slate-200" />
            <div className="h-32 w-full animate-pulse rounded bg-slate-200" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !book) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16">
        <EmptyState
          icon={<BookOpen className="h-6 w-6" />}
          title="Book not found"
          description={error ?? 'The book you are looking for may have been removed or is no longer available.'}
          action={<NavButton to="books" variant="primary" size="md">Browse Books</NavButton>}
        />
      </div>
    );
  }

  const authorName = book.author.penName || `${book.author.firstName} ${book.author.lastName}`;
  const initials = (book.title ?? '').split(' ').slice(0, 2).map((w) => w[0] ?? '').join('').toUpperCase();

  return (
    <>
      {/* Hero */}
      <section className="bg-gradient-to-br from-navy via-navy-soft to-navy text-white">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
          <button onClick={() => navigate('books')} className="mb-4 inline-flex items-center gap-1 text-sm text-white/70 hover:text-gold">
            <ChevronLeft className="h-4 w-4" /> Back to books
          </button>
          <Eyebrow>Published title</Eyebrow>
          <h1 className="mt-2 max-w-3xl text-3xl font-extrabold leading-tight sm:text-4xl lg:text-5xl">{book.title}</h1>
          {book.subtitle && <p className="mt-2 text-lg text-white/80">{book.subtitle}</p>}
        </div>
      </section>

      <section className="py-12 lg:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr]">
            {/* Cover */}
            <div className="lg:sticky lg:top-24 lg:self-start">
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
                {book.coverImageUrl ? (
                  <img src={book.coverImageUrl} alt={book.title} className="h-[480px] w-full object-cover" />
                ) : (
                  <div className={cn('flex h-[480px] w-full items-center justify-center bg-gradient-to-br', coverGradientFor(book.title))}>
                    <div className="text-center">
                      <BookOpen className="mx-auto h-12 w-12 text-white/40" />
                      <div className="mt-4 text-5xl font-extrabold text-white/90">{initials}</div>
                    </div>
                  </div>
                )}
              </div>
              <NavButton to="quote" variant="accent" size="lg" className="mt-4 w-full">Request This Book <ArrowRight className="h-4 w-4" /></NavButton>
              {book.isFeatured && <p className="mt-3 text-center text-xs font-bold uppercase tracking-wide text-gold">★ Featured Title</p>}
            </div>

            {/* Meta */}
            <div>
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
                <div className="flex flex-wrap items-center gap-2">
                  {book.genre && <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-navy-soft"><Tag className="h-3 w-3" /> {book.genre}</span>}
                  {book.publicationStatus && <StatusBadge status={book.publicationStatus} />}
                </div>
                <h2 className="mt-3 text-2xl font-extrabold text-navy sm:text-3xl">{book.title}</h2>
                <p className="mt-1 text-slate-600">by <button onClick={() => navigate('books')} className="font-bold text-gold hover:underline">{authorName}</button></p>

                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  <Meta icon={<User className="h-4 w-4" />} label="Author" value={authorName} />
                  <Meta icon={<Languages className="h-4 w-4" />} label="Language" value={book.language ?? 'English'} />
                  <Meta icon={<Hash className="h-4 w-4" />} label="ISBN" value={book.isbn ?? '—'} />
                  <Meta icon={<FileText className="h-4 w-4" />} label="Pages" value={book.pageCount ? `${book.pageCount}` : '—'} />
                  <Meta icon={<Ruler className="h-4 w-4" />} label="Format" value={book.format ?? '—'} />
                  <Meta icon={<Layers className="h-4 w-4" />} label="Cover" value={book.coverType ?? '—'} />
                </div>

                {book.sellingPrice && (
                  <div className="mt-6 flex items-end justify-between rounded-xl bg-navy p-5 text-white">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-white/60">Retail Price</p>
                      <p className="mt-1 text-3xl font-extrabold text-gold"><Money amount={book.sellingPrice} /></p>
                    </div>
                    <NavButton to="quote" variant="accent" size="md">Request This Book</NavButton>
                  </div>
                )}
              </div>

              {/* Description */}
              {book.description && (
                <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
                  <Eyebrow>About this book</Eyebrow>
                  <h3 className="mt-2 text-lg font-bold text-navy">Synopsis</h3>
                  <p className="mt-3 whitespace-pre-line text-slate-600">{book.description}</p>
                </div>
              )}

              {/* About author */}
              <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
                <Eyebrow>About the author</Eyebrow>
                <div className="mt-3 flex items-start gap-4">
                  <div className="grid h-14 w-14 flex-shrink-0 place-items-center rounded-full bg-gradient-to-br from-navy to-navy-soft text-lg font-extrabold text-gold">
                    {(book.author.firstName?.[0] ?? 'A').toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-navy">{authorName}</h3>
                    {book.author.penName && <p className="text-xs text-slate-500">Pen name · {book.author.penName}</p>}
                    <p className="mt-2 text-sm text-slate-600">{book.author.bio ?? `${authorName} is a published author with Print & Publish Co. Their work appears in our catalogue and is available for retail and reprint requests.`}</p>
                  </div>
                </div>
              </div>

              {/* Manuscript history */}
              {book.manuscripts && book.manuscripts.length > 0 && (
                <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
                  <Eyebrow>Production history</Eyebrow>
                  <h3 className="mt-2 text-lg font-bold text-navy">Manuscript versions</h3>
                  <ul className="mt-3 space-y-2">
                    {book.manuscripts.map((m) => (
                      <li key={m.id} className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-sm">
                        <span className="font-semibold text-navy-soft">Version {m.versionNumber}</span>
                        <StatusBadge status={m.status} />
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Related books */}
      {related.length > 0 && (
        <section className="bg-slate-50 py-12 lg:py-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mb-6 flex items-end justify-between">
              <div>
                <Eyebrow>More in {book.genre}</Eyebrow>
                <h2 className="mt-2 text-2xl font-extrabold text-navy sm:text-3xl">Related titles</h2>
              </div>
              <NavButton to="books" variant="ghost" size="md">All books <ArrowRight className="h-4 w-4" /></NavButton>
            </div>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {related.map((r) => (
                <article key={r.id} className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg">
                  <div className="h-44 overflow-hidden">
                    {r.coverImageUrl ? (
                      <img src={r.coverImageUrl} alt={r.title} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                    ) : (
                      <div className={cn('flex h-full w-full items-center justify-center bg-gradient-to-br', coverGradientFor(r.title))}>
                        <BookMarked className="h-8 w-8 text-white/70" />
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    <h3 className="line-clamp-1 font-bold text-navy">{r.title}</h3>
                    <p className="mt-1 text-xs text-slate-500">by {r.author.penName || `${r.author.firstName} ${r.author.lastName}`}</p>
                    {r.sellingPrice && <p className="mt-2 text-sm font-bold text-navy"><Money amount={r.sellingPrice} /></p>}
                    <NavButton to="book-detail" params={{ id: r.id }} variant="ghost" size="sm" className="mt-3 w-full">View Details</NavButton>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  );
}

function Meta({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50 p-3">
      <div className="mt-0.5 grid h-8 w-8 flex-shrink-0 place-items-center rounded-lg bg-navy text-gold">{icon}</div>
      <div className="min-w-0">
        <p className="text-xs text-slate-400">{label}</p>
        <p className="truncate text-sm font-bold text-navy">{value}</p>
      </div>
    </div>
  );
}

export default BookDetailView;
