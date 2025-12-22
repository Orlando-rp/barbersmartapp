import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "./contexts/AuthContext";
import { BrandingProvider } from "./contexts/BrandingContext";
import { AnimatedRoutes } from "./components/layout/AnimatedRoutes";
import SubdomainRouter from "./components/routing/SubdomainRouter";
import DynamicHead from "./components/DynamicHead";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
      <BrandingProvider>
        <AuthProvider>
          <TooltipProvider>
            <DynamicHead />
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <SubdomainRouter>
                <AnimatedRoutes />
              </SubdomainRouter>
            </BrowserRouter>
          </TooltipProvider>
        </AuthProvider>
      </BrandingProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
