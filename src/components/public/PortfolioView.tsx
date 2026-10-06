'use client';

import { useEffect, useMemo, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { NavButton } from '@/components/shared/Button';
import { Eyebrow, PageHero, EmptyState } from '@/components/shared/primitives';
import { ArrowRight, Layers, Calendar, User, Sparkles, ImageOff } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PortfolioItem {
  id: string;
  title: string;
  slug: string;
  category: string;
  description?: string | null;
  imageUrl?: string | null;
  projectDate?: string | null;
  clientName?: string | null;
  isFeatured?: boolean;
}

const PLACEHOLDER_GRADIENTS = [
  'from-navy to-navy-soft',
  'from-gold to-[#8a6508]',
  'from-emerald-900 to-navy',
  'from-rose-900 to-navy',
  'from-violet-900 to-navy',
  'from-sky-900 to-navy',
];

function gradientFor(title: string) {
  const sum = title.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  return PLACEHOLDER_GRADIENTS[sum % PLACEHOLDER_GRADIENTS.length];
}

export function PortfolioView() {
  const [items, setItems] = useState<PortfolioItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('All');

  useEffect(() => {
    apiClient
      .get<{ data: PortfolioItem[] }>('/public/portfolio?page=1&pageSize=100')
      .then((d: any) => setItems(d?.data ?? d ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const categories = useMemo(() => {
    const set = new Set<string>();
    items.forEach((i) => i.category && set.add(i.category));
    return ['All', ...Array.from(set).sort()];
  }, [items]);

  const filtered = useMemo(() => {
    if (filter === 'All') return items;
    return items.filter((i) => i.category === filter);
  }, [items, filter]);

  return (
    <>
      <PageHero
        eyebrow="Portfolio"
        title="Recent work, crafted with care"
        description="A snapshot of books, branding, banners and printed materials we've delivered for clients across Kenya — schools, churches, NGOs, businesses and authors."
        breadcrumbs="Home / Portfolio"
        actions={<NavButton to="quote" variant="accent" size="lg">Start a Project <ArrowRight className="h-4 w-4" /></NavButton>}
      />

      <section className="py-12 lg:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* Filters */}
          {categories.length > 1 && (
            <div className="mb-8 flex flex-wrap gap-2">
              {categories.map((c) => (
                <button
                  key={c}
                  onClick={() => setFilter(c)}
                  className={cn(
                    'rounded-full px-4 py-1.5 text-sm font-bold transition-colors',
                    filter === c ? 'bg-navy text-white shadow-md' : 'border border-slate-200 bg-white text-navy-soft hover:border-gold hover:text-gold',
                  )}
                >
                  {c}
                </button>
              ))}
            </div>
          )}

          {/* Grid */}
          {loading ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {[0, 1, 2, 3, 4, 5].map((i) => <div key={i} className="h-72 animate-pulse rounded-2xl bg-slate-200" />)}
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={<Layers className="h-6 w-6" />}
              title={filter === 'All' ? 'No portfolio items yet' : `No items in "${filter}"`}
              description="Check back soon for recent work, or browse our services to start your own project."
              action={<NavButton to="quote" variant="primary" size="md">Start a Project</NavButton>}
            />
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((item) => (
                <PortfolioCard key={item.id} item={item} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* CTA */}
      <section className="bg-gradient-to-br from-navy to-[#1f2937] py-16 text-white">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="text-3xl font-extrabold sm:text-4xl">Your project could be next</h2>
          <p className="mt-3 text-white/80">Tell us what you need — we'll bring the same care and craft to your work.</p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <NavButton to="quote" variant="accent" size="lg">Start a Project <ArrowRight className="h-4 w-4" /></NavButton>
            <NavButton to="contact" variant="outline" size="lg">Contact Us</NavButton>
          </div>
        </div>
      </section>
    </>
  );
}

function PortfolioCard({ item }: { item: PortfolioItem }) {
  return (
    <article className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all hover:-translate-y-1 hover:shadow-xl">
      <div className="relative aspect-[4/3] overflow-hidden bg-slate-100">
        {item.imageUrl ? (
          <img src={item.imageUrl} alt={item.title} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
        ) : (
          <div className={cn('flex h-full w-full items-center justify-center bg-gradient-to-br', gradientFor(item.title))}>
            <ImageOff className="h-10 w-10 text-white/50" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-navy via-navy/20 to-transparent opacity-90 transition-opacity group-hover:opacity-95" />
        {item.isFeatured && (
          <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-gold px-2.5 py-0.5 text-xs font-bold text-navy">
            <Sparkles className="h-3 w-3" /> Featured
          </span>
        )}
        <div className="absolute bottom-0 left-0 right-0 translate-y-1 p-5 text-white transition-transform group-hover:translate-y-0">
          <p className="text-xs font-bold uppercase tracking-wide text-gold">{item.category}</p>
          <h3 className="mt-1 text-lg font-bold">{item.title}</h3>
          {item.description && <p className="mt-1 line-clamp-2 text-sm text-white/80">{item.description}</p>}
          <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-white/70">
            {item.clientName && (
              <span className="inline-flex items-center gap-1"><User className="h-3 w-3" /> {item.clientName}</span>
            )}
            {item.projectDate && (
              <span className="inline-flex items-center gap-1"><Calendar className="h-3 w-3" /> {new Date(item.projectDate).toLocaleDateString('en-KE', { year: 'numeric', month: 'short' })}</span>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

export default PortfolioView;
