import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { 
  MessageSquare, 
  Megaphone, 
  BarChart3, 
  Building2,
  Bot,
  Bell,
  Users,
  Palette,
  Star,
  Calendar,
  Scissors,
  UserCog,
  DollarSign,
  ListChecks,
  Wallet,
  Clock,
  Shield,
  FileText,
  Globe,
  History,
  Download,
  HeadphonesIcon,
  Zap,
} from "lucide-react";

export interface PlanFeatures {
  // Módulos Básicos
  appointments: boolean;
  clients: boolean;
  services: boolean;
  staff_basic: boolean;
  finance_basic: boolean;
  
  // Agendamento Avançado
  waitlist: boolean;
  public_booking: boolean;
  business_hours: boolean;
  
  // Gestão de Equipe
  staff_advanced: boolean;
  staff_earnings: boolean;
  staff_multi_unit: boolean;
  
  // Financeiro
  finance_advanced: boolean;
  commissions: boolean;
  export_data: boolean;
  
  // Relatórios
  basic_reports: boolean;
  advanced_reports: boolean;
  predictive_analytics: boolean;
  
  // WhatsApp
  whatsapp_notifications: boolean;
  whatsapp_chat: boolean;
  whatsapp_chatbot: boolean;
  
  // Marketing
  marketing_campaigns: boolean;
  marketing_coupons: boolean;
  loyalty_program: boolean;
  
  // Avaliações e Clientes
  reviews: boolean;
  client_history: boolean;
  
  // Multi-unidade
  multi_unit: boolean;
  multi_unit_reports: boolean;
  
  // Avançado / Enterprise
  white_label: boolean;
  custom_domain: boolean;
  audit_logs: boolean;
  priority_support: boolean;
  api_access: boolean;
}

export const defaultPlanFeatures: PlanFeatures = {
  // Básicos - habilitados por padrão
  appointments: true,
  clients: true,
  services: true,
  staff_basic: true,
  finance_basic: true,
  
  // Agendamento Avançado
  waitlist: false,
  public_booking: true,
  business_hours: true,
  
  // Gestão de Equipe
  staff_advanced: false,
  staff_earnings: false,
  staff_multi_unit: false,
  
  // Financeiro
  finance_advanced: false,
  commissions: false,
  export_data: false,
  
  // Relatórios
  basic_reports: true,
  advanced_reports: false,
  predictive_analytics: false,
  
  // WhatsApp
  whatsapp_notifications: false,
  whatsapp_chat: false,
  whatsapp_chatbot: false,
  
  // Marketing
  marketing_campaigns: false,
  marketing_coupons: false,
  loyalty_program: false,
  
  // Avaliações
  reviews: false,
  client_history: false,
  
  // Multi-unidade
  multi_unit: false,
  multi_unit_reports: false,
  
  // Avançado
  white_label: false,
  custom_domain: false,
  audit_logs: false,
  priority_support: false,
  api_access: false,
};

// Planos pré-configurados para facilitar
export const planPresets = {
  free: {
    ...defaultPlanFeatures,
  },
  starter: {
    ...defaultPlanFeatures,
    waitlist: true,
    basic_reports: true,
    reviews: true,
    client_history: true,
  },
  professional: {
    ...defaultPlanFeatures,
    waitlist: true,
    staff_advanced: true,
    staff_earnings: true,
    finance_advanced: true,
    commissions: true,
    export_data: true,
    basic_reports: true,
    advanced_reports: true,
    whatsapp_notifications: true,
    whatsapp_chat: true,
    marketing_campaigns: true,
    marketing_coupons: true,
    reviews: true,
    client_history: true,
    audit_logs: true,
  },
  business: {
    ...defaultPlanFeatures,
    waitlist: true,
    staff_advanced: true,
    staff_earnings: true,
    staff_multi_unit: true,
    finance_advanced: true,
    commissions: true,
    export_data: true,
    basic_reports: true,
    advanced_reports: true,
    predictive_analytics: true,
    whatsapp_notifications: true,
    whatsapp_chat: true,
    whatsapp_chatbot: true,
    marketing_campaigns: true,
    marketing_coupons: true,
    loyalty_program: true,
    reviews: true,
    client_history: true,
    multi_unit: true,
    multi_unit_reports: true,
    custom_domain: true,
    audit_logs: true,
    priority_support: true,
  },
  enterprise: {
    appointments: true,
    clients: true,
    services: true,
    staff_basic: true,
    finance_basic: true,
    waitlist: true,
    public_booking: true,
    business_hours: true,
    staff_advanced: true,
    staff_earnings: true,
    staff_multi_unit: true,
    finance_advanced: true,
    commissions: true,
    export_data: true,
    basic_reports: true,
    advanced_reports: true,
    predictive_analytics: true,
    whatsapp_notifications: true,
    whatsapp_chat: true,
    whatsapp_chatbot: true,
    marketing_campaigns: true,
    marketing_coupons: true,
    loyalty_program: true,
    reviews: true,
    client_history: true,
    multi_unit: true,
    multi_unit_reports: true,
    white_label: true,
    custom_domain: true,
    audit_logs: true,
    priority_support: true,
    api_access: true,
  },
};

interface FeatureItem {
  key: keyof PlanFeatures;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  category: 'basic' | 'scheduling' | 'staff' | 'finance' | 'reports' | 'whatsapp' | 'marketing' | 'clients' | 'multi_unit' | 'enterprise';
  isCore?: boolean; // Features essenciais que geralmente não são desabilitadas
}

const featuresList: FeatureItem[] = [
  // Módulos Básicos (Core)
  {
    key: 'appointments',
    label: 'Agendamentos',
    description: 'Gestão de agendamentos e calendário',
    icon: Calendar,
    category: 'basic',
    isCore: true,
  },
  {
    key: 'clients',
    label: 'Clientes',
    description: 'Cadastro e gestão de clientes',
    icon: Users,
    category: 'basic',
    isCore: true,
  },
  {
    key: 'services',
    label: 'Serviços',
    description: 'Catálogo de serviços',
    icon: Scissors,
    category: 'basic',
    isCore: true,
  },
  {
    key: 'staff_basic',
    label: 'Equipe Básico',
    description: 'Cadastro básico de profissionais',
    icon: UserCog,
    category: 'basic',
    isCore: true,
  },
  {
    key: 'finance_basic',
    label: 'Financeiro Básico',
    description: 'Controle básico de receitas',
    icon: DollarSign,
    category: 'basic',
    isCore: true,
  },

  // Agendamento Avançado
  {
    key: 'waitlist',
    label: 'Lista de Espera',
    description: 'Gerenciar fila de espera para horários',
    icon: ListChecks,
    category: 'scheduling',
  },
  {
    key: 'public_booking',
    label: 'Agendamento Online',
    description: 'Página pública para agendamentos',
    icon: Globe,
    category: 'scheduling',
  },
  {
    key: 'business_hours',
    label: 'Horários Customizados',
    description: 'Configuração avançada de horários',
    icon: Clock,
    category: 'scheduling',
  },

  // Gestão de Equipe
  {
    key: 'staff_advanced',
    label: 'Equipe Avançado',
    description: 'Escalas, especialidades e métricas',
    icon: UserCog,
    category: 'staff',
  },
  {
    key: 'staff_earnings',
    label: 'Ganhos da Equipe',
    description: 'Dashboard de ganhos por profissional',
    icon: Wallet,
    category: 'staff',
  },
  {
    key: 'staff_multi_unit',
    label: 'Equipe Multi-unidade',
    description: 'Profissionais em múltiplas unidades',
    icon: Building2,
    category: 'staff',
  },

  // Financeiro
  {
    key: 'finance_advanced',
    label: 'Financeiro Avançado',
    description: 'Despesas, categorias e análises',
    icon: DollarSign,
    category: 'finance',
  },
  {
    key: 'commissions',
    label: 'Comissões',
    description: 'Cálculo automático de comissões',
    icon: Wallet,
    category: 'finance',
  },
  {
    key: 'export_data',
    label: 'Exportar Dados',
    description: 'Exportar relatórios em Excel/PDF',
    icon: Download,
    category: 'finance',
  },

  // Relatórios
  {
    key: 'basic_reports',
    label: 'Relatórios Básicos',
    description: 'Visão geral de vendas e serviços',
    icon: BarChart3,
    category: 'reports',
  },
  {
    key: 'advanced_reports',
    label: 'Relatórios Avançados',
    description: 'Métricas detalhadas e tendências',
    icon: BarChart3,
    category: 'reports',
  },
  {
    key: 'predictive_analytics',
    label: 'Análises Preditivas',
    description: 'Previsões com IA',
    icon: Zap,
    category: 'reports',
  },

  // WhatsApp
  {
    key: 'whatsapp_notifications',
    label: 'Notificações WhatsApp',
    description: 'Lembretes automáticos',
    icon: Bell,
    category: 'whatsapp',
  },
  {
    key: 'whatsapp_chat',
    label: 'Chat WhatsApp',
    description: 'Conversar com clientes',
    icon: MessageSquare,
    category: 'whatsapp',
  },
  {
    key: 'whatsapp_chatbot',
    label: 'Chatbot IA',
    description: 'Agendamento automático via WhatsApp',
    icon: Bot,
    category: 'whatsapp',
  },

  // Marketing
  {
    key: 'marketing_campaigns',
    label: 'Campanhas',
    description: 'Criar campanhas promocionais',
    icon: Megaphone,
    category: 'marketing',
  },
  {
    key: 'marketing_coupons',
    label: 'Cupons',
    description: 'Gerenciar cupons de desconto',
    icon: Star,
    category: 'marketing',
  },
  {
    key: 'loyalty_program',
    label: 'Programa de Fidelidade',
    description: 'Sistema de pontos e recompensas',
    icon: Star,
    category: 'marketing',
  },

  // Clientes
  {
    key: 'reviews',
    label: 'Avaliações',
    description: 'Sistema de avaliações de clientes',
    icon: Star,
    category: 'clients',
  },
  {
    key: 'client_history',
    label: 'Histórico de Clientes',
    description: 'Histórico detalhado por cliente',
    icon: History,
    category: 'clients',
  },

  // Multi-unidade
  {
    key: 'multi_unit',
    label: 'Multi-unidade',
    description: 'Gerenciar múltiplas barbearias',
    icon: Building2,
    category: 'multi_unit',
  },
  {
    key: 'multi_unit_reports',
    label: 'Relatórios Multi-unidade',
    description: 'Comparativos entre unidades',
    icon: BarChart3,
    category: 'multi_unit',
  },

  // Enterprise
  {
    key: 'white_label',
    label: 'White Label',
    description: 'Personalização completa de marca',
    icon: Palette,
    category: 'enterprise',
  },
  {
    key: 'custom_domain',
    label: 'Domínio Personalizado',
    description: 'Usar seu próprio domínio',
    icon: Globe,
    category: 'enterprise',
  },
  {
    key: 'audit_logs',
    label: 'Logs de Auditoria',
    description: 'Histórico de ações no sistema',
    icon: Shield,
    category: 'enterprise',
  },
  {
    key: 'priority_support',
    label: 'Suporte Prioritário',
    description: 'Atendimento preferencial',
    icon: HeadphonesIcon,
    category: 'enterprise',
  },
  {
    key: 'api_access',
    label: 'Acesso à API',
    description: 'Integração via API',
    icon: FileText,
    category: 'enterprise',
  },
];

const categoryLabels = {
  basic: { label: 'Módulos Básicos', color: 'bg-muted text-muted-foreground' },
  scheduling: { label: 'Agendamento', color: 'bg-primary/20 text-primary' },
  staff: { label: 'Equipe', color: 'bg-chart-2/20 text-chart-2' },
  finance: { label: 'Financeiro', color: 'bg-success/20 text-success' },
  reports: { label: 'Relatórios', color: 'bg-warning/20 text-warning' },
  whatsapp: { label: 'WhatsApp', color: 'bg-chart-3/20 text-chart-3' },
  marketing: { label: 'Marketing', color: 'bg-chart-4/20 text-chart-4' },
  clients: { label: 'Clientes', color: 'bg-chart-5/20 text-chart-5' },
  multi_unit: { label: 'Multi-unidade', color: 'bg-info/20 text-info' },
  enterprise: { label: 'Enterprise', color: 'bg-destructive/20 text-destructive' },
};

interface PlanFeaturesSelectorProps {
  features: PlanFeatures;
  onChange: (features: PlanFeatures) => void;
  showPresets?: boolean;
}

export const PlanFeaturesSelector = ({ features, onChange, showPresets = true }: PlanFeaturesSelectorProps) => {
  const toggleFeature = (key: keyof PlanFeatures) => {
    onChange({
      ...features,
      [key]: !features[key],
    });
  };

  const applyPreset = (preset: keyof typeof planPresets) => {
    onChange(planPresets[preset]);
  };

  const groupedFeatures = featuresList.reduce((acc, feature) => {
    if (!acc[feature.category]) {
      acc[feature.category] = [];
    }
    acc[feature.category].push(feature);
    return acc;
  }, {} as Record<string, FeatureItem[]>);

  const categoryOrder = ['basic', 'scheduling', 'staff', 'finance', 'reports', 'whatsapp', 'marketing', 'clients', 'multi_unit', 'enterprise'];

  const enabledCount = Object.values(features).filter(Boolean).length;
  const totalCount = Object.keys(features).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-foreground text-sm font-medium">
          Funcionalidades do Plano ({enabledCount}/{totalCount})
        </Label>
      </div>

      {/* Presets */}
      {showPresets && (
        <div className="flex flex-wrap gap-2 pb-2">
          <Badge 
            variant="outline" 
            className="cursor-pointer hover:bg-muted"
            onClick={() => applyPreset('free')}
          >
            Free
          </Badge>
          <Badge 
            variant="outline" 
            className="cursor-pointer hover:bg-muted"
            onClick={() => applyPreset('starter')}
          >
            Starter
          </Badge>
          <Badge 
            variant="outline" 
            className="cursor-pointer hover:bg-muted"
            onClick={() => applyPreset('professional')}
          >
            Professional
          </Badge>
          <Badge 
            variant="outline" 
            className="cursor-pointer hover:bg-muted"
            onClick={() => applyPreset('business')}
          >
            Business
          </Badge>
          <Badge 
            variant="outline" 
            className="cursor-pointer hover:bg-muted"
            onClick={() => applyPreset('enterprise')}
          >
            Enterprise
          </Badge>
        </div>
      )}
      
      <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
        {categoryOrder.map(category => {
          const categoryFeatures = groupedFeatures[category];
          if (!categoryFeatures) return null;
          
          return (
            <div key={category} className="space-y-2">
              <Badge className={`${categoryLabels[category as keyof typeof categoryLabels].color} text-xs`}>
                {categoryLabels[category as keyof typeof categoryLabels].label}
              </Badge>
              
              <div className="space-y-1">
                {categoryFeatures.map((feature) => (
                  <div 
                    key={feature.key}
                    className="flex items-center justify-between p-2 sm:p-3 bg-muted/50 rounded-lg gap-2"
                  >
                    <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                      <feature.icon className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div className="min-w-0">
                        <p className="text-foreground text-sm font-medium truncate">
                          {feature.label}
                          {feature.isCore && (
                            <span className="ml-1 text-xs text-muted-foreground">(essencial)</span>
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground hidden sm:block">{feature.description}</p>
                      </div>
                    </div>
                    <Switch
                      checked={features[feature.key]}
                      onCheckedChange={() => toggleFeature(feature.key)}
                    />
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Helper function to convert features object to array of strings for display
export const featuresToStringArray = (features: PlanFeatures): string[] => {
  return featuresList
    .filter(f => features[f.key])
    .map(f => f.label);
};

// Helper function to convert string array to features object (for backwards compatibility)
export const stringArrayToFeatures = (arr: string[]): PlanFeatures => {
  const result = { ...defaultPlanFeatures };
  
  arr.forEach(str => {
    const feature = featuresList.find(f => 
      f.label.toLowerCase() === str.toLowerCase() ||
      str.toLowerCase().includes(f.label.toLowerCase().split(' ')[0])
    );
    if (feature) {
      result[feature.key] = true;
    }
  });
  
  return result;
};

// Get feature label by key
export const getFeatureLabel = (key: keyof PlanFeatures): string => {
  const feature = featuresList.find(f => f.key === key);
  return feature?.label || key;
};
