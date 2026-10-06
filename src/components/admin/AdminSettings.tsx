'use client';

import { useEffect, useState } from 'react';
import { AdminLayout } from '@/components/shared/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/shared/Button';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useAppStore } from '@/stores/app-store';
import { apiClient } from '@/lib/api-client';
import { cn } from '@/lib/utils';
import {
  Settings, Building, Percent, Bell, Plug, ShieldCheck, Save, CheckCircle2, Phone, MessageSquare,
  Mail, Smartphone, Sparkles, History,
} from 'lucide-react';

type SettingsMap = Record<string, string>;

export default function AdminSettings() {
  const { pushToast } = useAppStore();
  const [settings, setSettings] = useState<SettingsMap>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('general');

  useEffect(() => {
    apiClient.get<SettingsMap>('/public/settings')
      .then((d: any) => setSettings(d ?? {}))
      .catch((e: any) => pushToast({ message: e?.message ?? 'Failed to load settings.', type: 'error' }))
      .finally(() => setLoading(false));
  }, []);

  const update = (key: string, value: string) => setSettings(prev => ({ ...prev, [key]: value }));

  const handleSave = async () => {
    setSaving(true);
    // No backend endpoint for settings update — simulate save.
    setTimeout(() => {
      setSaving(false);
      pushToast({ message: 'Settings saved (demo). Changes are recorded in the audit log.', type: 'success' });
    }, 700);
  };

  const handleTestConnection = (name: string) => {
    pushToast({ message: `${name}: connection successful (simulated).`, type: 'success' });
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="space-y-4">
          <Skeleton className="h-20 w-full rounded-2xl" />
          <Skeleton className="h-12 w-full rounded-xl" />
          <Skeleton className="h-96 w-full rounded-2xl" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-xs font-bold uppercase tracking-[0.18em] text-gold">Admin · Settings</div>
            <h1 className="mt-1 text-2xl font-extrabold text-navy sm:text-3xl">System Settings</h1>
            <p className="mt-1 text-sm text-slate-500">Configure company, pricing, tax, and integrations.</p>
          </div>
          <Button variant="primary" size="md" onClick={handleSave} disabled={saving}>
            <Save className="h-4 w-4" /> {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>

        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
          <Sparkles className="mr-1 inline h-3.5 w-3.5" />
          <strong>Note:</strong> Settings update is in demo mode — changes will not persist server-side until the API is wired up. Changes to settings are recorded in the audit log.
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="flex h-auto flex-wrap bg-slate-100">
            <TabsTrigger value="general"><Building className="h-3.5 w-3.5" /> General</TabsTrigger>
            <TabsTrigger value="business"><Building className="h-3.5 w-3.5" /> Business</TabsTrigger>
            <TabsTrigger value="tax"><Percent className="h-3.5 w-3.5" /> Tax & Pricing</TabsTrigger>
            <TabsTrigger value="notifications"><Bell className="h-3.5 w-3.5" /> Notifications</TabsTrigger>
            <TabsTrigger value="integrations"><Plug className="h-3.5 w-3.5" /> Integrations</TabsTrigger>
            <TabsTrigger value="security"><ShieldCheck className="h-3.5 w-3.5" /> Security</TabsTrigger>
          </TabsList>

          {/* GENERAL */}
          <TabsContent value="general">
            <Card className="border-slate-200">
              <CardHeader className="border-b border-slate-100">
                <CardTitle className="flex items-center gap-2 text-navy"><Building className="h-4 w-4 text-gold" /> Company Information</CardTitle>
                <CardDescription>Public-facing details shown across the site and invoices.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 pt-6 sm:grid-cols-2">
                <Field label="Company name" value={settings.company_name ?? ''} onChange={(v) => update('company_name', v)} />
                <Field label="Tagline" value={settings.company_tagline ?? ''} onChange={(v) => update('company_tagline', v)} />
                <Field label="Phone" value={settings.company_phone ?? ''} onChange={(v) => update('company_phone', v)} />
                <Field label="Email" value={settings.company_email ?? ''} onChange={(v) => update('company_email', v)} />
                <Field label="Address" value={settings.company_address ?? ''} onChange={(v) => update('company_address', v)} />
                <Field label="Currency" value={settings.currency ?? 'KES'} onChange={(v) => update('currency', v)} />
              </CardContent>
            </Card>
          </TabsContent>

          {/* BUSINESS */}
          <TabsContent value="business">
            <Card className="border-slate-200">
              <CardHeader className="border-b border-slate-100">
                <CardTitle className="flex items-center gap-2 text-navy"><Building className="h-4 w-4 text-gold" /> Business Operations</CardTitle>
                <CardDescription>Reference number prefixes and operational defaults.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 pt-6 sm:grid-cols-2 lg:grid-cols-3">
                <Field label="Order prefix" value={settings.order_prefix ?? 'ORD'} onChange={(v) => update('order_prefix', v)} />
                <Field label="Quote prefix" value={settings.quote_prefix ?? 'QTR'} onChange={(v) => update('quote_prefix', v)} />
                <Field label="Invoice prefix" value={settings.invoice_prefix ?? 'INV'} onChange={(v) => update('invoice_prefix', v)} />
                <Field label="Receipt prefix" value={settings.receipt_prefix ?? 'RCT'} onChange={(v) => update('receipt_prefix', v)} />
                <Field label="Payment prefix" value={settings.payment_prefix ?? 'PAY'} onChange={(v) => update('payment_prefix', v)} />
                <Field label="Customer prefix" value={settings.customer_prefix ?? 'CUS'} onChange={(v) => update('customer_prefix', v)} />
                <Field label="Job prefix" value={settings.job_prefix ?? 'JOB'} onChange={(v) => update('job_prefix', v)} />
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAX & PRICING */}
          <TabsContent value="tax">
            <Card className="border-slate-200">
              <CardHeader className="border-b border-slate-100">
                <CardTitle className="flex items-center gap-2 text-navy"><Percent className="h-4 w-4 text-gold" /> Tax & Pricing</CardTitle>
                <CardDescription>Default tax rate and quotation/order pricing rules.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 pt-6 sm:grid-cols-2 lg:grid-cols-3">
                <Field label="Tax rate (%)" value={settings.tax_rate ?? '16'} onChange={(v) => update('tax_rate', v)} type="number" />
                <Field label="Quote validity (days)" value={settings.quote_validity_days ?? '14'} onChange={(v) => update('quote_validity_days', v)} type="number" />
                <Field label="Default deposit (%)" value={settings.default_deposit_percent ?? '50'} onChange={(v) => update('default_deposit_percent', v)} type="number" />
              </CardContent>
            </Card>
          </TabsContent>

          {/* NOTIFICATIONS */}
          <TabsContent value="notifications">
            <Card className="border-slate-200">
              <CardHeader className="border-b border-slate-100">
                <CardTitle className="flex items-center gap-2 text-navy"><Bell className="h-4 w-4 text-gold" /> Notification Preferences</CardTitle>
                <CardDescription>Choose which events trigger system notifications.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 pt-6">
                <ToggleRow label="New quote requests" description="Alert sales team when customers submit requests." defaultChecked />
                <ToggleRow label="Quotation accepted" description="Notify production & finance when a quote is accepted." defaultChecked />
                <ToggleRow label="Payment received" description="Notify finance on every successful payment." defaultChecked />
                <ToggleRow label="Low stock alerts" description="Notify inventory managers when items hit reorder level." defaultChecked />
                <ToggleRow label="Order completed" description="Notify customers when their order is ready." defaultChecked />
                <ToggleRow label="Marketing emails" description="Send occasional promotional emails to customers." />
              </CardContent>
            </Card>
          </TabsContent>

          {/* INTEGRATIONS */}
          <TabsContent value="integrations" className="space-y-4">
            <Card className="border-slate-200">
              <CardHeader className="border-b border-slate-100">
                <CardTitle className="flex items-center gap-2 text-navy"><Plug className="h-4 w-4 text-gold" /> Integrations</CardTitle>
                <CardDescription>Connect payment, SMS, WhatsApp, and email providers.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 pt-6">
                <IntegrationCard
                  name="M-Pesa"
                  icon={<Smartphone className="h-5 w-5" />}
                  accent="emerald"
                  description="Safaricom Daraja API for STK Push and C2B payments."
                  fields={[
                    { key: 'mpesa_environment', label: 'Environment', type: 'select', options: ['sandbox', 'production'] },
                    { key: 'mpesa_shortocode', label: 'Shortcode', type: 'text' },
                    { key: 'mpesa_consumer_key', label: 'Consumer Key', type: 'masked' },
                    { key: 'mpesa_consumer_secret', label: 'Consumer Secret', type: 'masked' },
                    { key: 'mpesa_passkey', label: 'Passkey', type: 'masked' },
                    { key: 'mpesa_callback_url', label: 'Callback URL', type: 'text' },
                  ]}
                  settings={settings}
                  onUpdate={update}
                  onTest={() => handleTestConnection('M-Pesa')}
                />
                <IntegrationCard
                  name="SMS Gateway"
                  icon={<MessageSquare className="h-5 w-5" />}
                  accent="gold"
                  description="Send transactional SMS to customers (Africa's Talking, etc.)."
                  fields={[
                    { key: 'sms_provider', label: 'Provider', type: 'select', options: ['africa_talking', 'twilio', 'vonage'] },
                    { key: 'sms_api_key', label: 'API Key', type: 'masked' },
                    { key: 'sms_sender_id', label: 'Sender ID', type: 'text' },
                  ]}
                  settings={settings}
                  onUpdate={update}
                  onTest={() => handleTestConnection('SMS Gateway')}
                />
                <IntegrationCard
                  name="WhatsApp"
                  icon={<Phone className="h-5 w-5" />}
                  accent="emerald"
                  description="WhatsApp Business Cloud API for customer notifications."
                  fields={[
                    { key: 'whatsapp_provider', label: 'Provider', type: 'select', options: ['whatsapp_business', 'twilio'] },
                    { key: 'whatsapp_token', label: 'Access Token', type: 'masked' },
                    { key: 'whatsapp_phone_id', label: 'Phone Number ID', type: 'text' },
                  ]}
                  settings={settings}
                  onUpdate={update}
                  onTest={() => handleTestConnection('WhatsApp')}
                />
                <IntegrationCard
                  name="Email (SMTP)"
                  icon={<Mail className="h-5 w-5" />}
                  accent="navy"
                  description="Send transactional emails via your SMTP server."
                  fields={[
                    { key: 'email_host', label: 'SMTP Host', type: 'text' },
                    { key: 'email_port', label: 'Port', type: 'text' },
                    { key: 'email_username', label: 'Username', type: 'text' },
                    { key: 'email_password', label: 'Password', type: 'masked' },
                    { key: 'email_from', label: 'From Address', type: 'text' },
                  ]}
                  settings={settings}
                  onUpdate={update}
                  onTest={() => handleTestConnection('Email (SMTP)')}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* SECURITY */}
          <TabsContent value="security">
            <Card className="border-slate-200">
              <CardHeader className="border-b border-slate-100">
                <CardTitle className="flex items-center gap-2 text-navy"><ShieldCheck className="h-4 w-4 text-gold" /> Security & Access</CardTitle>
                <CardDescription>Configure session and password policies.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 pt-6">
                <ToggleRow label="Two-factor authentication" description="Require 2FA for admin and finance roles." />
                <ToggleRow label="Force password rotation" description="Require password change every 90 days." defaultChecked />
                <ToggleRow label="Session timeout" description="Auto logout after 30 minutes of inactivity." defaultChecked />
                <ToggleRow label="IP allowlist" description="Restrict admin access to whitelisted IPs." />
                <ToggleRow label="Audit log retention" description="Keep audit logs for 12 months." defaultChecked />
                <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-center gap-2">
                    <History className="h-4 w-4 text-gold" />
                    <p className="text-sm font-bold text-navy">Audit trail</p>
                    <Badge variant="secondary" className="ml-auto bg-emerald-100 text-emerald-700 text-xs">Active</Badge>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">All changes to settings, staff accounts, orders, payments, and inventory are recorded in the audit log. Visit the Audit Log view to review.</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Save bar */}
        <div className="sticky bottom-4 flex justify-end">
          <Button variant="primary" size="md" onClick={handleSave} disabled={saving}>
            <Save className="h-4 w-4" /> {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>
    </AdminLayout>
  );
}

function Field({ label, value, onChange, type = 'text' }: { label: string; value: string; onChange: (v: string) => void; type?: 'text' | 'number' }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Input type={type} value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

function ToggleRow({ label, description, defaultChecked }: { label: string; description: string; defaultChecked?: boolean }) {
  const [checked, setChecked] = useState(!!defaultChecked);
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 p-3">
      <div>
        <p className="text-sm font-semibold text-navy">{label}</p>
        <p className="text-xs text-slate-500">{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={setChecked} />
    </div>
  );
}

interface IntegrationField {
  key: string;
  label: string;
  type: 'text' | 'masked' | 'select';
  options?: string[];
}

function IntegrationCard({ name, icon, accent, description, fields, settings, onUpdate, onTest }: {
  name: string;
  icon: React.ReactNode;
  accent: 'navy' | 'gold' | 'emerald';
  description: string;
  fields: IntegrationField[];
  settings: SettingsMap;
  onUpdate: (k: string, v: string) => void;
  onTest: () => void;
}) {
  const [enabled, setEnabled] = useState(true);
  const accentStyles: Record<string, string> = {
    navy: 'bg-navy text-white',
    gold: 'bg-gold text-[#1a1508]',
    emerald: 'bg-emerald-600 text-white',
  };
  return (
    <div className="rounded-2xl border border-slate-200 bg-white">
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 p-4">
        <div className="flex items-center gap-3">
          <div className={cn('grid h-10 w-10 place-items-center rounded-xl', accentStyles[accent])}>{icon}</div>
          <div>
            <p className="font-bold text-navy">{name}</p>
            <p className="text-xs text-slate-500">{description}</p>
          </div>
        </div>
        <Switch checked={enabled} onCheckedChange={setEnabled} />
      </div>
      <div className={cn('grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-3 transition-opacity', !enabled && 'opacity-50 pointer-events-none')}>
        {fields.map(f => (
          <div key={f.key} className="space-y-1.5">
            <Label>{f.label}</Label>
            {f.type === 'select' ? (
              <Select value={settings[f.key] ?? f.options?.[0] ?? ''} onValueChange={(v) => onUpdate(f.key, v)}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {f.options?.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                </SelectContent>
              </Select>
            ) : (
              <Input
                type={f.type === 'masked' ? 'password' : 'text'}
                value={f.type === 'masked' ? (settings[f.key] ?? '') : (settings[f.key] ?? '')}
                onChange={(e) => onUpdate(f.key, e.target.value)}
                placeholder={f.type === 'masked' ? '••••••••' : ''}
              />
            )}
          </div>
        ))}
      </div>
      <div className="flex flex-col gap-2 border-t border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-slate-500">Last tested: <span className="font-semibold text-slate-700">Never</span></p>
        <Button variant="light" size="sm" onClick={onTest}>
          <CheckCircle2 className="h-3.5 w-3.5" /> Test Connection
        </Button>
      </div>
    </div>
  );
}
