import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { PublicBookingLink } from "@/components/settings/PublicBookingLink";
import DomainSettings from "@/components/settings/DomainSettings";
import PortfolioGalleryManager from "@/components/settings/PortfolioGalleryManager";
import NotificationSettings from "@/components/settings/NotificationSettings";
import BarbershopBrandingConfig from "@/components/settings/BarbershopBrandingConfig";
import RolePermissionsConfig from "@/components/settings/RolePermissionsConfig";
import WhatsAppSettingsSection from "@/components/settings/WhatsAppSettingsSection";
import ChatbotSettingsSection from "@/components/settings/ChatbotSettingsSection";
import { FeatureGate } from "@/components/FeatureGate";
import { useOnboarding } from "@/hooks/useOnboarding";
import { 
  Save, User, Bell, Clock, Globe, Image, Sparkles, 
  Shield, Settings, ChevronRight, Building2, Link2, RotateCcw, LayoutTemplate,
  MessageSquare, Bot, FileText, CreditCard, Briefcase
} from "lucide-react";
import PaymentSettingsSection from "@/components/settings/PaymentSettingsSection";
import LandingPageBuilder from "@/components/settings/LandingPageBuilder";
import { toast } from "sonner";
import { CPFCNPJInput } from "@/components/ui/cpf-cnpj-input";
import { useNavigate, useSearchParams } from "react-router-dom";
import { cn } from "@/lib/utils";

interface BarbershopSettings {
  name: string;
  address: string;
  phone: string;
  email: string;
  cnpj: string;
  responsible_name: string;
  responsible_phone: string;
  responsible_email: string;
  settings: {
    notifications: {
      whatsapp: boolean;
      email: boolean;
      marketing: boolean;
    };
  };
}

type SettingsSection = 'profile' | 'notifications' | 'hours' | 'domain' | 'portfolio' | 'landing' | 'branding' | 'whatsapp' | 'chatbot' | 'payments' | 'audit' | 'permissions';

type SectionItem = {
  id: SettingsSection;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
};

type SectionGroup = {
  label: string;
  sections: SectionItem[];
};

const settingsGroups: SectionGroup[] = [
  {
    label: 'Básico',
    sections: [
      { id: 'profile', label: 'Perfil', icon: Building2, description: 'Dados da barbearia' },
      { id: 'hours', label: 'Horários', icon: Clock, description: 'Funcionamento' },
    ]
  },
  {
    label: 'Aparência',
    sections: [
      { id: 'domain', label: 'Domínio', icon: Globe, description: 'Link público' },
      { id: 'portfolio', label: 'Portfólio', icon: Image, description: 'Galeria de fotos' },
      { id: 'landing', label: 'Landing Page', icon: LayoutTemplate, description: 'Página pública' },
      { id: 'branding', label: 'Marca', icon: Sparkles, description: 'Identidade visual' },
    ]
  },
  {
    label: 'Comunicação',
    sections: [
      { id: 'notifications', label: 'Notificações', icon: Bell, description: 'Alertas e lembretes' },
      { id: 'whatsapp', label: 'WhatsApp', icon: MessageSquare, description: 'APIs e integração' },
      { id: 'chatbot', label: 'Chatbot IA', icon: Bot, description: 'Assistente virtual' },
    ]
  },
  {
    label: 'Pagamentos',
    sections: [
      { id: 'payments', label: 'Mercado Pago', icon: CreditCard, description: 'Pagamentos online' },
    ]
  },
  {
    label: 'Segurança',
    sections: [
      { id: 'audit', label: 'Auditoria', icon: FileText, description: 'Logs de atividades' },
      { id: 'permissions', label: 'Permissões', icon: Shield, description: 'Controle de acesso' },
    ]
  },
];

const SettingsPage = () => {
  const { barbershopId, userRole } = useAuth();
  const navigate = useNavigate();
  const { resetTour } = useOnboarding();
  const [searchParams, setSearchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeSection, setActiveSection] = useState<SettingsSection>(() => {
    const section = searchParams.get('section') as SettingsSection;
    return section || 'profile';
  });
  const [activeMobileGroup, setActiveMobileGroup] = useState<string>('Básico');
  const [settings, setSettings] = useState<BarbershopSettings>({
    name: '',
    address: '',
    phone: '',
    email: '',
    cnpj: '',
    responsible_name: '',
    responsible_phone: '',
    responsible_email: '',
    settings: {
      notifications: {
        whatsapp: false,
        email: false,
        marketing: false,
      }
    }
  });

  useEffect(() => {
    if (barbershopId) {
      fetchSettings();
    }
  }, [barbershopId]);

  useEffect(() => {
    setSearchParams({ section: activeSection });
    
    // Sync mobile group with active section
    const groupForSection = settingsGroups.find(group => 
      group.sections.some(s => s.id === activeSection)
    );
    if (groupForSection) {
      setActiveMobileGroup(groupForSection.label);
    }
  }, [activeSection]);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('barbershops')
        .select('name, address, phone, email, settings, cnpj, responsible_name, responsible_phone, responsible_email')
        .eq('id', barbershopId)
        .single();

      if (error) throw error;

      if (data) {
        const dbSettings = data.settings || {};
        setSettings({
          name: data.name || '',
          address: data.address || '',
          phone: data.phone || '',
          email: data.email || '',
          cnpj: data.cnpj || '',
          responsible_name: data.responsible_name || '',
          responsible_phone: data.responsible_phone || '',
          responsible_email: data.responsible_email || '',
          settings: {
            notifications: {
              whatsapp: dbSettings.notifications?.whatsapp ?? false,
              email: dbSettings.notifications?.email ?? false,
              marketing: dbSettings.notifications?.marketing ?? false,
            }
          }
        });
      }
    } catch (error) {
      console.error('Erro ao carregar configurações:', error);
      toast.error('Erro ao carregar configurações');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      const { error } = await supabase
        .from('barbershops')
        .update({
          name: settings.name,
          address: settings.address,
          phone: settings.phone,
          email: settings.email,
          cnpj: settings.cnpj,
          responsible_name: settings.responsible_name,
          responsible_phone: settings.responsible_phone,
          responsible_email: settings.responsible_email,
          settings: settings.settings
        })
        .eq('id', barbershopId);

      if (error) throw error;

      toast.success('Configurações salvas com sucesso!');
    } catch (error: any) {
      console.error('Erro ao salvar configurações:', error);
      toast.error('Erro ao salvar configurações');
    } finally {
      setSaving(false);
    }
  };

  // Filter groups and sections based on role
  const visibleGroups = settingsGroups.map(group => ({
    ...group,
    sections: group.sections.filter(section => {
      if (section.id === 'permissions' || section.id === 'audit') {
        return userRole === 'admin' || userRole === 'super_admin';
      }
      return true;
    })
  })).filter(group => group.sections.length > 0);

  // Flat list for mobile navigation
  const allVisibleSections = visibleGroups.flatMap(group => group.sections);

  // Get sections for the active mobile group
  const mobileGroupSections = visibleGroups.find(g => g.label === activeMobileGroup)?.sections || [];

  const renderSectionContent = () => {
    if (loading) {
      return (
        <div className="space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      );
    }

    switch (activeSection) {
      case 'profile':
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-foreground mb-1">Perfil da Barbearia</h2>
              <p className="text-sm text-muted-foreground">Informações básicas do seu estabelecimento</p>
            </div>
            
            {/* Dados do Estabelecimento */}
            <Card className="barbershop-card">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Building2 className="h-4 w-4 text-primary" />
                  Dados do Estabelecimento
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="barbershop-name">Nome da Barbearia</Label>
                    <Input 
                      id="barbershop-name" 
                      value={settings.name}
                      onChange={(e) => setSettings({ ...settings, name: e.target.value })}
                      placeholder="BarberShop Premium"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="barbershop-phone">Telefone</Label>
                    <Input 
                      id="barbershop-phone" 
                      value={settings.phone}
                      onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
                      placeholder="(11) 99999-9999"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="barbershop-address">Endereço</Label>
                  <Input 
                    id="barbershop-address" 
                    value={settings.address}
                    onChange={(e) => setSettings({ ...settings, address: e.target.value })}
                    placeholder="Rua das Flores, 123"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="barbershop-email">Email</Label>
                  <Input 
                    id="barbershop-email" 
                    value={settings.email}
                    onChange={(e) => setSettings({ ...settings, email: e.target.value })}
                    placeholder="contato@barbearia.com"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Dados da Empresa */}
            <Card className="barbershop-card">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Briefcase className="h-4 w-4 text-primary" />
                  Dados da Empresa
                </CardTitle>
                <CardDescription>
                  Informações legais e do responsável
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="cnpj">CNPJ</Label>
                    <CPFCNPJInput 
                      id="cnpj"
                      value={settings.cnpj}
                      onChange={(value) => setSettings({ ...settings, cnpj: value })}
                      placeholder="00.000.000/0000-00"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="responsible-name">Nome do Responsável</Label>
                    <Input 
                      id="responsible-name" 
                      value={settings.responsible_name}
                      onChange={(e) => setSettings({ ...settings, responsible_name: e.target.value })}
                      placeholder="Nome completo do responsável"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="responsible-phone">Telefone do Responsável</Label>
                    <Input 
                      id="responsible-phone" 
                      value={settings.responsible_phone}
                      onChange={(e) => setSettings({ ...settings, responsible_phone: e.target.value })}
                      placeholder="(11) 99999-9999"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="responsible-email">Email do Responsável</Label>
                    <Input 
                      id="responsible-email" 
                      type="email"
                      value={settings.responsible_email}
                      onChange={(e) => setSettings({ ...settings, responsible_email: e.target.value })}
                      placeholder="responsavel@email.com"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Ações */}
            <div className="flex flex-col sm:flex-row justify-between gap-3">
              <Button 
                variant="outline" 
                onClick={() => {
                  resetTour();
                  toast.success('Tour reiniciado! Navegue para o Dashboard para ver o tour.');
                }}
              >
                <RotateCcw className="mr-2 h-4 w-4" />
                Reiniciar Tour
              </Button>
              <Button 
                variant="premium" 
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? 'Salvando...' : <><Save className="mr-2 h-4 w-4" /> Salvar Alterações</>}
              </Button>
            </div>
          </div>
        );

      case 'notifications':
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-foreground mb-1">Notificações</h2>
              <p className="text-sm text-muted-foreground">Configure alertas e mensagens automáticas</p>
            </div>
            <NotificationSettings />
          </div>
        );

      case 'hours':
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-foreground mb-1">Horário de Funcionamento</h2>
              <p className="text-sm text-muted-foreground">Gerencie horários de abertura e fechamento</p>
            </div>
            <Card className="barbershop-card">
              <CardContent className="pt-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                  <div className="flex-1">
                    <h3 className="font-medium text-foreground">Gerenciar Horários</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Configure horários de abertura, fechamento, intervalos para almoço e datas bloqueadas (feriados, folgas).
                    </p>
                  </div>
                  <Button 
                    variant="outline" 
                    onClick={() => navigate('/business-hours')}
                    className="w-full sm:w-auto"
                  >
                    <Clock className="mr-2 h-4 w-4" />
                    Configurar Horários
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        );

      case 'domain':
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-foreground mb-1">Domínio e Link Público</h2>
              <p className="text-sm text-muted-foreground">Configure seu endereço personalizado</p>
            </div>
            <PublicBookingLink />
            <DomainSettings />
          </div>
        );

      case 'portfolio':
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-foreground mb-1">Portfólio</h2>
              <p className="text-sm text-muted-foreground">Mostre seu trabalho na página pública</p>
            </div>
            <PortfolioGalleryManager />
          </div>
        );

      case 'landing':
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-foreground mb-1">Landing Page</h2>
              <p className="text-sm text-muted-foreground">Configure sua página pública com templates</p>
            </div>
            <LandingPageBuilder />
          </div>
        );

      case 'branding':
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-foreground mb-1">Identidade Visual</h2>
              <p className="text-sm text-muted-foreground">Personalize cores, logos e tema do sistema</p>
            </div>
            <FeatureGate 
              feature="white_label"
              upgradeMessage="O branding personalizado está disponível apenas para planos com White-Label. Faça upgrade para personalizar completamente a identidade visual do seu sistema."
            >
              <BarbershopBrandingConfig />
            </FeatureGate>
          </div>
        );

      case 'permissions':
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-foreground mb-1">Permissões por Cargo</h2>
              <p className="text-sm text-muted-foreground">Controle o acesso de cada função</p>
            </div>
            <RolePermissionsConfig />
          </div>
        );

      case 'whatsapp':
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-foreground mb-1">Configurações WhatsApp</h2>
              <p className="text-sm text-muted-foreground">Configure APIs de integração para mensagens</p>
            </div>
            <FeatureGate 
              feature="whatsapp_notifications"
              upgradeMessage="As notificações via WhatsApp não estão disponíveis no seu plano atual. Faça upgrade para enviar mensagens automáticas."
            >
              <WhatsAppSettingsSection />
            </FeatureGate>
          </div>
        );

      case 'chatbot':
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-foreground mb-1">Chatbot IA</h2>
              <p className="text-sm text-muted-foreground">Configure o assistente virtual para WhatsApp</p>
            </div>
            <FeatureGate 
              feature="whatsapp_chatbot"
              upgradeMessage="O Chatbot IA não está disponível no seu plano atual. Faça upgrade para automatizar agendamentos via WhatsApp."
            >
              <ChatbotSettingsSection />
            </FeatureGate>
          </div>
        );

      case 'audit':
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-foreground mb-1">Logs de Auditoria</h2>
              <p className="text-sm text-muted-foreground">Acompanhe atividades e alterações no sistema</p>
            </div>
            <FeatureGate 
              feature="audit_logs"
              upgradeMessage="Os logs de auditoria não estão disponíveis no seu plano atual. Faça upgrade para acompanhar todas as atividades."
            >
              <Card className="barbershop-card">
                <CardContent className="pt-6">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                    <div className="flex-1">
                      <h3 className="font-medium text-foreground">Ver Logs de Auditoria</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        Acompanhe todas as alterações, acessos e atividades realizadas no sistema.
                      </p>
                    </div>
                    <Button 
                      variant="outline" 
                      onClick={() => navigate('/audit')}
                      className="w-full sm:w-auto"
                    >
                      <FileText className="mr-2 h-4 w-4" />
                      Abrir Auditoria
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </FeatureGate>
          </div>
        );

      case 'payments':
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-foreground mb-1">Configurações de Pagamento</h2>
              <p className="text-sm text-muted-foreground">Configure integração com Mercado Pago</p>
            </div>
            <PaymentSettingsSection />
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <>
      <div className="space-y-4 sm:space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground">Configurações</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">Personalize sua experiência</p>
        </div>

        {/* Mobile Navigation */}
        <div className="lg:hidden space-y-3">
          {/* Group Filter Chips */}
          <ScrollArea className="w-full" type="scroll">
            <div className="flex gap-2 pb-3">
              {visibleGroups.map((group) => (
                <button
                  key={group.label}
                  onClick={() => setActiveMobileGroup(group.label)}
                  className={cn(
                    "px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all border flex-shrink-0",
                    activeMobileGroup === group.label
                      ? "bg-primary text-primary-foreground border-primary shadow-sm"
                      : "bg-background text-muted-foreground border-border hover:border-primary/50 hover:text-foreground"
                  )}
                >
                  {group.label}
                </button>
              ))}
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
          
          {/* Section Buttons within Selected Group */}
          <ScrollArea className="w-full" type="scroll">
            <div className="flex gap-2 pb-3">
              {mobileGroupSections.map((section) => {
                const Icon = section.icon;
                return (
                  <button
                    key={section.id}
                    onClick={() => setActiveSection(section.id)}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all flex-shrink-0",
                      activeSection === section.id
                        ? "bg-primary text-primary-foreground shadow-md"
                        : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {section.label}
                  </button>
                );
              })}
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </div>

        {/* Desktop Layout */}
        <div className="flex gap-6">
          {/* Desktop Sidebar */}
          <aside className="hidden lg:block w-64 shrink-0">
            <Card className="barbershop-card sticky top-6">
              <CardContent className="p-3">
                <nav className="space-y-4">
                  {visibleGroups.map((group, groupIndex) => (
                    <div key={group.label}>
                      {groupIndex > 0 && (
                        <div className="border-t border-border mb-3" />
                      )}
                      <div className="px-3 mb-2">
                        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                          {group.label}
                        </span>
                      </div>
                      <div className="space-y-1">
                        {group.sections.map((section) => {
                          const Icon = section.icon;
                          return (
                            <button
                              key={section.id}
                              onClick={() => setActiveSection(section.id)}
                              className={cn(
                                "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all group",
                                activeSection === section.id
                                  ? "bg-primary/10 text-primary font-medium"
                                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
                              )}
                            >
                              <Icon className={cn(
                                "h-4 w-4 shrink-0",
                                activeSection === section.id ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                              )} />
                              <div className="flex-1 text-left">
                                <div className="font-medium">{section.label}</div>
                                <div className="text-xs text-muted-foreground">{section.description}</div>
                              </div>
                              <ChevronRight className={cn(
                                "h-4 w-4 shrink-0 opacity-0 -translate-x-2 transition-all",
                                activeSection === section.id && "opacity-100 translate-x-0 text-primary"
                              )} />
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </nav>
              </CardContent>
            </Card>
          </aside>

          {/* Content Area */}
          <main className="flex-1 min-w-0">
            {renderSectionContent()}
          </main>
        </div>
      </div>
    </>
  );
};

export default SettingsPage;
