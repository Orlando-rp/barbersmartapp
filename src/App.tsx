import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { BrandingProvider } from "./contexts/BrandingContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Debug from "./pages/Debug";
import Appointments from "./pages/Appointments";
import Clients from "./pages/Clients";
import Services from "./pages/Services";
import Staff from "./pages/Staff";
import Profile from "./pages/Profile";
import Finance from "./pages/Finance";
import AuditLogs from "./pages/AuditLogs";
import Reports from "./pages/Reports";
import Marketing from "./pages/Marketing";
import SettingsPage from "./pages/Settings";
import BusinessHours from "./pages/BusinessHours";
import ClientHistory from "./pages/ClientHistory";
import Reviews from "./pages/Reviews";
import WhatsAppSettings from "./pages/WhatsAppSettings";
import Waitlist from "./pages/Waitlist";
import PublicBooking from "./pages/PublicBooking";
import BarbershopLanding from "./pages/BarbershopLanding";
import MyEarnings from "./pages/MyEarnings";
import MultiUnitDashboard from "./pages/MultiUnitDashboard";
import StaffMultiUnit from "./pages/StaffMultiUnit";
import MultiUnitReports from "./pages/MultiUnitReports";
import SaasAdminPortal from "./pages/SaasAdminPortal";
import Barbershops from "./pages/Barbershops";
import ChatbotSettings from "./pages/ChatbotSettings";
import CompleteProfile from "./pages/CompleteProfile";
import UpgradePlans from "./pages/UpgradePlans";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <BrandingProvider>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
          <Routes>
            {/* Public Routes */}
            <Route path="/agendar/:barbershopId" element={<PublicBooking />} />
            <Route path="/b/:barbershopId" element={<BarbershopLanding />} />
            <Route path="/s/:subdomain" element={<BarbershopLanding />} />
            
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
        </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </BrandingProvider>
  </QueryClientProvider>
);

export default App;
