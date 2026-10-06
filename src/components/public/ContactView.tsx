'use client';

import { useEffect, useState } from 'react';
import { useAppStore } from '@/stores/app-store';
import { apiClient } from '@/lib/api-client';
import { Button, NavButton } from '@/components/shared/Button';
import { Eyebrow, PageHero } from '@/components/shared/primitives';
import { ArrowRight, Check, MapPin, Phone, Mail, Clock, MessageSquare, Send } from 'lucide-react';

interface Settings {
  company_name?: string;
  company_phone?: string;
  company_email?: string;
  company_address?: string;
  currency?: string;
}

export function ContactView() {
  const { pushToast } = useAppStore();
  const [settings, setSettings] = useState<Settings>({});
  const [form, setForm] = useState({ name: '', email: '', phone: '', subject: '', message: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    apiClient.get<Settings>('/public/settings').then((d) => setSettings(d as any)).catch(() => {});
  }, []);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = 'Name is required.';
    if (!form.email.trim()) e.email = 'Email is required.';
    else if (!/^\S+@\S+\.\S+$/.test(form.email)) e.email = 'Enter a valid email address.';
    if (!form.subject.trim()) e.subject = 'Subject is required.';
    if (!form.message.trim()) e.message = 'Message is required.';
    else if (form.message.trim().length < 10) e.message = 'Message must be at least 10 characters.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) {
      pushToast({ message: 'Please fix the highlighted fields.', type: 'warning' });
      return;
    }
    setSubmitting(true);
    try {
      await apiClient.post('/public/contact', form);
      pushToast({ message: 'Message sent! We will get back to you shortly.', type: 'success', title: 'Thank you' });
      setSubmitted(true);
      setForm({ name: '', email: '', phone: '', subject: '', message: '' });
      setErrors({});
    } catch (e: any) {
      const msg = e?.errors ? Object.values(e.errors)[0] as string : (e.message ?? 'Failed to send message.');
      pushToast({ message: msg, type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  const companyName = settings.company_name || 'Print & Publish Co.';
  const phone = settings.company_phone || '+254 700 000 000';
  const email = settings.company_email || 'hello@printpublish.co.ke';
  const address = settings.company_address || 'Westlands, Nairobi, Kenya';

  return (
    <>
      <PageHero
        eyebrow="Contact Us"
        title="Let's talk about your project"
        description="Questions about publishing, printing, branding or cyber services? Reach out and our team will respond within one business day."
        breadcrumbs="Home / Contact"
        actions={<NavButton to="quote" variant="accent" size="lg">Request a Quote <ArrowRight className="h-4 w-4" /></NavButton>}
      />

      <section className="py-12 lg:py-16">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 sm:px-6 lg:grid-cols-[1.2fr_0.8fr] lg:px-8">
          {/* Form */}
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <Eyebrow>Get in touch</Eyebrow>
            <h2 className="mt-2 text-2xl font-bold text-navy sm:text-3xl">Send us a message</h2>
            <p className="mt-2 text-sm text-slate-500">Fill in the form and we'll get back to you within one business day.</p>

            {submitted ? (
              <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-center">
                <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-emerald-100">
                  <Check className="h-6 w-6 text-emerald-600" />
                </div>
                <h3 className="text-lg font-bold text-navy">Message sent!</h3>
                <p className="mt-1 text-sm text-slate-600">Thank you for reaching out. Our team will respond shortly.</p>
                <Button variant="ghost" size="md" className="mt-4" onClick={() => setSubmitted(false)}>Send another message</Button>
              </div>
            ) : (
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <Field
                  label="Full Name"
                  required
                  value={form.name}
                  onChange={(v) => setForm({ ...form, name: v })}
                  error={errors.name}
                  placeholder="Your full name"
                />
                <Field
                  label="Email"
                  required
                  type="email"
                  value={form.email}
                  onChange={(v) => setForm({ ...form, email: v })}
                  error={errors.email}
                  placeholder="you@example.com"
                />
                <Field
                  label="Phone"
                  value={form.phone}
                  onChange={(v) => setForm({ ...form, phone: v })}
                  error={errors.phone}
                  placeholder="+254 712 345 678"
                />
                <Field
                  label="Subject"
                  required
                  value={form.subject}
                  onChange={(v) => setForm({ ...form, subject: v })}
                  error={errors.subject}
                  placeholder="Quotation request"
                />
                <div className="sm:col-span-2">
                  <label className="mb-1.5 block text-sm font-bold text-navy">
                    Message <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    rows={5}
                    value={form.message}
                    onChange={(e) => setForm({ ...form, message: e.target.value })}
                    placeholder="Tell us about your project, timelines and any specific requirements..."
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm focus:border-gold focus:bg-white focus:outline-none focus:ring-2 focus:ring-gold/20"
                  />
                  {errors.message && <p className="mt-1 text-xs text-rose-600">{errors.message}</p>}
                </div>
                <div className="sm:col-span-2">
                  <Button variant="primary" size="lg" className="w-full sm:w-auto" onClick={handleSubmit} disabled={submitting}>
                    {submitting ? 'Sending...' : <>Send Message <Send className="h-4 w-4" /></>}
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Contact info card */}
          <aside>
            <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-navy to-navy-soft text-white shadow-xl">
              <div className="p-6 sm:p-8">
                <Eyebrow className="text-gold">Company details</Eyebrow>
                <h3 className="mt-2 text-xl font-bold">{companyName}</h3>
                <p className="mt-1 text-sm text-white/70">Publishing · Printing · Branding · Cyber Services</p>

                <ul className="mt-6 space-y-4">
                  <ContactRow icon={<MapPin className="h-5 w-5" />} label="Address" value={address} />
                  <ContactRow icon={<Phone className="h-5 w-5" />} label="Phone" value={phone} href={`tel:${phone}`} />
                  <ContactRow icon={<Mail className="h-5 w-5" />} label="Email" value={email} href={`mailto:${email}`} />
                  <ContactRow icon={<MessageSquare className="h-5 w-5" />} label="WhatsApp" value={phone} href={`https://wa.me/${(phone ?? '').replace(/[^0-9]/g, '')}`} />
                  <ContactRow icon={<Clock className="h-5 w-5" />} label="Opening Hours" value="Mon - Sat · 8:00 AM - 6:00 PM" />
                </ul>

                <div className="mt-6 rounded-xl bg-white/5 p-4 text-xs text-white/70">
                  Walk-ins welcome during business hours. For urgent requests or large orders, we recommend booking an appointment in advance.
                </div>
              </div>
              <div className="grid grid-cols-3 divide-x divide-white/10 border-t border-white/10 bg-black/20 text-center text-xs">
                <div className="px-3 py-4">
                  <p className="font-extrabold text-gold">12+</p>
                  <p className="text-white/70">Years in business</p>
                </div>
                <div className="px-3 py-4">
                  <p className="font-extrabold text-gold">8,000+</p>
                  <p className="text-white/70">Projects delivered</p>
                </div>
                <div className="px-3 py-4">
                  <p className="font-extrabold text-gold">96%</p>
                  <p className="text-white/70">Satisfaction rate</p>
                </div>
              </div>
            </div>

            {/* Map placeholder */}
            <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
              <div className="relative h-44 bg-gradient-to-br from-slate-200 to-slate-300">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <MapPin className="mx-auto h-8 w-8 text-navy" />
                    <p className="mt-1 text-sm font-bold text-navy">Westlands, Nairobi</p>
                    <p className="text-xs text-slate-500">Map location placeholder</p>
                  </div>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </section>
    </>
  );
}

function Field({ label, value, onChange, error, placeholder, type = 'text', required }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  placeholder?: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-bold text-navy">
        {label} {required && <span className="text-rose-500">*</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm focus:border-gold focus:bg-white focus:outline-none focus:ring-2 focus:ring-gold/20"
      />
      {error && <p className="mt-1 text-xs text-rose-600">{error}</p>}
    </div>
  );
}

function ContactRow({ icon, label, value, href }: { icon: React.ReactNode; label: string; value: string; href?: string }) {
  const content = (
    <>
      <div className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-lg bg-white/10 text-gold">{icon}</div>
      <div className="min-w-0">
        <p className="text-xs text-white/60">{label}</p>
        <p className="truncate text-sm font-bold text-white">{value}</p>
      </div>
    </>
  );
  return (
    <li>
      {href ? (
        <a href={href} target="_blank" rel="noreferrer" className="flex items-center gap-3 rounded-lg hover:bg-white/5">
          {content}
        </a>
      ) : (
        <div className="flex items-center gap-3">{content}</div>
      )}
    </li>
  );
}

export default ContactView;
