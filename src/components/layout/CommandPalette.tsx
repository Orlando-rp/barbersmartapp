import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Calendar,
  Users,
  Scissors,
  UserCog,
  DollarSign,
  BarChart3,
  MessageSquare,
  Settings,
  Home,
  Plus,
  Search,
  Clock,
  StarIcon,
  Wallet,
  Building2,
} from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { useAuth } from "@/contexts/AuthContext";
import { useFeatureFlags } from "@/hooks/useFeatureFlags";

interface CommandItem {
  id: string;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  action: () => void;
  keywords?: string[];
  group: "navigation" | "actions" | "search";
}

export const CommandPalette = () => {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { userRole } = useAuth();
  const { hasFeature } = useFeatureFlags();

  // Keyboard shortcut handler
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const handleNavigation = useCallback((path: string) => {
    navigate(path);
    setOpen(false);
  }, [navigate]);

  // Navigation items
  const navigationItems: CommandItem[] = [
    { id: "dashboard", name: "Dashboard", icon: Home, action: () => handleNavigation("/dashboard"), keywords: ["início", "home"], group: "navigation" },
    { id: "appointments", name: "Agendamentos", icon: Calendar, action: () => handleNavigation("/appointments"), keywords: ["agenda", "horários", "marcação"], group: "navigation" },
    { id: "clients", name: "Clientes", icon: Users, action: () => handleNavigation("/clients"), keywords: ["cliente", "contatos"], group: "navigation" },
    { id: "services", name: "Serviços", icon: Scissors, action: () => handleNavigation("/services"), keywords: ["corte", "barba", "serviço"], group: "navigation" },
    { id: "staff", name: "Equipe", icon: UserCog, action: () => handleNavigation("/staff"), keywords: ["barbeiro", "funcionário", "profissional"], group: "navigation" },
    { id: "finance", name: "Financeiro", icon: DollarSign, action: () => handleNavigation("/finance"), keywords: ["dinheiro", "receita", "despesa", "caixa"], group: "navigation" },
    { id: "reports", name: "Relatórios", icon: BarChart3, action: () => handleNavigation("/reports"), keywords: ["gráficos", "análise", "estatísticas"], group: "navigation" },
    { id: "marketing", name: "Marketing", icon: MessageSquare, action: () => handleNavigation("/marketing"), keywords: ["campanha", "promoção", "cupom"], group: "navigation" },
    { id: "reviews", name: "Avaliações", icon: StarIcon, action: () => handleNavigation("/reviews"), keywords: ["review", "nota", "feedback"], group: "navigation" },
    { id: "business-hours", name: "Horários", icon: Clock, action: () => handleNavigation("/business-hours"), keywords: ["funcionamento", "abertura", "fechamento"], group: "navigation" },
    { id: "settings", name: "Configurações", icon: Settings, action: () => handleNavigation("/settings"), keywords: ["config", "preferências"], group: "navigation" },
  ];

  // Quick actions
  const quickActions: CommandItem[] = [
    { id: "new-appointment", name: "Novo Agendamento", icon: Plus, action: () => handleNavigation("/appointments?new=true"), keywords: ["criar", "agendar", "marcar"], group: "actions" },
    { id: "new-client", name: "Novo Cliente", icon: Plus, action: () => handleNavigation("/clients?new=true"), keywords: ["criar", "cadastrar"], group: "actions" },
    { id: "new-transaction", name: "Nova Transação", icon: Plus, action: () => handleNavigation("/finance?new=true"), keywords: ["criar", "lançamento", "receita", "despesa"], group: "actions" },
  ];

  // Add role-specific items
  if (userRole === "admin" || userRole === "super_admin") {
    navigationItems.push(
      { id: "earnings", name: "Meus Ganhos", icon: Wallet, action: () => handleNavigation("/meus-ganhos"), keywords: ["comissão", "salário"], group: "navigation" }
    );
  }

  if (userRole === "super_admin") {
    navigationItems.push(
      { id: "saas-admin", name: "Admin SaaS", icon: Building2, action: () => handleNavigation("/saas-admin"), keywords: ["administração", "sistema"], group: "navigation" }
    );
  }

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Buscar páginas, ações ou clientes..." />
      <CommandList>
        <CommandEmpty>Nenhum resultado encontrado.</CommandEmpty>
        
        <CommandGroup heading="Ações Rápidas">
          {quickActions.map((item) => (
            <CommandItem
              key={item.id}
              onSelect={item.action}
              className="flex items-center gap-2 cursor-pointer"
            >
              <item.icon className="h-4 w-4 text-primary" />
              <span>{item.name}</span>
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Navegação">
          {navigationItems.map((item) => (
            <CommandItem
              key={item.id}
              onSelect={item.action}
              className="flex items-center gap-2 cursor-pointer"
            >
              <item.icon className="h-4 w-4" />
              <span>{item.name}</span>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
};

// Trigger button for mobile/header
export const CommandPaletteTrigger = ({ className }: { className?: string }) => {
  const [, setOpen] = useState(false);

  const handleClick = () => {
    // Dispatch keyboard event to open command palette
    const event = new KeyboardEvent("keydown", {
      key: "k",
      metaKey: true,
      bubbles: true,
    });
    document.dispatchEvent(event);
  };

  return (
    <button
      onClick={handleClick}
      className={`flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground rounded-lg border border-border bg-background hover:bg-accent transition-colors ${className}`}
    >
      <Search className="h-4 w-4" />
      <span className="hidden sm:inline">Buscar...</span>
      <kbd className="hidden sm:inline-flex h-5 select-none items-center gap-1 rounded border border-border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
        <span className="text-xs">⌘</span>K
      </kbd>
    </button>
  );
};
