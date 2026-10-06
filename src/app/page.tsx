'use client';

import { useEffect, useState } from 'react';
import { useAppStore, bootstrapSession, type ViewKey } from '@/stores/app-store';
import { AppShell } from '@/components/shared/AppShell';

// Public
import { HomeView } from '@/components/public/HomeView';
import { QuoteView } from '@/components/public/QuoteView';
import { PublishingView } from '@/components/public/PublishingView';
import { BooksView } from '@/components/public/BooksView';
import { BookDetailView } from '@/components/public/BookDetailView';
import { PrintingView } from '@/components/public/PrintingView';
import { BrandingView } from '@/components/public/BrandingView';
import { CyberView } from '@/components/public/CyberView';
import { PortfolioView } from '@/components/public/PortfolioView';
import { ContactView } from '@/components/public/ContactView';
import { TrackOrderView } from '@/components/public/TrackOrderView';

// Auth
import { LoginView } from '@/components/auth/LoginView';
import { RegisterView } from '@/components/auth/RegisterView';

// Customer
import { CustomerDashboard } from '@/components/customer/CustomerDashboard';
import { CustomerQuotations } from '@/components/customer/CustomerQuotations';
import { CustomerOrders } from '@/components/customer/CustomerOrders';
import { CustomerPayments } from '@/components/customer/CustomerPayments';
import { CustomerProfile } from '@/components/customer/CustomerProfile';
import { CustomerNotifications } from '@/components/customer/CustomerNotifications';
import { CustomerQuoteDetail } from '@/components/customer/CustomerQuoteDetail';
import { CustomerOrderDetail } from '@/components/customer/CustomerOrderDetail';

// Admin
import { AdminDashboard } from '@/components/admin/AdminDashboard';
import { AdminOrders } from '@/components/admin/AdminOrders';
import { AdminOrderDetail } from '@/components/admin/AdminOrderDetail';
import { AdminQuotations } from '@/components/admin/AdminQuotations';
import { AdminQuoteDetail } from '@/components/admin/AdminQuoteDetail';
import { AdminSales } from '@/components/admin/AdminSales';
import { AdminInventory } from '@/components/admin/AdminInventory';
import AdminPublishing from '@/components/admin/AdminPublishing';
import AdminPortfolio from '@/components/admin/AdminPortfolio';
import AdminNotifications from '@/components/admin/AdminNotifications';
import AdminReports from '@/components/admin/AdminReports';
import AdminStaff from '@/components/admin/AdminStaff';
import AdminSettings from '@/components/admin/AdminSettings';
import AdminAudit from '@/components/admin/AdminAudit';
import AdminContacts from '@/components/admin/AdminContacts';
import AdminCustomers from '@/components/admin/AdminCustomers';
import AdminWhatsAppBot from '@/components/admin/AdminWhatsAppBot';

// Author
import { AuthorDashboard } from '@/components/author/AuthorDashboard';
import { AuthorBooks } from '@/components/author/AuthorBooks';

function renderView(view: ViewKey): React.ReactNode {
  switch (view) {
    // Public
    case 'home': return <HomeView />;
    case 'publishing': return <PublishingView />;
    case 'books': return <BooksView />;
    case 'book-detail': return <BookDetailView />;
    case 'printing': return <PrintingView />;
    case 'branding': return <BrandingView />;
    case 'cyber': return <CyberView />;
    case 'portfolio': return <PortfolioView />;
    case 'quote': return <QuoteView />;
    case 'contact': return <ContactView />;
    case 'track-order': return <TrackOrderView />;
    // Auth
    case 'login': return <LoginView />;
    case 'register': return <RegisterView />;
    // Customer
    case 'customer-dashboard': return <CustomerDashboard />;
    case 'customer-quotations': return <CustomerQuotations />;
    case 'customer-orders': return <CustomerOrders />;
    case 'customer-payments': return <CustomerPayments />;
    case 'customer-profile': return <CustomerProfile />;
    case 'customer-notifications': return <CustomerNotifications />;
    case 'customer-quote-detail': return <CustomerQuoteDetail />;
    case 'customer-order-detail': return <CustomerOrderDetail />;
    // Admin
    case 'admin-dashboard': return <AdminDashboard />;
    case 'admin-orders': return <AdminOrders />;
    case 'admin-order-detail': return <AdminOrderDetail />;
    case 'admin-quotations': return <AdminQuotations />;
    case 'admin-quote-detail': return <AdminQuoteDetail />;
    case 'admin-sales': return <AdminSales />;
    case 'admin-inventory': return <AdminInventory />;
    case 'admin-publishing': return <AdminPublishing />;
    case 'admin-portfolio': return <AdminPortfolio />;
    case 'admin-notifications': return <AdminNotifications />;
    case 'admin-reports': return <AdminReports />;
    case 'admin-staff': return <AdminStaff />;
    case 'admin-settings': return <AdminSettings />;
    case 'admin-audit': return <AdminAudit />;
    case 'admin-contacts': return <AdminContacts />;
    case 'admin-customers': return <AdminCustomers />;
    case 'admin-whatsapp-bot': return <AdminWhatsAppBot />;
    // Author
    case 'author-dashboard': return <AuthorDashboard />;
    case 'author-books': return <AuthorBooks />;
    default: return <HomeView />;
  }
}

export default function Home() {
  const { view, user, navigate } = useAppStore();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    bootstrapSession().finally(() => setReady(true));
  }, []);

  // Guard portal views: if not authenticated, render LoginView INSTEAD of the portal
  // component. This prevents portal components from mounting and firing premature API
  // calls (which caused the "Unauthorized" toast race condition on page reload).
  // We also stash the intended view in params.redirect so LoginView can send the user
  // back after a successful login.
  const isPortal = view.startsWith('admin-') || view.startsWith('customer-') || view.startsWith('author-');

  useEffect(() => {
    if (!ready) return;
    if (isPortal && !user) {
      // Stash the intended destination so login can redirect back.
      // Only set it if not already set (avoid clobbering on re-renders).
      navigate('login', { redirect: view });
    }
  }, [ready, isPortal, user, view, navigate]);

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-gold" />
          <p className="text-sm font-semibold text-slate-500">Loading Print & Publish Co.…</p>
        </div>
      </div>
    );
  }

  // Render guard: NEVER mount portal components when user is null.
  // This is the critical fix — the portal-guard effect above runs AFTER render,
  // so without this guard the portal component mounts for one cycle and fires
  // API calls that 401, causing the spurious "Unauthorized" toast.
  if (isPortal && !user) {
    return <AppShell><LoginView /></AppShell>;
  }

  return <AppShell>{renderView(view)}</AppShell>;
}
