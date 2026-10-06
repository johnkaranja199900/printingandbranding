'use client';

import { useEffect, useState, useMemo } from 'react';
import { AdminLayout } from '@/components/shared/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/shared/Button';
import { Money, EmptyState, StatusBadge } from '@/components/shared/primitives';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useAppStore, type ViewKey } from '@/stores/app-store';
import { apiClient } from '@/lib/api-client';
import { cn } from '@/lib/utils';
import { formatDate, toNumber } from '@/lib/types';
import {
  BookOpen, Plus, Star, Search, Library, FileText, Users, Pencil, BookMarked, User,
} from 'lucide-react';

interface Book {
  id: string;
  title: string;
  subtitle?: string | null;
  description?: string | null;
  genre?: string | null;
  language?: string;
  publicationStatus: string;
  publicationDate?: string | null;
  sellingPrice?: string | number | null;
  coverImageUrl?: string | null;
  isFeatured: boolean;
  isPublished: boolean;
  author?: { firstName: string; lastName: string; penName?: string | null } | null;
}

interface BookResp { data: Book[]; meta: any }
interface ServiceCategory { id: string; name: string; slug: string; services: any[] }

const STATUS_FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'DRAFT', label: 'Draft' },
  { value: 'MANUSCRIPT_SUBMITTED', label: 'Manuscript' },
  { value: 'EDITING', label: 'Editing' },
  { value: 'DESIGN', label: 'Design' },
  { value: 'PROOFREADING', label: 'Proofreading' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'PRINTING', label: 'Printing' },
  { value: 'PUBLISHED', label: 'Published' },
  { value: 'ARCHIVED', label: 'Archived' },
];

const MANUSCRIPT_STATUSES = ['DRAFT', 'MANUSCRIPT_SUBMITTED', 'EDITING', 'DESIGN', 'PROOFREADING', 'APPROVED'];

export default function AdminPublishing() {
  const { pushToast, navigate } = useAppStore();
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('all');
  const [search, setSearch] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [tab, setTab] = useState('books');

  useEffect(() => {
    let active = true;
    setLoading(true);
    apiClient.get<BookResp>('/public/books?pageSize=50')
      .then((d: any) => { if (active) setBooks(d?.data ?? []); })
      .catch((e: any) => pushToast({ message: e?.message ?? 'Failed to load books.', type: 'error' }))
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const filteredBooks = useMemo(() => {
    let list = books;
    if (status !== 'all') list = list.filter(b => b.publicationStatus === status);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(b =>
        b.title.toLowerCase().includes(q) ||
        (b.author?.firstName + ' ' + b.author?.lastName).toLowerCase().includes(q) ||
        (b.author?.penName ?? '').toLowerCase().includes(q) ||
        (b.genre ?? '').toLowerCase().includes(q),
      );
    }
    return list;
  }, [books, status, search]);

  const manuscripts = useMemo(
    () => books.filter(b => MANUSCRIPT_STATUSES.includes(b.publicationStatus)),
    [books],
  );

  const authors = useMemo(() => {
    const map = new Map<string, { name: string; penName?: string | null; bookCount: number; published: number }>();
    for (const b of books) {
      if (!b.author) continue;
      const name = `${b.author.firstName} ${b.author.lastName}`.trim();
      const key = name + '|' + (b.author.penName ?? '');
      if (!map.has(key)) {
        map.set(key, { name, penName: b.author.penName ?? null, bookCount: 0, published: 0 });
      }
      const a = map.get(key)!;
      a.bookCount += 1;
      if (b.publicationStatus === 'PUBLISHED') a.published += 1;
    }
    return Array.from(map.values()).sort((a, b) => b.bookCount - a.bookCount);
  }, [books]);

  const stats = useMemo(() => ({
    total: books.length,
    published: books.filter(b => b.publicationStatus === 'PUBLISHED').length,
    inProgress: manuscripts.length,
    authors: authors.length,
    featured: books.filter(b => b.isFeatured).length,
  }), [books, manuscripts, authors]);

  const openBook = (bookId: string) => {
    navigate('book-detail' as ViewKey, { id: bookId });
  };

  const handleAddBook = () => {
    setAddOpen(false);
    pushToast({ message: 'Book creation — coming soon.', type: 'info' });
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-xs font-bold uppercase tracking-[0.18em] text-gold">Admin · Publishing</div>
            <h1 className="mt-1 text-2xl font-extrabold text-navy sm:text-3xl">Publishing House</h1>
            <p className="mt-1 text-sm text-slate-500">Manage books, manuscripts in production, and author relationships.</p>
          </div>
          <Button variant="accent" size="md" onClick={() => setAddOpen(true)}>
            <Plus className="h-4 w-4" /> Add Book
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
          <StatCard icon={<BookOpen className="h-5 w-5" />} label="Total books" value={stats.total} accent="navy" />
          <StatCard icon={<BookMarked className="h-5 w-5" />} label="Published" value={stats.published} accent="emerald" />
          <StatCard icon={<FileText className="h-5 w-5" />} label="In production" value={stats.inProgress} accent="gold" />
          <StatCard icon={<Star className="h-5 w-5" />} label="Featured" value={stats.featured} accent="amber" />
          <StatCard icon={<Users className="h-5 w-5" />} label="Authors" value={stats.authors} accent="violet" />
        </div>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="bg-slate-100">
            <TabsTrigger value="books"><BookOpen className="h-3.5 w-3.5" /> Books ({books.length})</TabsTrigger>
            <TabsTrigger value="manuscripts"><FileText className="h-3.5 w-3.5" /> Manuscripts ({manuscripts.length})</TabsTrigger>
            <TabsTrigger value="authors"><Users className="h-3.5 w-3.5" /> Authors ({authors.length})</TabsTrigger>
          </TabsList>

          {/* BOOKS */}
          <TabsContent value="books" className="space-y-4">
            <Card className="border-slate-200">
              <CardHeader className="border-b border-slate-100 pb-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <CardTitle className="text-navy">Book Library</CardTitle>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <Input
                        placeholder="Search title, author, genre..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-9 sm:w-72"
                      />
                    </div>
                    <Select value={status} onValueChange={setStatus}>
                      <SelectTrigger className="w-full sm:w-48"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {STATUS_FILTERS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-4">
                {loading ? (
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-80 w-full rounded-2xl" />)}
                  </div>
                ) : filteredBooks.length === 0 ? (
                  <EmptyState icon={<Library className="h-5 w-5" />} title="No books found" description="Adjust filters or add a new book." />
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {filteredBooks.map(book => (
                      <BookCard key={book.id} book={book} onClick={() => openBook(book.id)} />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* MANUSCRIPTS */}
          <TabsContent value="manuscripts" className="space-y-4">
            <Card className="border-slate-200">
              <CardHeader className="border-b border-slate-100">
                <CardTitle className="flex items-center gap-2 text-navy"><FileText className="h-4 w-4 text-gold" /> Manuscripts in Production</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {loading ? (
                  <div className="space-y-2 p-4">
                    {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
                  </div>
                ) : manuscripts.length === 0 ? (
                  <div className="p-6">
                    <EmptyState icon={<FileText className="h-5 w-5" />} title="No manuscripts in production" description="Books currently being edited, designed, proofread, or printed will appear here." />
                  </div>
                ) : (
                  <ul className="divide-y divide-slate-100">
                    {manuscripts.map(b => (
                      <li key={b.id}>
                        <button onClick={() => openBook(b.id)} className="flex w-full items-center gap-4 p-4 text-left transition hover:bg-slate-50 sm:p-6">
                          <div className="grid h-12 w-12 flex-shrink-0 place-items-center rounded-lg bg-navy text-gold">
                            <BookOpen className="h-5 w-5" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="font-bold text-navy truncate">{b.title}</p>
                              <StatusBadge status={b.publicationStatus} />
                            </div>
                            <p className="mt-0.5 text-xs text-slate-500">
                              by {b.author ? `${b.author.firstName} ${b.author.lastName}${b.author.penName ? ` (${b.author.penName})` : ''}` : 'Unknown'}
                            </p>
                            {b.subtitle && <p className="mt-1 text-xs text-slate-500 truncate">{b.subtitle}</p>}
                          </div>
                          <div className="hidden text-right sm:block">
                            {b.publicationDate && <p className="text-xs text-slate-500">Updated {formatDate(b.publicationDate)}</p>}
                            <p className="mt-1 text-xs font-semibold text-gold">View →</p>
                          </div>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* AUTHORS */}
          <TabsContent value="authors" className="space-y-4">
            <Card className="border-slate-200">
              <CardHeader className="border-b border-slate-100">
                <CardTitle className="flex items-center gap-2 text-navy"><Users className="h-4 w-4 text-gold" /> Authors</CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                {loading ? (
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-32 w-full rounded-2xl" />)}
                  </div>
                ) : authors.length === 0 ? (
                  <EmptyState icon={<Users className="h-5 w-5" />} title="No authors yet" />
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {authors.map(a => (
                      <Card key={a.name + a.penName} className="border-slate-200 p-4">
                        <div className="flex items-start gap-3">
                          <div className="grid h-12 w-12 flex-shrink-0 place-items-center rounded-full bg-gold-soft text-navy font-bold">
                            <User className="h-5 w-5" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-bold text-navy truncate">{a.name}</p>
                            {a.penName && <p className="text-xs text-slate-500">aka {a.penName}</p>}
                            <div className="mt-2 flex gap-2">
                              <Badge variant="secondary" className="bg-slate-100 text-xs">
                                <BookOpen className="mr-1 h-3 w-3" /> {a.bookCount} {a.bookCount === 1 ? 'book' : 'books'}
                              </Badge>
                              <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 text-xs">
                                <BookMarked className="mr-1 h-3 w-3" /> {a.published} published
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Add Book Dialog (demo) */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-navy"><BookOpen className="h-4 w-4 text-gold" /> Add a New Book</DialogTitle>
            <DialogDescription>Create a new book entry. (Full publishing workflow coming soon — this form demonstrates the UI.)</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="book-title">Title</Label>
              <Input id="book-title" placeholder="e.g. Whispers of the Savannah" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="book-genre">Genre</Label>
                <Input id="book-genre" placeholder="e.g. Fiction" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="book-price">Selling price (KES)</Label>
                <Input id="book-price" type="number" placeholder="0" />
              </div>
            </div>
            <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800">
              Note: book creation is in demo mode. Saved changes won't persist until the backend endpoint is wired up.
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" size="md" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button variant="primary" size="md" onClick={handleAddBook}>
              <Plus className="h-4 w-4" /> Create Book
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}

function BookCard({ book, onClick }: { book: Book; onClick: () => void }) {
  const authorName = book.author ? `${book.author.firstName} ${book.author.lastName}`.trim() : 'Unknown author';
  return (
    <button onClick={onClick} className="group flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="relative aspect-[3/4] w-full overflow-hidden bg-slate-100">
        {book.coverImageUrl ? (
          <img src={book.coverImageUrl} alt={book.title} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
        ) : (
          <div className="grid h-full place-items-center bg-gradient-to-br from-navy to-navy-soft text-gold">
            <BookOpen className="h-12 w-12" />
          </div>
        )}
        {book.isFeatured && (
          <div className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-gold px-2 py-0.5 text-[10px] font-bold text-[#1a1508] shadow">
            <Star className="h-3 w-3 fill-current" /> Featured
          </div>
        )}
        <div className="absolute right-2 top-2">
          <StatusBadge status={book.publicationStatus} />
        </div>
      </div>
      <div className="flex flex-1 flex-col p-3">
        <p className="line-clamp-2 font-bold text-navy">{book.title}</p>
        <p className="mt-0.5 text-xs text-slate-500">by {authorName}</p>
        <div className="mt-2 flex items-center justify-between">
          {book.genre ? <Badge variant="outline" className="text-[10px]">{book.genre}</Badge> : <span />}
          {toNumber(book.sellingPrice) > 0 && <Money amount={book.sellingPrice} className="text-sm font-bold text-navy" />}
        </div>
      </div>
    </button>
  );
}

function StatCard({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: number; accent: 'navy' | 'gold' | 'emerald' | 'amber' | 'violet' }) {
  const styles: Record<string, string> = {
    navy: 'bg-navy text-white',
    gold: 'bg-gold text-[#1a1508]',
    emerald: 'bg-emerald-600 text-white',
    amber: 'bg-amber-600 text-white',
    violet: 'bg-violet-700 text-white',
  };
  return (
    <Card className="border-slate-200 p-4">
      <div className="flex items-center gap-3">
        <div className={cn('grid h-10 w-10 place-items-center rounded-xl', styles[accent])}>{icon}</div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
          <p className="text-xl font-extrabold text-navy">{value}</p>
        </div>
      </div>
    </Card>
  );
}
