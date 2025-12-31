import { useEffect, useState } from "react";
import { User, LogOut, Settings as SettingsIcon, Sun, Moon, Sparkles } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useBranding } from "@/contexts/BrandingContext";
import logoDark from "@/assets/logo-dark.png";
import logoLight from "@/assets/logo-light.png";
import { Button } from "@/components/ui/button";
import { StaffAvatar } from "@/components/ui/smart-avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import BarbershopSelector from "./BarbershopSelector";
import { NotificationsDropdown } from "./NotificationsDropdown";
import { CommandPaletteTrigger } from "./CommandPalette";
import { useTheme } from "next-themes";

interface ReleaseItem {
  text: string;
  hash: string | null;
}

interface Release {
  version: string;
  date: string | null;
  sections: { [key: string]: ReleaseItem[] };
}

interface ReleaseNotesData {
  releases: Release[];
  latest: Release | null;
  generated_at: string;
}

const Header = () => {
  const { user, signOut, userRole } = useAuth();
  const { effectiveBranding, currentLogoUrl } = useBranding();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();
  const [profileAvatarUrl, setProfileAvatarUrl] = useState<string | null>(null);
  const [profileFullName, setProfileFullName] = useState<string | null>(null);
  const [releaseNotesOpen, setReleaseNotesOpen] = useState(false);
  const [releaseData, setReleaseData] = useState<ReleaseNotesData | null>(null);
  const [currentVersion, setCurrentVersion] = useState<string | null>(null);

  useEffect(() => {
    if (user?.id) {
      fetchProfileData();
    }
    fetchReleaseNotes();
  }, [user?.id]);

  const fetchReleaseNotes = async () => {
    try {
      const response = await fetch('/release-notes.json');
      if (response.ok) {
        const data: ReleaseNotesData = await response.json();
        setReleaseData(data);
        setCurrentVersion(data.latest?.version || null);
      }
    } catch (error) {
      console.error('Error fetching release notes:', error);
    }
  };

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
        {/* Logo + Barbershop Selector */}
        <div className="flex items-center gap-2 lg:gap-6">
          {/* Logo - Only visible on mobile/tablet, hidden on desktop where it's in sidebar */}
          <div className="flex items-center lg:hidden">
            <img 
              src={currentLogoUrl || (theme === 'dark' ? logoDark : logoLight)} 
              alt={effectiveBranding?.system_name || 'Barber Smart'} 
              className="h-10 w-auto object-contain"
            />
          </div>
          
          {/* Barbershop Selector */}
          <BarbershopSelector />
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 lg:gap-3">
          {/* Theme Toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="h-9 w-9 lg:h-10 lg:w-10"
            title={theme === "dark" ? "Modo claro" : "Modo escuro"}
          >
            {theme === "dark" ? (
              <Sun className="h-4 w-4 lg:h-5 lg:w-5" />
            ) : (
              <Moon className="h-4 w-4 lg:h-5 lg:w-5" />
            )}
          </Button>

          {/* Command Palette Trigger */}
          <CommandPaletteTrigger className="hidden sm:flex" />

          {/* Notifications */}
          <NotificationsDropdown />

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-9 lg:h-10 gap-1 lg:gap-2 px-1 lg:px-2">
                <StaffAvatar
                  src={profileAvatarUrl || user?.user_metadata?.avatar_url}
                  alt={profileFullName || user?.email || ''}
                  fallbackText={profileFullName || user?.email}
                  size="sm"
                  fallbackClassName="bg-primary/10 text-primary"
                  lazy={false}
                />
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
              <DropdownMenuItem onClick={() => setReleaseNotesOpen(true)}>
                <Sparkles className="mr-2 h-4 w-4" />
                <span>Novidades</span>
                {currentVersion && (
                  <Badge variant="secondary" className="ml-auto text-xs font-mono">
                    {currentVersion}
                  </Badge>
                )}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => signOut()}>
                <LogOut className="mr-2 h-4 w-4" />
                <span>Sair</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Release Notes Dialog */}
          <Dialog open={releaseNotesOpen} onOpenChange={setReleaseNotesOpen}>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Sparkles className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <DialogTitle className="text-xl">Novidades</DialogTitle>
                    <DialogDescription className="flex items-center gap-2">
                      Histórico de atualizações
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              <ScrollArea className="max-h-[60vh] pr-4">
                {releaseData?.releases && releaseData.releases.length > 0 ? (
                  <div className="space-y-6">
                    {releaseData.releases.map((release, idx) => (
                      <div key={idx} className="border-b border-border pb-4 last:border-0">
                        <div className="flex items-center gap-2 mb-3">
                          <Badge variant={idx === 0 ? "default" : "secondary"} className="font-mono">
                            {release.version}
                          </Badge>
                          {release.date && (
                            <span className="text-sm text-muted-foreground">{release.date}</span>
                          )}
                          {idx === 0 && (
                            <Badge variant="outline" className="text-xs">Atual</Badge>
                          )}
                        </div>
                        
                        <div className="space-y-3">
                          {Object.entries(release.sections).map(([section, items]) => (
                            items.length > 0 && (
                              <div key={section}>
                                <div className="text-sm font-medium mb-1.5">{section}</div>
                                <ul className="pl-4 space-y-1">
                                  {items.map((item, itemIdx) => (
                                    <li key={itemIdx} className="text-sm text-muted-foreground flex items-start gap-2">
                                      <span className="text-primary mt-0.5">•</span>
                                      <span>{item.text}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-8">
                    Nenhuma atualização disponível.
                  </p>
                )}
              </ScrollArea>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </header>
  );
};

export default Header;
