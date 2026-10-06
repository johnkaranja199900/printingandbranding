'use client';

import { useEffect, useState } from 'react';
import { useAppStore } from '@/stores/app-store';
import { apiClient } from '@/lib/api-client';
import { Button } from '@/components/shared/Button';
import { Eyebrow } from '@/components/shared/primitives';
import { cn } from '@/lib/utils';
import { ArrowRight, Check, Upload, X, Info, Sparkles } from 'lucide-react';

interface ServiceCategory { id: string; name: string; slug: string; description?: string; icon?: string; services: Service[] }
interface Service { id: string; name: string; slug: string; description?: string; pricingType: string; basePrice?: string | null; unitName?: string | null; estimatedDays?: number | null; requiresFile?: boolean; isFeatured?: boolean }
interface ServiceField { id: string; fieldKey: string; label: string; fieldType: string; isRequired: boolean; optionsJson?: string | null; placeholder?: string | null; helpText?: string | null }

export function QuoteView() {
  const { user, navigate, pushToast } = useAppStore();
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [fields, setFields] = useState<ServiceField[]>([]);
  const [values, setValues] = useState<Record<string, any>>({});
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('NORMAL');
  const [requestedDeadline, setRequestedDeadline] = useState('');
  const [estimatedBudget, setEstimatedBudget] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submittedRef, setSubmittedRef] = useState<string | null>(null);

  useEffect(() => {
    apiClient.get<ServiceCategory[]>('/public/services').then((d) => setCategories(d as any)).catch(() => {});
  }, []);

  const loadService = async (service: Service) => {
    setSelectedService(service);
    setValues({});
    const full = await apiClient.get<{ fields: ServiceField[] }>(`/public/services/${service.slug}`);
    setFields((full as any)?.fields ?? []);
    setSubject(service.name + ' — Quote Request');
  };

  const handleSubmit = async () => {
    if (!user) {
      pushToast({ message: 'Please sign in to submit a quote request.', type: 'warning' });
      navigate('login', { redirect: 'quote' });
      return;
    }
    if (user.role !== 'CUSTOMER') {
      pushToast({ message: 'Only customer accounts can submit quote requests. Please sign in as a customer.', type: 'warning' });
      return;
    }
    if (!selectedService) { pushToast({ message: 'Please select a service first.', type: 'warning' }); return; }
    if (!subject.trim() || !description.trim()) { pushToast({ message: 'Subject and description are required.', type: 'warning' }); return; }

    // Validate required fields
    for (const f of fields) {
      if (f.isRequired && !values[f.fieldKey]) {
        pushToast({ message: `Field "${f.label}" is required.`, type: 'warning' });
        return;
      }
    }

    setSubmitting(true);
    try {
      const fieldValues = fields.map((f) => {
        const v = values[f.fieldKey];
        const entry: any = { fieldId: f.id };
        if (f.fieldType === 'NUMBER' || f.fieldType === 'DECIMAL') entry.valueNumber = v ? Number(v) : null;
        else if (f.fieldType === 'DATE') entry.valueDate = v ? new Date(v) : null;
        else entry.valueText = v ? String(v) : null;
        return entry;
      });

      const res = await apiClient.post<{ requestNumber: string }>('/quote-requests', {
        serviceId: selectedService.id, subject, description, priority,
        requestedDeadline: requestedDeadline || null,
        estimatedBudget: estimatedBudget ? Number(estimatedBudget) : null,
        fieldValues,
      });
      setSubmittedRef((res as any).requestNumber);
      pushToast({ message: 'Quote request submitted! We will prepare a quotation shortly.', type: 'success' });
    } catch (e: any) {
      pushToast({ message: e.message ?? 'Failed to submit. Please try again.', type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  const fieldLabel = (s: Service) => {
    if (s.pricingType === 'FIXED' && s.basePrice) return `Fixed · KES ${Number(s.basePrice).toLocaleString()}`;
    if (s.pricingType === 'PER_UNIT' && s.basePrice) return `KES ${Number(s.basePrice).toLocaleString()} / ${s.unitName ?? 'unit'}`;
    if (s.pricingType === 'PER_PAGE' && s.basePrice) return `KES ${Number(s.basePrice).toLocaleString()} / page`;
    if (s.pricingType === 'CUSTOM_QUOTE') return 'Custom quote';
    return 'Custom quote';
  };

  if (submittedRef) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16">
        <div className="rounded-3xl border border-emerald-200 bg-white p-10 text-center shadow-xl">
          <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-full bg-emerald-100">
            <Check className="h-8 w-8 text-emerald-600" />
          </div>
          <h2 className="text-2xl font-extrabold text-navy">Request Submitted!</h2>
          <p className="mt-2 text-slate-600">Your reference number is</p>
          <p className="my-3 text-3xl font-extrabold text-gold">{submittedRef}</p>
          <p className="text-sm text-slate-500">Our team will review your request and prepare a quotation. You'll receive a notification when it's ready.</p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Button variant="primary" onClick={() => navigate('customer-quotations')}>View My Quotations</Button>
            <Button variant="ghost" onClick={() => { setSubmittedRef(null); setSelectedService(null); setFields([]); setValues({}); setSubject(''); setDescription(''); }}>Submit Another</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <section className="bg-gradient-to-br from-navy via-navy-soft to-navy text-white">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
          <Eyebrow>Request a Quote</Eyebrow>
          <h1 className="mt-2 max-w-3xl text-3xl font-extrabold leading-tight sm:text-4xl lg:text-5xl">Tell us what you need — we'll prepare a transparent quotation.</h1>
          <p className="mt-4 max-w-2xl text-white/80">Select a service, fill in the details, and upload any reference files. Our team reviews every request and responds with a detailed quotation.</p>
        </div>
      </section>

      <section className="py-12 lg:py-16">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 sm:px-6 lg:grid-cols-[1.2fr_0.8fr] lg:px-8">
          {/* Left: form */}
          <div className="space-y-6">
            {/* Service selection */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="mb-1 text-lg font-bold text-navy">1. Choose a Service</h2>
              <p className="mb-4 text-sm text-slate-500">Select the service that best matches your need.</p>
              <div className="grid gap-3 sm:grid-cols-2">
                {categories.map((cat) =>
                  cat.services.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => loadService(s)}
                      className={cn(
                        'rounded-xl border p-4 text-left transition-all',
                        selectedService?.id === s.id ? 'border-gold bg-gold/5 ring-2 ring-gold/20' : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50',
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-[0.7rem] font-bold uppercase tracking-wide text-gold">{cat.name}</p>
                          <p className="mt-1 text-sm font-bold text-navy">{s.name}</p>
                        </div>
                        {s.isFeatured && <Sparkles className="h-4 w-4 text-gold" />}
                      </div>
                      <p className="mt-2 line-clamp-2 text-xs text-slate-500">{s.description}</p>
                      <p className="mt-2 text-xs font-bold text-navy-soft">{fieldLabel(s)}</p>
                    </button>
                  ))
                )}
              </div>
            </div>

            {/* Dynamic fields */}
            {selectedService && (
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="mb-1 text-lg font-bold text-navy">2. Service Specifications</h2>
                <p className="mb-4 text-sm text-slate-500">Tell us the details for <strong>{selectedService.name}</strong>.</p>
                <div className="grid gap-4 sm:grid-cols-2">
                  {fields.map((f) => (
                    <div key={f.id} className={cn(f.fieldType === 'TEXTAREA' && 'sm:col-span-2')}>
                      <label className="mb-1.5 block text-sm font-bold text-navy">
                        {f.label}{f.isRequired && <span className="ml-1 text-rose-500">*</span>}
                      </label>
                      {renderField(f, values[f.fieldKey], (v) => setValues({ ...values, [f.fieldKey]: v }))}
                      {f.helpText && <p className="mt-1 text-xs text-slate-400">{f.helpText}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Project details */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="mb-1 text-lg font-bold text-navy">3. Project Details</h2>
              <p className="mb-4 text-sm text-slate-500">A brief to help us understand your requirement.</p>
              <div className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-sm font-bold text-navy">Subject <span className="text-rose-500">*</span></label>
                  <input value={subject} onChange={(e) => setSubject(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm focus:border-gold focus:bg-white focus:outline-none focus:ring-2 focus:ring-gold/20" placeholder="e.g. Book printing — 200 copies" />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-bold text-navy">Description <span className="text-rose-500">*</span></label>
                  <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm focus:border-gold focus:bg-white focus:outline-none focus:ring-2 focus:ring-gold/20" placeholder="Describe your project, audience, and any specific requirements..." />
                </div>
                <div className="grid gap-4 sm:grid-cols-3">
                  <div>
                    <label className="mb-1.5 block text-sm font-bold text-navy">Priority</label>
                    <select value={priority} onChange={(e) => setPriority(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm focus:border-gold focus:bg-white focus:outline-none focus:ring-2 focus:ring-gold/20">
                      <option value="NORMAL">Normal</option>
                      <option value="URGENT">Urgent</option>
                      <option value="VERY_URGENT">Very Urgent</option>
                      <option value="SCHEDULED">Scheduled</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-bold text-navy">Required by</label>
                    <input type="date" value={requestedDeadline} onChange={(e) => setRequestedDeadline(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm focus:border-gold focus:bg-white focus:outline-none focus:ring-2 focus:ring-gold/20" />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-bold text-navy">Budget (KES)</label>
                    <input type="number" value={estimatedBudget} onChange={(e) => setEstimatedBudget(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm focus:border-gold focus:bg-white focus:outline-none focus:ring-2 focus:ring-gold/20" placeholder="Optional" />
                  </div>
                </div>
                <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-center">
                  <Upload className="mx-auto mb-1 h-5 w-5 text-slate-400" />
                  <p className="text-sm font-semibold text-navy-soft">File upload</p>
                  <p className="text-xs text-slate-400">Manuscripts, artwork, or references can be attached after we confirm your request.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right: summary */}
          <div>
            <div className="sticky top-24 overflow-hidden rounded-2xl bg-gradient-to-br from-navy to-[#1f2937] text-white shadow-xl">
              <div className="p-6">
                <Eyebrow className="text-gold">Summary</Eyebrow>
                <h3 className="mt-2 text-xl font-bold">Your Quote Request</h3>
                {selectedService ? (
                  <div className="mt-4 space-y-3 text-sm">
                    <Row label="Service" value={selectedService.name} />
                    <Row label="Pricing" value={fieldLabel(selectedService)} />
                    {selectedService.estimatedDays && <Row label="Est. turnaround" value={`${selectedService.estimatedDays} day(s)`} />}
                    <Row label="Priority" value={priority} />
                    {requestedDeadline && <Row label="Deadline" value={requestedDeadline} />}
                    {estimatedBudget && <Row label="Budget" value={`KES ${Number(estimatedBudget).toLocaleString()}`} />}
                  </div>
                ) : (
                  <p className="mt-4 text-sm text-white/60">Select a service to begin. Your specifications and project brief will appear here.</p>
                )}
                <div className="mt-6 rounded-xl bg-white/5 p-3 text-xs text-white/70">
                  <Info className="mb-1 inline h-4 w-4 text-gold" /> Quotations are typically prepared within 24–48 hours. You'll receive an in-app notification when ready.
                </div>
                <Button variant="accent" size="lg" className="mt-4 w-full" onClick={handleSubmit} disabled={submitting || !selectedService}>
                  {submitting ? 'Submitting...' : 'Submit Request'} <ArrowRight className="h-4 w-4" />
                </Button>
                {!user && <p className="mt-2 text-center text-xs text-white/50">You'll be asked to sign in to submit.</p>}
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-white/60">{label}</span>
      <span className="text-right font-semibold text-white">{value}</span>
    </div>
  );
}

function renderField(f: ServiceField, value: any, onChange: (v: any) => void) {
  const baseClass = 'w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm focus:border-gold focus:bg-white focus:outline-none focus:ring-2 focus:ring-gold/20';
  const options: string[] = f.optionsJson ? JSON.parse(f.optionsJson) : [];

  switch (f.fieldType) {
    case 'TEXTAREA':
      return <textarea value={value ?? ''} onChange={(e) => onChange(e.target.value)} rows={3} className={baseClass} placeholder={f.placeholder ?? ''} />;
    case 'NUMBER':
    case 'DECIMAL':
      return <input type="number" value={value ?? ''} onChange={(e) => onChange(e.target.value)} className={baseClass} placeholder={f.placeholder ?? ''} />;
    case 'DATE':
      return <input type="date" value={value ?? ''} onChange={(e) => onChange(e.target.value)} className={baseClass} />;
    case 'SELECT':
      return (
        <select value={value ?? ''} onChange={(e) => onChange(e.target.value)} className={baseClass}>
          <option value="">— Select —</option>
          {options.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      );
    case 'RADIO':
      return (
        <div className="flex flex-wrap gap-3">
          {options.map((o) => (
            <label key={o} className={cn('flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-1.5 text-sm font-semibold', value === o ? 'border-gold bg-gold/5 text-navy' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50')}>
              <input type="radio" name={f.id} checked={value === o} onChange={() => onChange(o)} className="accent-gold" />
              {o}
            </label>
          ))}
        </div>
      );
    case 'CHECKBOX':
      return (
        <div className="flex flex-wrap gap-3">
          {options.map((o) => {
            const arr: string[] = Array.isArray(value) ? value : [];
            const checked = arr.includes(o);
            return (
              <label key={o} className={cn('flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-1.5 text-sm font-semibold', checked ? 'border-gold bg-gold/5 text-navy' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50')}>
                <input type="checkbox" checked={checked} onChange={() => onChange(checked ? arr.filter((x) => x !== o) : [...arr, o])} className="accent-gold" />
                {o}
              </label>
            );
          })}
        </div>
      );
    default:
      return <input type="text" value={value ?? ''} onChange={(e) => onChange(e.target.value)} className={baseClass} placeholder={f.placeholder ?? ''} />;
  }
}
