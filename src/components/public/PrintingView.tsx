'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { NavButton } from '@/components/shared/Button';
import { Eyebrow, PageHero } from '@/components/shared/primitives';
import { ArrowRight, Printer, Check, Sparkles, FileText, CreditCard, Image, Award, FileStack, Mail, ClipboardList, BookCopy, Megaphone } from 'lucide-react';

interface ServiceCategory { id: string; name: string; slug: string; description?: string; services: Service[] }
interface Service { id: string; name: string; slug: string; description?: string; pricingType: string; basePrice?: string | null; unitName?: string | null; estimatedDays?: number | null; isFeatured?: boolean }

function priceLabel(s: Service) {
  if (s.pricingType === 'FIXED' && s.basePrice) return `KES ${Number(s.basePrice).toLocaleString()}`;
  if (s.pricingType === 'PER_UNIT' && s.basePrice) return `KES ${Number(s.basePrice).toLocaleString()} / ${s.unitName ?? 'unit'}`;
  if (s.pricingType === 'PER_PAGE' && s.basePrice) return `KES ${Number(s.basePrice).toLocaleString()} / page`;
  return 'Custom quote';
}

const WHAT_WE_PRINT = [
  { icon: CreditCard, name: 'Business Cards', desc: 'Premium stock, matte or gloss finishes, foil and spot UV available.' },
  { icon: Megaphone, name: 'Flyers & Posters', desc: 'A6 to A0, single or double-sided, large format ready.' },
  { icon: Image, name: 'Posters', desc: 'Eye-catching prints for events, promotions and campaigns.' },
  { icon: FileText, name: 'Documents', desc: 'Reports, proposals, training manuals and bound documents.' },
  { icon: Award, name: 'Certificates', desc: 'Academic, achievement and professional certificates.' },
  { icon: FileStack, name: 'Forms & Invoices', desc: 'NCR books, receipt books, custom business forms.' },
  { icon: Mail, name: 'Letterheads', desc: 'Branded corporate stationery on premium paper stock.' },
  { icon: BookCopy, name: 'Books & Notebooks', desc: 'Short-run and bulk book printing, custom notebooks.' },
];

const STEPS = [
  { n: '1', t: 'Share your brief', d: 'Tell us quantities, sizes, paper stock and finishing preferences.' },
  { n: '2', t: 'Receive a quote', d: 'We prepare a transparent quotation with turnaround time.' },
  { n: '3', t: 'Production', d: 'Print, finish, bind and quality-check your job.' },
  { n: '4', t: 'Collection / delivery', d: 'Ready for pickup or delivery to your location.' },
];

export function PrintingView() {
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient.get<ServiceCategory[]>('/public/services').then((d) => setCategories(d as any)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const printingCat = categories.find((c) => c.slug === 'printing');
  const services = printingCat?.services ?? [];

  return (
    <>
      <PageHero
        eyebrow="Printing Services"
        title="Crisp, professional printing for every need"
        description="From business cards and certificates to bulk book runs, large-format posters and branded stationery — modern digital and offset printing delivered to spec."
        breadcrumbs="Home / Printing Services"
        actions={
          <>
            <NavButton to="quote" variant="accent" size="lg"><Printer className="h-4 w-4" /> Request a Quote</NavButton>
            <NavButton to="portfolio" variant="outline" size="lg">View Portfolio</NavButton>
          </>
        }
      />

      {/* Services */}
      <section className="py-16 lg:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-10">
            <Eyebrow>Our printing services</Eyebrow>
            <h2 className="mt-2 text-3xl font-extrabold text-navy sm:text-4xl">Pick a service, request a quote in minutes</h2>
            <p className="mt-3 max-w-2xl text-slate-600">{printingCat?.description ?? 'Reliable digital and offset printing for businesses, schools, churches and institutions.'}</p>
          </div>

          {loading ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {[0, 1, 2].map((i) => <div key={i} className="h-56 animate-pulse rounded-2xl bg-slate-200" />)}
            </div>
          ) : services.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">Printing services will be listed here soon.</div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {services.map((s) => (
                <article key={s.id} className="group flex flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-xl">
                  <div className="flex items-start justify-between">
                    <div className="grid h-11 w-11 place-items-center rounded-xl bg-navy text-gold"><Printer className="h-5 w-5" /></div>
                    {s.isFeatured && <span className="inline-flex items-center gap-1 rounded-full bg-gold/15 px-2.5 py-0.5 text-xs font-bold text-gold"><Sparkles className="h-3 w-3" /> Popular</span>}
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

      {/* What we print */}
      <section className="bg-white py-16 lg:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-10">
            <Eyebrow>What we print</Eyebrow>
            <h2 className="mt-2 text-3xl font-extrabold text-navy sm:text-4xl">A full range of printed products</h2>
            <p className="mt-3 max-w-2xl text-slate-600">We print for businesses, schools, churches, NGOs and individuals — small runs to bulk orders.</p>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {WHAT_WE_PRINT.map((w) => {
              const Icon = w.icon;
              return (
                <article key={w.name} className="rounded-2xl border border-slate-200 bg-slate-50 p-5 transition-colors hover:border-gold hover:bg-white">
                  <div className="grid h-11 w-11 place-items-center rounded-xl bg-navy text-gold"><Icon className="h-5 w-5" /></div>
                  <h3 className="mt-3 text-base font-bold text-navy">{w.name}</h3>
                  <p className="mt-1 text-sm text-slate-500">{w.desc}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* Pricing highlights */}
      <section className="py-16 lg:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
              <Eyebrow>Per-page</Eyebrow>
              <p className="mt-2 text-4xl font-extrabold text-navy">KES 5<span className="text-base font-medium text-slate-400">/page</span></p>
              <p className="mt-2 text-sm text-slate-500">Black & white photocopying and standard document printing.</p>
              <ul className="mt-4 space-y-2 text-sm text-slate-600">
                {['A4 bond paper', 'Single or double-sided', 'Bulk discounts available'].map((i) => (
                  <li key={i} className="flex items-center gap-2"><Check className="h-4 w-4 text-emerald-500" />{i}</li>
                ))}
              </ul>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
              <Eyebrow>Per-unit</Eyebrow>
              <p className="mt-2 text-4xl font-extrabold text-navy">KES 15<span className="text-base font-medium text-slate-400">/copy</span></p>
              <p className="mt-2 text-sm text-slate-500">Booklets and bound document printing (8-page minimum).</p>
              <ul className="mt-4 space-y-2 text-sm text-slate-600">
                {['Saddle-stitch or perfect binding', 'Gloss or matte covers', 'Volume discounts'].map((i) => (
                  <li key={i} className="flex items-center gap-2"><Check className="h-4 w-4 text-emerald-500" />{i}</li>
                ))}
              </ul>
            </div>
            <div className="rounded-3xl bg-gradient-to-br from-navy to-navy-soft p-8 text-white shadow-xl">
              <Eyebrow className="text-gold">Custom quote</Eyebrow>
              <p className="mt-2 text-4xl font-extrabold">Tailored</p>
              <p className="mt-2 text-sm text-white/70">Large runs, special finishes, branded stationery and bespoke projects.</p>
              <ul className="mt-4 space-y-2 text-sm text-white/85">
                {['Free consultation', 'Detailed line-item quotation', 'Dedicated production manager'].map((i) => (
                  <li key={i} className="flex items-center gap-2"><Check className="h-4 w-4 text-emerald-400" />{i}</li>
                ))}
              </ul>
              <NavButton to="quote" variant="accent" size="md" className="mt-6 w-full">Get Custom Quote</NavButton>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="bg-white py-16 lg:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-10 text-center">
            <Eyebrow className="mb-2">How it works</Eyebrow>
            <h2 className="text-3xl font-extrabold text-navy sm:text-4xl">Four simple steps from brief to delivery</h2>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((s) => (
              <div key={s.n} className="relative rounded-2xl border border-slate-200 bg-slate-50 p-6">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-navy text-sm font-extrabold text-gold">{s.n}</div>
                <h3 className="mt-3 text-base font-bold text-navy">{s.t}</h3>
                <p className="mt-1 text-sm text-slate-500">{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-gradient-to-br from-navy to-[#1f2937] py-16 text-white">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="text-3xl font-extrabold sm:text-4xl">Have a print job in mind?</h2>
          <p className="mt-3 text-white/80">Get a transparent quote today. Our team is ready to bring your project to print.</p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <NavButton to="quote" variant="accent" size="lg">Request a Quote <ArrowRight className="h-4 w-4" /></NavButton>
            <NavButton to="contact" variant="outline" size="lg">Contact Print Team</NavButton>
          </div>
        </div>
      </section>
    </>
  );
}

export default PrintingView;
