import { ReactNode } from "react";
import Header from "./Header";
import Sidebar from "./Sidebar";
import BottomNavigation from "./BottomNavigation";
import FloatingActionButton from "./FloatingActionButton";
import { CommandPalette } from "./CommandPalette";
import { Breadcrumbs } from "./Breadcrumbs";

interface LayoutProps {
  children: ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  return (
    <div className="min-h-screen bg-background">
      {/* Global Command Palette (Ctrl+K) */}
      <CommandPalette />
      
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
