import { lazy, Suspense, ReactNode } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { ProtectedRoute, AdminRoute, SuperAdminRoute } from '../ProtectedRoute';
import { ClientProtectedRoute } from '../client/ClientProtectedRoute';
import { PageLoader } from '../ui/page-loader';
import { PageTransition } from './PageTransition';
import Layout from './Layout';
import { Button } from '../ui/button';
import { AlertTriangle, RefreshCw } from 'lucide-react';

// Helper function to retry dynamic imports on failure
const retryImport = <T,>(
  importFn: () => Promise<T>,
  retries = 3,
  delay = 1000
): Promise<T> => {
  return new Promise((resolve, reject) => {
    importFn()
      .then(resolve)
      .catch((error) => {
        if (retries > 0) {
          setTimeout(() => {
            retryImport(importFn, retries - 1, delay).then(resolve, reject);
          }, delay);
        } else {
          reject(error);
        }
      });
  });
};

// Error fallback component for lazy loading failures
const LazyErrorFallback = () => (
  <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-background">
    <AlertTriangle className="h-16 w-16 text-warning mb-4" />
    <h2 className="text-xl font-bold mb-2 text-foreground">Erro ao carregar página</h2>
    <p className="text-muted-foreground mb-4 text-center">Ocorreu um problema ao carregar esta página.</p>
    <Button onClick={() => window.location.reload()}>
      <RefreshCw className="h-4 w-4 mr-2" />
      Recarregar Página
    </Button>
  </div>
);

// Lazy load all pages for code splitting with retry logic for critical pages
const LandingPage = lazy(() => import("../../pages/LandingPage"));
const Index = lazy(() => import("../../pages/Index"));
const Auth = lazy(() => import("../../pages/Auth"));
const Debug = lazy(() => import("../../pages/Debug"));
const Appointments = lazy(() => import("../../pages/Appointments"));
const Clients = lazy(() => import("../../pages/Clients"));
const Services = lazy(() => import("../../pages/Services"));
const Staff = lazy(() => import("../../pages/Staff"));
const Profile = lazy(() => import("../../pages/Profile"));
const Finance = lazy(() => import("../../pages/Finance"));
const AuditLogs = lazy(() => import("../../pages/AuditLogs"));
const Reports = lazy(() => import("../../pages/Reports"));
const Marketing = lazy(() => import("../../pages/Marketing"));
const SettingsPage = lazy(() => import("../../pages/Settings"));
const BusinessHours = lazy(() => import("../../pages/BusinessHours"));
const ClientHistory = lazy(() => import("../../pages/ClientHistory"));
const Reviews = lazy(() => import("../../pages/Reviews"));
const WhatsAppSettings = lazy(() => import("../../pages/WhatsAppSettings"));
const WhatsAppChat = lazy(() => import("../../pages/WhatsAppChat"));
const Waitlist = lazy(() => import("../../pages/Waitlist"));
const PublicBooking = lazy(() => import("../../pages/PublicBooking"));
const BookingPaymentStatus = lazy(() => import("../../pages/BookingPaymentStatus"));
const BarbershopLanding = lazy(() => import("../../pages/BarbershopLanding"));
const MyEarnings = lazy(() => import("../../pages/MyEarnings"));
const MultiUnitDashboard = lazy(() => import("../../pages/MultiUnitDashboard"));
const StaffMultiUnit = lazy(() => import("../../pages/StaffMultiUnit"));
const MultiUnitReports = lazy(() => import("../../pages/MultiUnitReports"));
const SaasAdminPortal = lazy(() => retryImport(() => import("../../pages/SaasAdminPortal")));
const Barbershops = lazy(() => import("../../pages/Barbershops"));
const ChatbotSettings = lazy(() => import("../../pages/ChatbotSettings"));
const CompleteProfile = lazy(() => import("../../pages/CompleteProfile"));
const UpgradePlans = lazy(() => import("../../pages/UpgradePlans"));
const SubscriptionCheckout = lazy(() => import("../../pages/SubscriptionCheckout"));
const SubscriptionSuccess = lazy(() => import("../../pages/SubscriptionSuccess"));
const SubscriptionManagement = lazy(() => import("../../pages/SubscriptionManagement"));
const PrivacyPolicy = lazy(() => import("../../pages/PrivacyPolicy"));
const TermsOfService = lazy(() => import("../../pages/TermsOfService"));
const Install = lazy(() => import("../../pages/Install"));
const NotFound = lazy(() => import("../../pages/NotFound"));

// Client Portal Pages
const ClientAuth = lazy(() => import("../../pages/client/ClientAuth"));
const ClientDashboard = lazy(() => import("../../pages/client/ClientDashboard"));
const ClientAppointments = lazy(() => import("../../pages/client/ClientAppointments"));
const ClientProfile = lazy(() => import("../../pages/client/ClientProfile"));
const ClientNotifications = lazy(() => import("../../pages/client/ClientNotifications"));
const ClientReviews = lazy(() => import("../../pages/client/ClientReviews"));

// Wrapper components that keep Layout static during navigation
const ProtectedLayoutRoute = ({ children }: { children: ReactNode }) => (
  <ProtectedRoute>
    <Layout>
      <PageTransition>
        {children}
      </PageTransition>
    </Layout>
  </ProtectedRoute>
);

const AdminLayoutRoute = ({ children }: { children: ReactNode }) => (
  <AdminRoute>
    <Layout>
      <PageTransition>
        {children}
      </PageTransition>
    </Layout>
  </AdminRoute>
);

export const AnimatedRoutes = () => {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Suspense fallback={<PageLoader />} key={location.pathname}>
        <Routes location={location}>
          {/* Public Routes */}
          <Route path="/" element={<PageTransition><LandingPage /></PageTransition>} />
          <Route path="/agendar/:barbershopId" element={<PageTransition><PublicBooking /></PageTransition>} />
          <Route path="/booking/success" element={<PageTransition><BookingPaymentStatus /></PageTransition>} />
          <Route path="/booking/failure" element={<PageTransition><BookingPaymentStatus /></PageTransition>} />
          <Route path="/booking/pending" element={<PageTransition><BookingPaymentStatus /></PageTransition>} />
          <Route path="/b/:barbershopId" element={<PageTransition><BarbershopLanding /></PageTransition>} />
          <Route path="/s/:subdomain" element={<PageTransition><BarbershopLanding /></PageTransition>} />
          <Route path="/privacy" element={<PageTransition><PrivacyPolicy /></PageTransition>} />
          <Route path="/terms" element={<PageTransition><TermsOfService /></PageTransition>} />
          <Route path="/install" element={<PageTransition><Install /></PageTransition>} />
          
          {/* Auth Routes */}
          <Route path="/auth" element={<PageTransition><Auth /></PageTransition>} />
          <Route path="/complete-profile" element={<ProtectedRoute><PageTransition><CompleteProfile /></PageTransition></ProtectedRoute>} />
          
          {/* Client Portal Routes */}
          <Route path="/cliente/auth" element={<PageTransition><ClientAuth /></PageTransition>} />
          <Route path="/cliente" element={<ClientProtectedRoute><PageTransition><ClientDashboard /></PageTransition></ClientProtectedRoute>} />
          <Route path="/cliente/agendamentos" element={<ClientProtectedRoute><PageTransition><ClientAppointments /></PageTransition></ClientProtectedRoute>} />
          <Route path="/cliente/perfil" element={<ClientProtectedRoute><PageTransition><ClientProfile /></PageTransition></ClientProtectedRoute>} />
          <Route path="/cliente/notificacoes" element={<ClientProtectedRoute><PageTransition><ClientNotifications /></PageTransition></ClientProtectedRoute>} />
          <Route path="/cliente/avaliacoes" element={<ClientProtectedRoute><PageTransition><ClientReviews /></PageTransition></ClientProtectedRoute>} />
          
          {/* Protected Routes with Layout */}
          <Route path="/dashboard" element={<ProtectedLayoutRoute><Index /></ProtectedLayoutRoute>} />
          <Route path="/debug" element={<ProtectedLayoutRoute><Debug /></ProtectedLayoutRoute>} />
          <Route path="/appointments" element={<ProtectedLayoutRoute><Appointments /></ProtectedLayoutRoute>} />
          <Route path="/clients" element={<ProtectedLayoutRoute><Clients /></ProtectedLayoutRoute>} />
          <Route path="/services" element={<ProtectedLayoutRoute><Services /></ProtectedLayoutRoute>} />
          <Route path="/profile" element={<ProtectedLayoutRoute><Profile /></ProtectedLayoutRoute>} />
          <Route path="/meus-ganhos" element={<ProtectedLayoutRoute><MyEarnings /></ProtectedLayoutRoute>} />
          <Route path="/waitlist" element={<ProtectedLayoutRoute><Waitlist /></ProtectedLayoutRoute>} />
          <Route path="/settings" element={<ProtectedLayoutRoute><SettingsPage /></ProtectedLayoutRoute>} />
          <Route path="/client-history/:clientId" element={<ProtectedLayoutRoute><ClientHistory /></ProtectedLayoutRoute>} />
          
          {/* Admin Only Routes with Layout */}
          <Route path="/staff" element={<AdminLayoutRoute><Staff /></AdminLayoutRoute>} />
          <Route path="/finance" element={<AdminLayoutRoute><Finance /></AdminLayoutRoute>} />
          <Route path="/reports" element={<AdminLayoutRoute><Reports /></AdminLayoutRoute>} />
          <Route path="/marketing" element={<AdminLayoutRoute><Marketing /></AdminLayoutRoute>} />
          <Route path="/business-hours" element={<AdminLayoutRoute><BusinessHours /></AdminLayoutRoute>} />
          <Route path="/reviews" element={<AdminLayoutRoute><Reviews /></AdminLayoutRoute>} />
          <Route path="/whatsapp" element={<AdminLayoutRoute><WhatsAppSettings /></AdminLayoutRoute>} />
          <Route path="/whatsapp-chat" element={<AdminLayoutRoute><WhatsAppChat /></AdminLayoutRoute>} />
          <Route path="/chatbot" element={<AdminLayoutRoute><ChatbotSettings /></AdminLayoutRoute>} />
          <Route path="/audit" element={<AdminLayoutRoute><AuditLogs /></AdminLayoutRoute>} />
          <Route path="/multi-unit" element={<AdminLayoutRoute><MultiUnitDashboard /></AdminLayoutRoute>} />
          <Route path="/staff-multi-unit" element={<AdminLayoutRoute><StaffMultiUnit /></AdminLayoutRoute>} />
          <Route path="/multi-unit-reports" element={<AdminLayoutRoute><MultiUnitReports /></AdminLayoutRoute>} />
          <Route path="/barbershops" element={<AdminLayoutRoute><Barbershops /></AdminLayoutRoute>} />
          <Route path="/upgrade" element={<AdminLayoutRoute><UpgradePlans /></AdminLayoutRoute>} />
          <Route path="/subscription/checkout" element={<ProtectedLayoutRoute><SubscriptionCheckout /></ProtectedLayoutRoute>} />
          <Route path="/subscription/success" element={<ProtectedLayoutRoute><SubscriptionSuccess /></ProtectedLayoutRoute>} />
          <Route path="/subscription/manage" element={<ProtectedLayoutRoute><SubscriptionManagement /></ProtectedLayoutRoute>} />
          
          {/* Super Admin Only Routes - SaasAdminPortal uses its own SaasAdminLayout */}
          <Route path="/saas-admin" element={<SuperAdminRoute><PageTransition><SaasAdminPortal /></PageTransition></SuperAdminRoute>} />
          
          {/* Catch-all */}
          <Route path="*" element={<PageTransition><NotFound /></PageTransition>} />
        </Routes>
      </Suspense>
    </AnimatePresence>
  );
};
