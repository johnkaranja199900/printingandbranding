'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { NavButton } from '@/components/shared/Button';
import { Eyebrow, PageHero, Money } from '@/components/shared/primitives';
import { ArrowRight, BookOpen, PenLine, LayoutTemplate, SpellCheck, Printer, BookMarked, Check, Sparkles, FileText } from 'lucide-react';

interface ServiceCategory { id: string; name: string; slug: string; description?: string; services: Service[] }
interface Service { id: string; name: string; slug: string; description?: string; pricingType: string; basePrice?: string | null; unitName?: string | null; estimatedDays?: number | null; isFeatured?: boolean }
interface Book { id: string; title: string; subtitle?: string | null; coverImageUrl?: string | null; genre?: string | null; sellingPrice?: string | null; author: { firstName: string; lastName: string; penName?: string | null } }

const PROCESS_STEPS = [
  { icon: FileText, label: 'Manuscript', desc: 'Author submits the draft manuscript for review.' },
  { icon: PenLine, label: 'Editing', desc: 'Structural and copy editing for clarity and flow.' },
  { icon: LayoutTemplate, label: 'Design', desc: 'Interior layout and professional cover design.' },
  { icon: SpellCheck, label: 'Proofreading', desc: 'Final pass to catch typos and formatting issues.' },
  { icon: Printer, label: 'Printing', desc: 'Production of the first print run to spec.' },
  { icon: BookMarked, label: 'Published', desc: 'Book enters catalogue and reaches readers.' },
];

function priceLabel(s: Service) {
  if (s.pricingType === 'FIXED' && s.basePrice) return `Fixed · KES ${Number(s.basePrice).toLocaleString()}`;
  if (s.pricingType === 'PER_UNIT' && s.basePrice) return `KES ${Number(s.basePrice).toLocaleString()} / ${s.unitName ?? 'unit'}`;
  if (s.pricingType === 'PER_PAGE' && s.basePrice) return `KES ${Number(s.basePrice).toLocaleString()} / page`;
  return 'Custom quote';
}

export function PublishingView() {
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      apiClient.get<ServiceCategory[]>('/public/services').then((d) => d as any).catch(() => []),
      apiClient.get<{ data: Book[] }>('/public/books?featured=true').then((d: any) => d?.data ?? d ?? []).catch(() => []),
    ]).then(([c, b]) => {
      setCategories(c ?? []);
      setBooks(b ?? []);
      setLoading(false);
    });
  }, []);

  const publishingCat = categories.find((c) => c.slug === 'publishing');
  const services = publishingCat?.services ?? [];

  return (
    <>
      <PageHero
        eyebrow="Publishing"
        title="Bring your manuscript to life"
        description="From first draft to finished book — editorial guidance, professional design, ISBN support and your first print run, all under one roof."
        breadcrumbs="Home / Publishing"
        actions={
          <>
            <NavButton to="quote" variant="accent" size="lg"><BookOpen className="h-4 w-4" /> Submit Manuscript</NavButton>
            <NavButton to="books" variant="outline" size="lg">Browse Books</NavButton>
          </>
        }
      />

      {/* Publishing services */}
      <section className="py-16 lg:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-10">
            <Eyebrow>Publishing services</Eyebrow>
            <h2 className="mt-2 text-3xl font-extrabold text-navy sm:text-4xl">Everything you need to publish with confidence</h2>
            <p className="mt-3 max-w-2xl text-slate-600">{publishingCat?.description ?? 'Professional book publishing support for authors, churches and institutions.'}</p>
          </div>

          {loading ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {[0, 1, 2].map((i) => <div key={i} className="h-56 animate-pulse rounded-2xl bg-slate-200" />)}
            </div>
          ) : services.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">Publishing services will be listed here soon.</div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {services.map((s) => (
                <article key={s.id} className="group flex flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-xl">
                  <div className="flex items-start justify-between">
                    <div className="grid h-11 w-11 place-items-center rounded-xl bg-navy text-gold"><BookOpen className="h-5 w-5" /></div>
                    {s.isFeatured && <span className="inline-flex items-center gap-1 rounded-full bg-gold/15 px-2.5 py-0.5 text-xs font-bold text-gold"><Sparkles className="h-3 w-3" /> Featured</span>}
                  </div>
                  <h3 className="mt-4 text-lg font-bold text-navy">{s.name}</h3>
                  <p className="mt-1 line-clamp-3 flex-1 text-sm text-slate-500">{s.description}</p>
                  <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4">
                    <div>
                      <p className="text-xs text-slate-400">Starting at</p>
                      <p className="text-sm font-bold text-navy">{priceLabel(s)}</p>
                    </div>
                    {s.estimatedDays && <p className="text-xs text-slate-500">~{s.estimatedDays} day(s)</p>}
                  </div>
                  <NavButton to="quote" variant="ghost" size="sm" className="mt-4 w-full">Request Quote <ArrowRight className="h-3.5 w-3.5" /></NavButton>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Publishing process */}
      <section className="bg-white py-16 lg:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-10 text-center">
            <Eyebrow className="mb-2">Our publishing process</Eyebrow>
            <h2 className="text-3xl font-extrabold text-navy sm:text-4xl">From manuscript to marketplace</h2>
            <p className="mx-auto mt-3 max-w-2xl text-slate-600">A clear, professionally managed workflow that keeps you informed at every stage.</p>
          </div>
          <ol className="grid gap-6 md:grid-cols-3 lg:grid-cols-6">
            {PROCESS_STEPS.map((step, i) => {
              const Icon = step.icon;
              return (
                <li key={step.label} className="relative rounded-2xl border border-slate-200 bg-slate-50 p-5 text-center">
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gold px-2.5 py-0.5 text-xs font-extrabold text-navy">{i + 1}</div>
                  <div className="mx-auto mt-2 grid h-12 w-12 place-items-center rounded-xl bg-navy text-gold"><Icon className="h-6 w-6" /></div>
                  <h3 className="mt-3 text-sm font-bold text-navy">{step.label}</h3>
                  <p className="mt-1 text-xs text-slate-500">{step.desc}</p>
                </li>
              );
            })}
          </ol>
        </div>
      </section>

      {/* Author support */}
      <section className="py-16 lg:py-20">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 sm:px-6 lg:grid-cols-2 lg:px-8">
          <div className="rounded-3xl bg-gradient-to-br from-navy to-navy-soft p-8 text-white shadow-xl lg:p-10">
            <Eyebrow className="text-gold">Author support</Eyebrow>
            <h2 className="mt-2 text-2xl font-bold sm:text-3xl">Clear, professional publishing support from idea to final copy.</h2>
            <ul className="mt-6 space-y-3">
              {[
                'Submit manuscripts for review and publishing consideration.',
                'Communicate directly with the publishing team throughout the process.',
                'Review, revise and approve book files before production.',
                'Final versions archived securely for reprints and updates.',
                'Published titles appear in our public book catalogue.',
              ].map((it) => (
                <li key={it} className="flex items-start gap-3 text-white/85">
                  <Check className="mt-0.5 h-5 w-5 flex-shrink-0 text-emerald-400" />{it}
                </li>
              ))}
            </ul>
            <NavButton to="quote" variant="accent" size="lg" className="mt-6">Submit Your Manuscript <ArrowRight className="h-4 w-4" /></NavButton>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm lg:p-10">
            <Eyebrow>What is included</Eyebrow>
            <h3 className="mt-2 text-xl font-bold text-navy sm:text-2xl">A complete publishing package</h3>
            <ul className="mt-6 space-y-4">
              {[
                { t: 'Editorial review', d: 'Guidance on structure, clarity and publishing readiness.' },
                { t: 'Design & layout', d: 'Interior formatting and professional cover treatment.' },
                { t: 'ISBN & metadata', d: 'Registration assistance and bibliographic data setup.' },
                { t: 'Production planning', d: 'Print-ready files and final production scheduling.' },
                { t: 'Archive & reprints', d: 'Final files retained for future editions and reprints.' },
              ].map((it) => (
                <li key={it.t} className="flex items-start gap-3">
                  <span className="mt-1.5 h-2.5 w-2.5 flex-shrink-0 rounded-full bg-gold" />
                  <div>
                    <p className="font-bold text-navy">{it.t}</p>
                    <p className="text-sm text-slate-500">{it.d}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Featured books */}
      {books.length > 0 && (
        <section className="bg-slate-50 py-16 lg:py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mb-10 flex items-end justify-between">
              <div>
                <Eyebrow>From our catalogue</Eyebrow>
                <h2 className="mt-2 text-3xl font-extrabold text-navy sm:text-4xl">Recently published titles</h2>
              </div>
              <NavButton to="books" variant="ghost" size="md">View all <ArrowRight className="h-4 w-4" /></NavButton>
            </div>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {books.slice(0, 3).map((b) => (
                <article key={b.id} className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all hover:-translate-y-1 hover:shadow-xl">
                  <div className="flex gap-4 p-4">
                    <div className="w-24 flex-shrink-0">
                      {b.coverImageUrl ? (
                        <img src={b.coverImageUrl} alt={b.title} className="h-32 w-24 rounded-lg object-cover shadow-md" />
                      ) : (
                        <div className="grid h-32 w-24 place-items-center rounded-lg bg-gradient-to-br from-navy to-navy-soft text-center text-xs font-bold text-gold shadow-md">
                          {b.title.split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[0.7rem] font-bold uppercase tracking-wide text-gold">{b.genre ?? 'General'}</p>
                      <h3 className="mt-1 line-clamp-2 font-bold text-navy">{b.title}</h3>
                      <p className="mt-1 text-xs text-slate-500">by {b.author.penName || `${b.author.firstName} ${b.author.lastName}`}</p>
                      {b.sellingPrice && <p className="mt-2 text-sm font-bold text-navy"><Money amount={b.sellingPrice} /></p>}
                    </div>
                  </div>
                  <NavButton to="book-detail" params={{ id: b.id }} variant="light" size="sm" className="mx-4 mb-4 w-[calc(100%-2rem)]">View Book <ArrowRight className="h-3.5 w-3.5" /></NavButton>
                </article>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="bg-gradient-to-br from-navy to-[#1f2937] py-16 text-white">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="text-3xl font-extrabold sm:text-4xl">Ready to publish your book?</h2>
          <p className="mt-3 text-white/80">Tell us about your manuscript and we'll prepare a transparent quotation for your publishing journey.</p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <NavButton to="quote" variant="accent" size="lg">Request a Quote <ArrowRight className="h-4 w-4" /></NavButton>
            <NavButton to="contact" variant="outline" size="lg">Talk to a Publisher</NavButton>
          </div>
        </div>
      </section>
    </>
  );
}

export default PublishingView;
