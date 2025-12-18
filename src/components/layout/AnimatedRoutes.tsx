import { lazy, Suspense } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { ProtectedRoute, AdminRoute, SuperAdminRoute } from '../ProtectedRoute';
import { ClientProtectedRoute } from '../client/ClientProtectedRoute';
import { PageLoader } from '../ui/page-loader';
import { PageTransition } from './PageTransition';

// Lazy load all pages for code splitting
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
const BarbershopLanding = lazy(() => import("../../pages/BarbershopLanding"));
const MyEarnings = lazy(() => import("../../pages/MyEarnings"));
const MultiUnitDashboard = lazy(() => import("../../pages/MultiUnitDashboard"));
const StaffMultiUnit = lazy(() => import("../../pages/StaffMultiUnit"));
const MultiUnitReports = lazy(() => import("../../pages/MultiUnitReports"));
const SaasAdminPortal = lazy(() => import("../../pages/SaasAdminPortal"));
const Barbershops = lazy(() => import("../../pages/Barbershops"));
const ChatbotSettings = lazy(() => import("../../pages/ChatbotSettings"));
const CompleteProfile = lazy(() => import("../../pages/CompleteProfile"));
const UpgradePlans = lazy(() => import("../../pages/UpgradePlans"));
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

export const AnimatedRoutes = () => {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Suspense fallback={<PageLoader />} key={location.pathname}>
        <Routes location={location}>
          {/* Public Routes */}
          <Route path="/agendar/:barbershopId" element={<PageTransition><PublicBooking /></PageTransition>} />
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
          
          {/* Protected Routes */}
          <Route path="/debug" element={<ProtectedRoute><PageTransition><Debug /></PageTransition></ProtectedRoute>} />
          <Route path="/" element={<ProtectedRoute><PageTransition><Index /></PageTransition></ProtectedRoute>} />
          <Route path="/appointments" element={<ProtectedRoute><PageTransition><Appointments /></PageTransition></ProtectedRoute>} />
          <Route path="/clients" element={<ProtectedRoute><PageTransition><Clients /></PageTransition></ProtectedRoute>} />
          <Route path="/services" element={<ProtectedRoute><PageTransition><Services /></PageTransition></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><PageTransition><Profile /></PageTransition></ProtectedRoute>} />
          <Route path="/meus-ganhos" element={<ProtectedRoute><PageTransition><MyEarnings /></PageTransition></ProtectedRoute>} />
          <Route path="/waitlist" element={<ProtectedRoute><PageTransition><Waitlist /></PageTransition></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><PageTransition><SettingsPage /></PageTransition></ProtectedRoute>} />
          <Route path="/client-history/:clientId" element={<ProtectedRoute><PageTransition><ClientHistory /></PageTransition></ProtectedRoute>} />
          
          {/* Admin Only Routes */}
          <Route path="/staff" element={<AdminRoute><PageTransition><Staff /></PageTransition></AdminRoute>} />
          <Route path="/finance" element={<AdminRoute><PageTransition><Finance /></PageTransition></AdminRoute>} />
          <Route path="/reports" element={<AdminRoute><PageTransition><Reports /></PageTransition></AdminRoute>} />
          <Route path="/marketing" element={<AdminRoute><PageTransition><Marketing /></PageTransition></AdminRoute>} />
          <Route path="/business-hours" element={<AdminRoute><PageTransition><BusinessHours /></PageTransition></AdminRoute>} />
          <Route path="/reviews" element={<AdminRoute><PageTransition><Reviews /></PageTransition></AdminRoute>} />
          <Route path="/whatsapp" element={<AdminRoute><PageTransition><WhatsAppSettings /></PageTransition></AdminRoute>} />
          <Route path="/whatsapp-chat" element={<AdminRoute><PageTransition><WhatsAppChat /></PageTransition></AdminRoute>} />
          <Route path="/chatbot" element={<AdminRoute><PageTransition><ChatbotSettings /></PageTransition></AdminRoute>} />
          <Route path="/audit" element={<AdminRoute><PageTransition><AuditLogs /></PageTransition></AdminRoute>} />
          <Route path="/multi-unit" element={<AdminRoute><PageTransition><MultiUnitDashboard /></PageTransition></AdminRoute>} />
          <Route path="/staff-multi-unit" element={<AdminRoute><PageTransition><StaffMultiUnit /></PageTransition></AdminRoute>} />
          <Route path="/multi-unit-reports" element={<AdminRoute><PageTransition><MultiUnitReports /></PageTransition></AdminRoute>} />
          <Route path="/barbershops" element={<AdminRoute><PageTransition><Barbershops /></PageTransition></AdminRoute>} />
          <Route path="/upgrade" element={<AdminRoute><PageTransition><UpgradePlans /></PageTransition></AdminRoute>} />
          
          {/* Super Admin Only Routes */}
          <Route path="/saas-admin" element={<SuperAdminRoute><PageTransition><SaasAdminPortal /></PageTransition></SuperAdminRoute>} />
          
          {/* Catch-all */}
          <Route path="*" element={<PageTransition><NotFound /></PageTransition>} />
        </Routes>
      </Suspense>
    </AnimatePresence>
  );
};
