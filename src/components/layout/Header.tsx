import { useEffect, useState } from "react";
import { User, LogOut, Settings as SettingsIcon } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useBranding } from "@/contexts/BrandingContext";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import BarbershopSelector from "./BarbershopSelector";
import { NotificationsDropdown } from "./NotificationsDropdown";
import { MobileSidebar } from "./Sidebar";

const Header = () => {
  const { user, signOut, userRole } = useAuth();
  const { effectiveBranding, currentLogoUrl } = useBranding();
  const navigate = useNavigate();
  const [profileAvatarUrl, setProfileAvatarUrl] = useState<string | null>(null);
  const [profileFullName, setProfileFullName] = useState<string | null>(null);

  useEffect(() => {
    if (user?.id) {
      fetchProfileData();
    }
  }, [user?.id]);

  const fetchProfileData = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('full_name, avatar_url')
      .eq('id', user?.id)
      .maybeSingle();
    
    if (data) {
      setProfileAvatarUrl(data.avatar_url);
      setProfileFullName(data.full_name);
    }
  };
  
  const getInitials = (name: string | null, email: string | null) => {
    if (name) {
      return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
    }
    return email ? email.substring(0, 2).toUpperCase() : '??';
  };

  const getRoleLabel = (role: string | null) => {
    const roleLabels: Record<string, string> = {
      super_admin: 'Super Admin',
      admin: 'Administrador',
      barbeiro: 'Barbeiro',
      recepcionista: 'Recepcionista',
    };
    return role ? roleLabels[role] || role : '';
  };

  return (
    <header className="h-14 lg:h-16 border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="flex items-center justify-between h-full px-3 lg:px-6">
        {/* Mobile Menu + Logo */}
          <div className="flex items-center gap-2 lg:gap-6">
          <MobileSidebar />
          
          {/* Logo - Only visible on mobile/tablet, hidden on desktop where it's in sidebar */}
          <div className="flex items-center space-x-2 lg:hidden">
            {currentLogoUrl ? (
              <img 
                src={currentLogoUrl} 
                alt={effectiveBranding?.system_name || 'Logo'} 
                className="w-7 h-7 rounded-lg object-contain"
              />
            ) : (
              <div className="w-7 h-7 gradient-primary rounded-lg flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-xs">
                  {effectiveBranding?.system_name?.substring(0, 2).toUpperCase() || 'BS'}
                </span>
              </div>
            )}
            <h1 className="text-base font-bold text-foreground hidden sm:block">
              {effectiveBranding?.system_name || 'BarberSmart'}
            </h1>
          </div>
          
          {/* Barbershop Selector - hidden on very small screens */}
          <div className="hidden md:block">
            <BarbershopSelector />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 lg:gap-4">
          {/* Notifications */}
          <NotificationsDropdown />

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-9 lg:h-10 gap-1 lg:gap-2 px-1 lg:px-2">
                <Avatar className="h-7 w-7 lg:h-8 lg:w-8">
                  <AvatarImage src={profileAvatarUrl || user?.user_metadata?.avatar_url} alt={profileFullName || user?.email || ''} />
                  <AvatarFallback className="bg-primary/10 text-primary text-xs lg:text-sm">
                    {getInitials(profileFullName, user?.email || null)}
                  </AvatarFallback>
                </Avatar>
                {/* Hide user info on mobile */}
                <div className="hidden lg:flex flex-col items-start text-sm">
                  <span className="font-medium max-w-32 truncate">{profileFullName || user?.user_metadata?.full_name || user?.email}</span>
                  {userRole && (
                    <span className="text-xs text-muted-foreground">{getRoleLabel(userRole)}</span>
                  )}
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">
                    {profileFullName || user?.user_metadata?.full_name || 'Usuário'}
                  </p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {user?.email}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate('/profile')}>
                <User className="mr-2 h-4 w-4" />
                <span>Meu Perfil</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate('/settings')}>
                <SettingsIcon className="mr-2 h-4 w-4" />
                <span>Configurações</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => signOut()}>
                <LogOut className="mr-2 h-4 w-4" />
                <span>Sair</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
};

export default Header;
