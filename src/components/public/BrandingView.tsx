'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { NavButton } from '@/components/shared/Button';
import { Eyebrow, PageHero } from '@/components/shared/primitives';
import { ArrowRight, Palette, Check, Sparkles, Truck, StickyNote, Shirt, Building2, CreditCard, Megaphone } from 'lucide-react';

interface ServiceCategory { id: string; name: string; slug: string; description?: string; services: Service[] }
interface Service { id: string; name: string; slug: string; description?: string; pricingType: string; basePrice?: string | null; unitName?: string | null; estimatedDays?: number | null; isFeatured?: boolean }

function priceLabel(s: Service) {
  if (s.pricingType === 'FIXED' && s.basePrice) return `KES ${Number(s.basePrice).toLocaleString()}`;
  if (s.pricingType === 'PER_UNIT' && s.basePrice) return `KES ${Number(s.basePrice).toLocaleString()} / ${s.unitName ?? 'unit'}`;
  if (s.pricingType === 'PER_PAGE' && s.basePrice) return `KES ${Number(s.basePrice).toLocaleString()} / page`;
  return 'Custom quote';
}

const SHOWCASE = [
  { title: 'Roll-Up Banners', image: 'https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&w=900&q=80', desc: 'Portable, impactful brand displays for events, launches and exhibitions.' },
  { title: 'Vehicle Branding', image: 'https://images.unsplash.com/photo-1556740749-887f6717d7e4?auto=format&fit=crop&w=900&q=80', desc: 'Turn vehicles into moving advertisements with durable branded wraps and graphics.' },
  { title: 'Wall & Window Branding', image: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=900&q=80', desc: 'Office and storefront visibility with weather-resistant vinyl and backlit prints.' },
  { title: 'Business Cards', image: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=900&q=80', desc: 'Premium cards and branded stationery designed to make a sharp first impression.' },
  { title: 'Stickers & Decals', image: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=900&q=80', desc: 'Brand merchandise, promotional decals and product labeling using durable materials.' },
  { title: 'T-Shirt Printing', image: 'https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?auto=format&fit=crop&w=900&q=80', desc: 'Custom team and promotional tees with standout print applications.' },
];

const MATERIALS = [
  { icon: StickyNote, name: 'Vinyl & PVC', desc: 'Durable, weather-resistant substrates for outdoor banners and signage.' },
  { icon: Building2, name: 'Large Format', desc: 'Backlit films, mesh banners and wall graphics up to 5m wide.' },
  { icon: CreditCard, name: 'Card & Paper', desc: 'Premium card stock (250–350gsm) for business cards and stationery.' },
  { icon: Shirt, name: 'Textile Printing', desc: 'Heat transfer, screen and DTF applications for apparel and fabric.' },
  { icon: Truck, name: 'Vehicle Wrap', desc: 'Cast vinyl wraps engineered for clean curves and clean removal.' },
  { icon: Megaphone, name: 'Event Activation', desc: 'Pop-up displays, table throws and promo kits for brand activations.' },
];

export function BrandingView() {
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient.get<ServiceCategory[]>('/public/services').then((d) => setCategories(d as any)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const brandingCat = categories.find((c) => c.slug === 'branding');
  const services = brandingCat?.services ?? [];

  return (
    <>
      <PageHero
        eyebrow="Branding & Signage"
        title="Brand visibility that commands attention"
        description="Roll-up banners, vehicle wraps, wall and window branding, business cards and corporate signage — designed, printed and installed with precision."
        breadcrumbs="Home / Branding"
        actions={
          <>
            <NavButton to="quote" variant="accent" size="lg"><Palette className="h-4 w-4" /> Request Branding Quote</NavButton>
            <NavButton to="portfolio" variant="outline" size="lg">View Portfolio</NavButton>
          </>
        }
      />

      {/* Services */}
      <section className="py-16 lg:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-10">
            <Eyebrow>Branding services</Eyebrow>
            <h2 className="mt-2 text-3xl font-extrabold text-navy sm:text-4xl">Pick a service, request a quote</h2>
            <p className="mt-3 max-w-2xl text-slate-600">{brandingCat?.description ?? 'Comprehensive brand visibility solutions for offices, vehicles, events and retail.'}</p>
          </div>

          {loading ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {[0, 1, 2].map((i) => <div key={i} className="h-56 animate-pulse rounded-2xl bg-slate-200" />)}
            </div>
          ) : services.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">Branding services will be listed here soon.</div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {services.map((s) => (
                <article key={s.id} className="group flex flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-xl">
                  <div className="flex items-start justify-between">
                    <div className="grid h-11 w-11 place-items-center rounded-xl bg-navy text-gold"><Palette className="h-5 w-5" /></div>
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

      {/* Showcase */}
      <section className="bg-white py-16 lg:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-10">
            <Eyebrow>Branding showcase</Eyebrow>
            <h2 className="mt-2 text-3xl font-extrabold text-navy sm:text-4xl">Visibility solutions for every surface</h2>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {SHOWCASE.map((item) => (
              <article key={item.title} className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all hover:-translate-y-1 hover:shadow-xl">
                <div className="relative h-56 overflow-hidden">
                  <img src={item.image} alt={item.title} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                  <div className="absolute inset-0 bg-gradient-to-t from-navy/80 via-navy/10 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
                    <h3 className="text-lg font-bold">{item.title}</h3>
                  </div>
                </div>
                <div className="p-5">
                  <p className="text-sm text-slate-500">{item.desc}</p>
                  <NavButton to="quote" variant="ghost" size="sm" className="mt-3 w-full">Request Quote <ArrowRight className="h-3.5 w-3.5" /></NavButton>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Materials & finishes */}
      <section className="py-16 lg:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-10">
            <Eyebrow>Materials & finishes</Eyebrow>
            <h2 className="mt-2 text-3xl font-extrabold text-navy sm:text-4xl">Built to last, designed to impress</h2>
            <p className="mt-3 max-w-2xl text-slate-600">We source premium substrates and apply professional finishes — from matte lamination to spot UV and cast vinyl wraps.</p>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {MATERIALS.map((m) => {
              const Icon = m.icon;
              return (
                <div key={m.name} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="grid h-11 w-11 place-items-center rounded-xl bg-navy text-gold"><Icon className="h-5 w-5" /></div>
                  <h3 className="mt-3 text-base font-bold text-navy">{m.name}</h3>
                  <p className="mt-1 text-sm text-slate-500">{m.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-gradient-to-br from-navy to-[#1f2937] py-16 text-white">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="text-3xl font-extrabold sm:text-4xl">Bring your brand into focus</h2>
          <p className="mt-3 text-white/80">Tell us about your brand and surfaces — we'll prepare a quote for a complete branding package.</p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <NavButton to="quote" variant="accent" size="lg">Request Branding Quote <ArrowRight className="h-4 w-4" /></NavButton>
            <NavButton to="contact" variant="outline" size="lg">Talk to a Designer</NavButton>
          </div>
        </div>
      </section>
    </>
  );
}

export default BrandingView;
