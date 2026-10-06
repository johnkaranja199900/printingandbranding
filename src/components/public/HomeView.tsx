'use client';

import { useAppStore } from '@/stores/app-store';
import { Button, NavButton } from '@/components/shared/Button';
import { Eyebrow } from '@/components/shared/primitives';
import { apiClient } from '@/lib/api-client';
import { useEffect, useState } from 'react';
import { ArrowRight, BookOpen, Printer, Palette, Monitor, Check, Sparkles, MapPin, Phone, Mail } from 'lucide-react';

interface Portfolio { id: string; title: string; category: string; imageUrl?: string | null; clientName?: string | null; isFeatured: boolean }

export function HomeView() {
  const { navigate } = useAppStore();
  const [portfolio, setPortfolio] = useState<Portfolio[]>([]);

  useEffect(() => {
    apiClient.get<{ data: Portfolio[] }>('/public/portfolio?featured=true').then((d: any) => setPortfolio(d?.data ?? d ?? [])).catch(() => {});
  }, []);

  const services = [
    { icon: BookOpen, name: 'Book Publishing', desc: 'Editing, layout, ISBN, cover design and first print run.', items: ['Manuscript preparation', 'Editing and formatting', 'Book cover design', 'ISBN assistance', 'Book reprints'], view: 'publishing' as const, image: 'https://images.unsplash.com/photo-1516979187457-637abb4f9353?auto=format&fit=crop&w=900&q=80' },
    { icon: Printer, name: 'Book Printing', desc: 'Interior + cover printing for novels, school books, manuals.', items: ['Novels and stories', 'School books', 'Training manuals', 'Notebooks and journals', 'Church and academic books'], view: 'printing' as const, image: 'https://images.unsplash.com/photo-1455390582262-044cdead277a?auto=format&fit=crop&w=900&q=80' },
    { icon: Printer, name: 'Digital Printing', desc: 'Business documents, certificates, forms, and marketing material.', items: ['Business documents', 'Certificates and reports', 'Forms and invoices', 'Letterheads and receipts', 'Flyers and posters'], view: 'printing' as const, image: 'https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=900&q=80' },
    { icon: Palette, name: 'Branding', desc: 'Signage, vehicle branding, banners, and stationery.', items: ['Roll-up banners', 'Vehicle branding', 'Window and wall branding', 'Business cards', 'Branded stationery'], view: 'branding' as const, image: 'https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&w=900&q=80' },
    { icon: Monitor, name: 'Cyber Services', desc: 'Typing, scanning, photocopy, and online applications.', items: ['Typing and scanning', 'Photocopying and printing', 'CV and document formatting', 'Online applications', 'Passport photo services'], view: 'cyber' as const, image: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=900&q=80' },
  ];

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-50 via-white to-slate-100">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
          <div className="grid items-center gap-10 lg:grid-cols-[1.2fr_0.8fr]">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-4 py-2 text-sm font-bold text-navy-soft backdrop-blur">
                <Sparkles className="h-4 w-4 text-gold" /> Professional Publishing & Creative Production
              </div>
              <h1 className="mt-6 text-4xl font-extrabold leading-tight tracking-tight text-navy sm:text-5xl lg:text-6xl">
                Publishing, Printing & Branding <span className="text-gold">Solutions Under One Roof</span>
              </h1>
              <p className="mt-5 max-w-xl text-lg text-slate-600">
                From manuscripts and book production to business printing, branding, large-format materials and digital support — we help businesses, authors and institutions deliver their ideas with clarity, quality and impact.
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <NavButton to="quote" variant="primary" size="lg">Request a Quote <ArrowRight className="h-4 w-4" /></NavButton>
                <NavButton to="publishing" variant="accent" size="lg">Publish Your Book</NavButton>
                <NavButton to="printing" variant="light" size="lg">Order Printing</NavButton>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white/70 p-6 shadow-2xl backdrop-blur">
              <Eyebrow className="mb-3">Why clients choose us</Eyebrow>
              <h3 className="text-lg font-bold text-navy">Reliable quality, modern production and expert support.</h3>
              <div className="mt-5 grid grid-cols-2 gap-3">
                {[
                  { v: '1,200+', l: 'Books published' },
                  { v: '8,000+', l: 'Print jobs delivered' },
                  { v: '96%', l: 'Customer satisfaction' },
                  { v: '24/7', l: 'Support for urgent orders' },
                ].map((m) => (
                  <div key={m.l} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="text-2xl font-extrabold text-navy">{m.v}</div>
                    <div className="text-xs text-slate-500">{m.l}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Partners strip */}
      <section className="bg-navy py-6">
        <div className="mx-auto grid max-w-7xl grid-cols-3 gap-4 px-4 text-center text-sm font-bold text-white/70 sm:grid-cols-6 sm:px-6 lg:px-8">
          {['Schools', 'Churches', 'NGOs', 'Corporate', 'Authors', 'Publishers'].map((p) => <div key={p}>{p}</div>)}
        </div>
      </section>

      {/* Services */}
      <section className="py-16 lg:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-10">
            <Eyebrow>Our services</Eyebrow>
            <h2 className="mt-2 text-3xl font-extrabold text-navy sm:text-4xl">Creative production solutions for every next step</h2>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {services.map((s) => {
              const Icon = s.icon;
              return (
                <article key={s.name} className="group overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition-all hover:-translate-y-1 hover:shadow-xl">
                  <div className="relative h-44 overflow-hidden">
                    <img src={s.image} alt={s.name} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                    <div className="absolute inset-0 bg-gradient-to-t from-navy/60 to-transparent" />
                    <div className="absolute bottom-3 left-3 grid h-10 w-10 place-items-center rounded-xl bg-gold text-navy"><Icon className="h-5 w-5" /></div>
                  </div>
                  <div className="p-5">
                    <h3 className="text-lg font-bold text-navy">{s.name}</h3>
                    <p className="mt-1 text-sm text-slate-500">{s.desc}</p>
                    <ul className="mt-3 space-y-1.5">
                      {s.items.slice(0, 4).map((it) => (
                        <li key={it} className="flex items-start gap-2 text-sm text-slate-600">
                          <Check className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-emerald-500" />{it}
                        </li>
                      ))}
                    </ul>
                    <button onClick={() => navigate(s.view)} className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-navy hover:text-gold">
                      Explore <ArrowRight className="h-4 w-4" />
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* About */}
      <section className="bg-white py-16 lg:py-24">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-2 lg:px-8">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-navy to-navy-soft p-8 lg:p-10">
            <Eyebrow className="text-gold">Our process</Eyebrow>
            <h3 className="mt-2 text-2xl font-bold text-white">From concept to final print with expert support.</h3>
            <ul className="mt-6 space-y-3">
              {['Professional guidance for print-ready projects and manuscripts', 'Creative design aligned to your company, audience and brand', 'Quality production with reliable turnaround times', 'Support for schools, NGOs, churches, businesses and authors'].map((it) => (
                <li key={it} className="flex items-start gap-3 text-white/85">
                  <Check className="mt-1 h-5 w-5 flex-shrink-0 text-emerald-400" />{it}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <Eyebrow>About us</Eyebrow>
            <h2 className="mt-2 text-3xl font-extrabold text-navy sm:text-4xl">Trusted by businesses, authors and growing organizations.</h2>
            <p className="mt-4 text-slate-600">We combine publishing expertise, modern printing technology, branding insight and document services to support organizations throughout their communication journey.</p>
            <p className="mt-3 text-slate-600">Whether you need a professional book launch, branded signage, promotional materials, school printing, document digitization or a creative production project, our team helps translate your ideas into polished results.</p>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {['Publishing support for manuscripts', 'High-quality printed materials', 'Branding and signage solutions', 'Cyber and digital services'].map((it) => (
                <div key={it} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm font-semibold text-navy-soft">
                  <Check className="h-4 w-4 text-emerald-500" />{it}
                </div>
              ))}
            </div>
            <NavButton to="quote" variant="primary" size="lg" className="mt-6">Request a Quote <ArrowRight className="h-4 w-4" /></NavButton>
          </div>
        </div>
      </section>

      {/* Portfolio */}
      {portfolio.length > 0 && (
        <section className="bg-slate-50 py-16 lg:py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mb-10 flex items-end justify-between">
              <div>
                <Eyebrow>Recent work</Eyebrow>
                <h2 className="mt-2 text-3xl font-extrabold text-navy sm:text-4xl">Portfolio highlights</h2>
              </div>
              <NavButton to="portfolio" variant="ghost" size="md">View all <ArrowRight className="h-4 w-4" /></NavButton>
            </div>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {portfolio.slice(0, 3).map((p) => (
                <article key={p.id} className="group relative overflow-hidden rounded-3xl">
                  <img src={p.imageUrl ?? ''} alt={p.title} className="h-72 w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                  <div className="absolute inset-0 bg-gradient-to-t from-navy/90 via-navy/20 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-5 text-white">
                    <p className="text-xs font-bold uppercase tracking-wide text-gold">{p.category}</p>
                    <h3 className="mt-1 text-lg font-bold">{p.title}</h3>
                    {p.clientName && <p className="text-sm text-white/70">{p.clientName}</p>}
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Process */}
      <section className="bg-white py-16 lg:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-10">
            <Eyebrow>How we work</Eyebrow>
            <h2 className="mt-2 text-3xl font-extrabold text-navy sm:text-4xl">Simple, efficient and professionally managed.</h2>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { n: '1', t: 'Share your brief', d: 'Tell us what you need — manuscript, branding package, printing order or business document.' },
              { n: '2', t: 'Receive a quote', d: 'We prepare a transparent quotation and confirm requirements before production begins.' },
              { n: '3', t: 'Production', d: 'Our design, publishing and print teams deliver work with clear communication and timely updates.' },
              { n: '4', t: 'Delivery', d: 'Final materials are completed, packaged and ready for collection or delivery.' },
            ].map((s) => (
              <div key={s.n} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-navy text-sm font-extrabold text-white">{s.n}</div>
                <h3 className="mt-3 text-lg font-bold text-navy">{s.t}</h3>
                <p className="mt-1 text-sm text-slate-500">{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-gradient-to-br from-navy to-[#1f2937] py-16 text-white">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="text-3xl font-extrabold sm:text-4xl">Ready to start your project?</h2>
          <p className="mt-3 text-white/80">Get a free, no-obligation quotation today. Our team is ready to bring your ideas to life.</p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <NavButton to="quote" variant="accent" size="lg">Request a Quote <ArrowRight className="h-4 w-4" /></NavButton>
            <NavButton to="contact" variant="outline" size="lg">Contact Us</NavButton>
          </div>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-6 text-sm text-white/70">
            <span className="flex items-center gap-2"><MapPin className="h-4 w-4 text-gold" /> Nairobi, Kenya</span>
            <span className="flex items-center gap-2"><Phone className="h-4 w-4 text-gold" /> +254 700 000 000</span>
            <span className="flex items-center gap-2"><Mail className="h-4 w-4 text-gold" /> hello@printpublish.co.ke</span>
          </div>
        </div>
      </section>
    </>
  );
}
