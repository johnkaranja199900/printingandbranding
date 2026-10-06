'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { NavButton } from '@/components/shared/Button';
import { Eyebrow, PageHero } from '@/components/shared/primitives';
import { ArrowRight, Monitor, Sparkles, Keyboard, ScanLine, Copy, FileText, Globe, Camera, FileCheck, FilePlus2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ServiceCategory { id: string; name: string; slug: string; description?: string; services: Service[] }
interface Service { id: string; name: string; slug: string; description?: string; pricingType: string; basePrice?: string | null; unitName?: string | null; estimatedDays?: number | null; isFeatured?: boolean }

function priceLabel(s: Service) {
  if (s.pricingType === 'FIXED' && s.basePrice) return `KES ${Number(s.basePrice).toLocaleString()}`;
  if (s.pricingType === 'PER_UNIT' && s.basePrice) return `KES ${Number(s.basePrice).toLocaleString()} / ${s.unitName ?? 'unit'}`;
  if (s.pricingType === 'PER_PAGE' && s.basePrice) return `KES ${Number(s.basePrice).toLocaleString()} / page`;
  return 'Custom quote';
}

const SERVICE_LIST = [
  { icon: Keyboard, name: 'Typing', desc: 'Fast and accurate typing for reports, proposals, manuscripts and assignments.' },
  { icon: ScanLine, name: 'Scanning', desc: 'High-quality document and certificate scanning to PDF or image.' },
  { icon: Copy, name: 'Photocopying', desc: 'Clear and efficient photocopies for personal, office and academic needs.' },
  { icon: Globe, name: 'Online Applications', desc: 'KRA returns, eCitizen, job applications, visa forms and digital submissions.' },
  { icon: Camera, name: 'Passport Photos', desc: 'Passport, ID and visa photos printed to required specifications.' },
  { icon: FileCheck, name: 'Document Formatting', desc: 'Reports, CVs and proposals formatted to professional standards.' },
  { icon: FileText, name: 'PDF Services', desc: 'Convert, merge, compress and edit PDF documents.' },
  { icon: FilePlus2, name: 'CV & Cover Letters', desc: 'Professionally written CVs and cover letters that land interviews.' },
];

const PRICING = [
  { service: 'Typing', unit: 'per page', price: 'KES 250+', icon: Keyboard },
  { service: 'Scanning', unit: 'per page', price: 'KES 200+', icon: ScanLine },
  { service: 'Photocopying (B&W)', unit: 'per page', price: 'KES 5', icon: Copy },
  { service: 'Photocopying (Color)', unit: 'per page', price: 'KES 20', icon: Copy },
  { service: 'Document Formatting', unit: 'per page', price: 'KES 350+', icon: FileCheck },
  { service: 'Online Applications', unit: 'per session', price: 'KES 500+', icon: Globe },
  { service: 'Passport Photos', unit: 'per set', price: 'KES 250+', icon: Camera },
  { service: 'CV Services', unit: 'per CV', price: 'KES 1,500+', icon: FileText },
];

export function CyberView() {
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient.get<ServiceCategory[]>('/public/services').then((d) => setCategories(d as any)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const cyberCat = categories.find((c) => c.slug === 'cyber');
  const services = cyberCat?.services ?? [];

  return (
    <>
      <PageHero
        eyebrow="Cyber Services"
        title="Quick digital services, done right"
        description="Typing, scanning, photocopying, online applications, passport photos and document formatting — fast, reliable and professionally handled."
        breadcrumbs="Home / Cyber Services"
        actions={
          <>
            <NavButton to="quote" variant="accent" size="lg"><Monitor className="h-4 w-4" /> Request Service</NavButton>
            <NavButton to="contact" variant="outline" size="lg">Visit Our Shop</NavButton>
          </>
        }
      />

      {/* Services */}
      <section className="py-16 lg:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-10">
            <Eyebrow>Cyber services</Eyebrow>
            <h2 className="mt-2 text-3xl font-extrabold text-navy sm:text-4xl">Digital support for work and study</h2>
            <p className="mt-3 max-w-2xl text-slate-600">{cyberCat?.description ?? 'Walk-in and remote cyber services for individuals, students and businesses.'}</p>
          </div>

          {loading ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {[0, 1, 2].map((i) => <div key={i} className="h-56 animate-pulse rounded-2xl bg-slate-200" />)}
            </div>
          ) : services.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">Cyber services will be listed here soon.</div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {services.map((s) => (
                <article key={s.id} className="group flex flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-xl">
                  <div className="flex items-start justify-between">
                    <div className="grid h-11 w-11 place-items-center rounded-xl bg-navy text-gold"><Monitor className="h-5 w-5" /></div>
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
                  <NavButton to="quote" variant="ghost" size="sm" className="mt-4 w-full">Request Service <ArrowRight className="h-3.5 w-3.5" /></NavButton>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Service list */}
      <section className="bg-white py-16 lg:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-10">
            <Eyebrow>What we offer</Eyebrow>
            <h2 className="mt-2 text-3xl font-extrabold text-navy sm:text-4xl">A complete cyber cafe offering</h2>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {SERVICE_LIST.map((s) => {
              const Icon = s.icon;
              return (
                <div key={s.name} className="rounded-2xl border border-slate-200 bg-slate-50 p-5 transition-colors hover:border-gold hover:bg-white">
                  <div className="grid h-11 w-11 place-items-center rounded-xl bg-navy text-gold"><Icon className="h-5 w-5" /></div>
                  <h3 className="mt-3 text-base font-bold text-navy">{s.name}</h3>
                  <p className="mt-1 text-sm text-slate-500">{s.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Pricing table */}
      <section className="py-16 lg:py-20">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="mb-10 text-center">
            <Eyebrow className="mb-2">Transparent pricing</Eyebrow>
            <h2 className="text-3xl font-extrabold text-navy sm:text-4xl">Per-page & per-service rates</h2>
            <p className="mx-auto mt-3 max-w-2xl text-slate-600">Transparent rates for everyday cyber services. Bulk and ongoing work attracts discounted rates.</p>
          </div>
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full text-left text-sm">
              <thead className="bg-navy text-white">
                <tr>
                  <th className="px-5 py-3 font-bold">Service</th>
                  <th className="hidden px-5 py-3 font-bold sm:table-cell">Unit</th>
                  <th className="px-5 py-3 text-right font-bold">Price</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {PRICING.map((row, i) => {
                  const Icon = row.icon;
                  return (
                    <tr key={row.service} className={cn('transition-colors hover:bg-slate-50', i % 2 === 0 ? 'bg-white' : 'bg-slate-50/40')}>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <span className="grid h-8 w-8 place-items-center rounded-lg bg-slate-100 text-navy"><Icon className="h-4 w-4" /></span>
                          <span className="font-bold text-navy">{row.service}</span>
                        </div>
                      </td>
                      <td className="hidden px-5 py-3 text-slate-500 sm:table-cell">{row.unit}</td>
                      <td className="px-5 py-3 text-right font-bold text-gold">{row.price}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="mt-4 text-center text-xs text-slate-400">Prices are starting rates and may vary based on volume, complexity and turnaround. Request a quote for exact pricing.</p>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-gradient-to-br from-navy to-[#1f2937] py-16 text-white">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="text-3xl font-extrabold sm:text-4xl">Need help with a digital task?</h2>
          <p className="mt-3 text-white/80">Walk in or request a service online — our team is ready to assist with typing, scanning, applications and more.</p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <NavButton to="quote" variant="accent" size="lg">Request Service <ArrowRight className="h-4 w-4" /></NavButton>
            <NavButton to="contact" variant="outline" size="lg">Visit Our Shop</NavButton>
          </div>
        </div>
      </section>
    </>
  );
}

export default CyberView;
