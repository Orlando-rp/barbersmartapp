import { ReactNode } from "react";
import { AnimatePresence } from "framer-motion";
import Header from "./Header";
import Sidebar from "./Sidebar";
import BottomNavigation from "./BottomNavigation";
import FloatingActionButton from "./FloatingActionButton";
import { CommandPalette } from "./CommandPalette";
import { Breadcrumbs } from "./Breadcrumbs";
import { OnboardingTour } from "@/components/onboarding/OnboardingTour";
import { WhatsNewNotification } from "@/components/notifications/WhatsNewNotification";
import { useOnboarding } from "@/hooks/useOnboarding";

interface LayoutProps {
  children: ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  const { showTour, completeTour, skipTour } = useOnboarding();

  return (
    <div className="min-h-screen bg-background">
      {/* Global Command Palette (Ctrl+K) */}
      <CommandPalette />
      
      {/* What's New Notification */}
      <WhatsNewNotification />
      
      {/* Onboarding Tour */}
      <AnimatePresence>
        {showTour && (
          <OnboardingTour onComplete={completeTour} onSkip={skipTour} />
        )}
      </AnimatePresence>
      
      <div className="flex">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <Header />
          <main className="flex-1 p-3 sm:p-4 lg:p-6 overflow-auto pb-20 lg:pb-6">
            <Breadcrumbs />
            {children}
          </main>
        </div>
      </div>

      {/* Mobile Navigation */}
      <BottomNavigation />
      <FloatingActionButton />
    </div>
  );
};

export default Layout;
