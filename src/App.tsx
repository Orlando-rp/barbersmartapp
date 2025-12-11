import { lazy, Suspense } from 'react';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "./contexts/AuthContext";
import { BrandingProvider } from "./contexts/BrandingContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { PageLoader } from "./components/ui/page-loader";

// Lazy load all pages for code splitting
const Index = lazy(() => import("./pages/Index"));
const Auth = lazy(() => import("./pages/Auth"));
const Debug = lazy(() => import("./pages/Debug"));
const Appointments = lazy(() => import("./pages/Appointments"));
const Clients = lazy(() => import("./pages/Clients"));
const Services = lazy(() => import("./pages/Services"));
const Staff = lazy(() => import("./pages/Staff"));
const Profile = lazy(() => import("./pages/Profile"));
const Finance = lazy(() => import("./pages/Finance"));
const AuditLogs = lazy(() => import("./pages/AuditLogs"));
const Reports = lazy(() => import("./pages/Reports"));
const Marketing = lazy(() => import("./pages/Marketing"));
const SettingsPage = lazy(() => import("./pages/Settings"));
const BusinessHours = lazy(() => import("./pages/BusinessHours"));
const ClientHistory = lazy(() => import("./pages/ClientHistory"));
const Reviews = lazy(() => import("./pages/Reviews"));
const WhatsAppSettings = lazy(() => import("./pages/WhatsAppSettings"));
const WhatsAppChat = lazy(() => import("./pages/WhatsAppChat"));
const Waitlist = lazy(() => import("./pages/Waitlist"));
const PublicBooking = lazy(() => import("./pages/PublicBooking"));
const BarbershopLanding = lazy(() => import("./pages/BarbershopLanding"));
const MyEarnings = lazy(() => import("./pages/MyEarnings"));
const MultiUnitDashboard = lazy(() => import("./pages/MultiUnitDashboard"));
const StaffMultiUnit = lazy(() => import("./pages/StaffMultiUnit"));
const MultiUnitReports = lazy(() => import("./pages/MultiUnitReports"));
const SaasAdminPortal = lazy(() => import("./pages/SaasAdminPortal"));
const Barbershops = lazy(() => import("./pages/Barbershops"));
const ChatbotSettings = lazy(() => import("./pages/ChatbotSettings"));
const CompleteProfile = lazy(() => import("./pages/CompleteProfile"));
const UpgradePlans = lazy(() => import("./pages/UpgradePlans"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const TermsOfService = lazy(() => import("./pages/TermsOfService"));
const Install = lazy(() => import("./pages/Install"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
      <BrandingProvider>
        <AuthProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Suspense fallback={<PageLoader />}>
                <Routes>
                  {/* Public Routes */}
                  <Route path="/agendar/:barbershopId" element={<PublicBooking />} />
                  <Route path="/b/:barbershopId" element={<BarbershopLanding />} />
                  <Route path="/s/:subdomain" element={<BarbershopLanding />} />
                  <Route path="/privacy" element={<PrivacyPolicy />} />
                  <Route path="/terms" element={<TermsOfService />} />
                  <Route path="/install" element={<Install />} />
                  
                  {/* Auth Routes */}
                  <Route path="/auth" element={<Auth />} />
                  <Route path="/complete-profile" element={<ProtectedRoute><CompleteProfile /></ProtectedRoute>} />
                  
                  {/* Protected Routes */}
                  <Route path="/debug" element={<ProtectedRoute><Debug /></ProtectedRoute>} />
                  <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
                  <Route path="/appointments" element={<ProtectedRoute><Appointments /></ProtectedRoute>} />
                  <Route path="/clients" element={<ProtectedRoute><Clients /></ProtectedRoute>} />
                  <Route path="/services" element={<ProtectedRoute><Services /></ProtectedRoute>} />
                  <Route path="/staff" element={<ProtectedRoute><Staff /></ProtectedRoute>} />
                  <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
                  <Route path="/finance" element={<ProtectedRoute><Finance /></ProtectedRoute>} />
                  <Route path="/reports" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
                  <Route path="/marketing" element={<ProtectedRoute><Marketing /></ProtectedRoute>} />
                  <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
                  <Route path="/business-hours" element={<ProtectedRoute><BusinessHours /></ProtectedRoute>} />
                  <Route path="/client-history/:clientId" element={<ProtectedRoute><ClientHistory /></ProtectedRoute>} />
                  <Route path="/reviews" element={<ProtectedRoute><Reviews /></ProtectedRoute>} />
                  <Route path="/whatsapp" element={<ProtectedRoute><WhatsAppSettings /></ProtectedRoute>} />
                  <Route path="/whatsapp-chat" element={<ProtectedRoute><WhatsAppChat /></ProtectedRoute>} />
                  <Route path="/chatbot" element={<ProtectedRoute><ChatbotSettings /></ProtectedRoute>} />
                  <Route path="/waitlist" element={<ProtectedRoute><Waitlist /></ProtectedRoute>} />
                  <Route path="/meus-ganhos" element={<ProtectedRoute><MyEarnings /></ProtectedRoute>} />
                  <Route path="/audit" element={<ProtectedRoute><AuditLogs /></ProtectedRoute>} />
                  <Route path="/multi-unit" element={<ProtectedRoute><MultiUnitDashboard /></ProtectedRoute>} />
                  <Route path="/staff-multi-unit" element={<ProtectedRoute><StaffMultiUnit /></ProtectedRoute>} />
                  <Route path="/multi-unit-reports" element={<ProtectedRoute><MultiUnitReports /></ProtectedRoute>} />
                  <Route path="/barbershops" element={<ProtectedRoute><Barbershops /></ProtectedRoute>} />
                  <Route path="/saas-admin" element={<ProtectedRoute><SaasAdminPortal /></ProtectedRoute>} />
                  <Route path="/upgrade" element={<ProtectedRoute><UpgradePlans /></ProtectedRoute>} />
                  {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
            </BrowserRouter>
          </TooltipProvider>
        </AuthProvider>
      </BrandingProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
