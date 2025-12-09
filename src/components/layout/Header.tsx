import { useEffect, useState } from "react";
import { Bell, User, LogOut, Settings as SettingsIcon } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
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

const Header = () => {
  const { user, signOut, userRole } = useAuth();
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
    <header className="h-16 border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="flex items-center justify-between h-full px-6">
        {/* Logo and Barbershop Selector */}
        <div className="flex items-center space-x-6">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 gradient-primary rounded-lg flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">BS</span>
            </div>
            <h1 className="text-xl font-bold text-foreground">BarberSmart</h1>
          </div>
          <BarbershopSelector />
        </div>

        {/* Actions */}
        <div className="flex items-center space-x-4">
          {/* Notifications */}
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="h-5 w-5" />
            <span className="absolute -top-1 -right-1 h-3 w-3 bg-primary rounded-full flex items-center justify-center">
              <span className="text-xs text-primary-foreground">3</span>
            </span>
          </Button>

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-10 gap-2">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={profileAvatarUrl || user?.user_metadata?.avatar_url} alt={profileFullName || user?.email || ''} />
                  <AvatarFallback className="bg-primary/10 text-primary">
                    {getInitials(profileFullName, user?.email || null)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col items-start text-sm">
                  <span className="font-medium">{profileFullName || user?.user_metadata?.full_name || user?.email}</span>
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