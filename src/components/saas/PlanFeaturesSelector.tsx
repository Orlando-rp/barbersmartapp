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
  Star
} from "lucide-react";

export interface PlanFeatures {
  whatsapp_notifications: boolean;
  whatsapp_chatbot: boolean;
  marketing_campaigns: boolean;
  marketing_coupons: boolean;
  advanced_reports: boolean;
  predictive_analytics: boolean;
  multi_unit: boolean;
  white_label: boolean;
  priority_support: boolean;
}

export const defaultPlanFeatures: PlanFeatures = {
  whatsapp_notifications: true,
  whatsapp_chatbot: false,
  marketing_campaigns: false,
  marketing_coupons: false,
  advanced_reports: false,
  predictive_analytics: false,
  multi_unit: false,
  white_label: false,
  priority_support: false,
};

interface FeatureItem {
  key: keyof PlanFeatures;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  category: 'whatsapp' | 'marketing' | 'reports' | 'advanced';
}

const featuresList: FeatureItem[] = [
  // WhatsApp
  {
    key: 'whatsapp_notifications',
    label: 'Notificações WhatsApp',
    description: 'Lembretes e confirmações automáticas',
    icon: Bell,
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
    label: 'Campanhas de Marketing',
    description: 'Criar e enviar campanhas promocionais',
    icon: Megaphone,
    category: 'marketing',
  },
  {
    key: 'marketing_coupons',
    label: 'Cupons de Desconto',
    description: 'Gerenciar cupons e promoções',
    icon: Star,
    category: 'marketing',
  },
  // Reports
  {
    key: 'advanced_reports',
    label: 'Relatórios Avançados',
    description: 'Métricas detalhadas e exportação',
    icon: BarChart3,
    category: 'reports',
  },
  {
    key: 'predictive_analytics',
    label: 'Análises Preditivas',
    description: 'Previsões de receita e tendências',
    icon: BarChart3,
    category: 'reports',
  },
  // Advanced
  {
    key: 'multi_unit',
    label: 'Multi-unidade',
    description: 'Gerenciar múltiplas barbearias',
    icon: Building2,
    category: 'advanced',
  },
  {
    key: 'white_label',
    label: 'White Label',
    description: 'Personalização de branding',
    icon: Palette,
    category: 'advanced',
  },
  {
    key: 'priority_support',
    label: 'Suporte Prioritário',
    description: 'Atendimento preferencial',
    icon: Users,
    category: 'advanced',
  },
];

const categoryLabels = {
  whatsapp: { label: 'WhatsApp', color: 'bg-success/20 text-success' },
  marketing: { label: 'Marketing', color: 'bg-primary/20 text-primary' },
  reports: { label: 'Relatórios', color: 'bg-warning/20 text-warning' },
  advanced: { label: 'Avançado', color: 'bg-info/20 text-info' },
};

interface PlanFeaturesSelectorProps {
  features: PlanFeatures;
  onChange: (features: PlanFeatures) => void;
}

export const PlanFeaturesSelector = ({ features, onChange }: PlanFeaturesSelectorProps) => {
  const toggleFeature = (key: keyof PlanFeatures) => {
    onChange({
      ...features,
      [key]: !features[key],
    });
  };

  const groupedFeatures = featuresList.reduce((acc, feature) => {
    if (!acc[feature.category]) {
      acc[feature.category] = [];
    }
    acc[feature.category].push(feature);
    return acc;
  }, {} as Record<string, FeatureItem[]>);

  return (
    <div className="space-y-4">
      <Label className="text-foreground text-sm font-medium">Funcionalidades do Plano</Label>
      
      <div className="space-y-4">
        {Object.entries(groupedFeatures).map(([category, categoryFeatures]) => (
          <div key={category} className="space-y-2">
            <Badge className={`${categoryLabels[category as keyof typeof categoryLabels].color} text-xs`}>
              {categoryLabels[category as keyof typeof categoryLabels].label}
            </Badge>
            
            <div className="space-y-2">
              {categoryFeatures.map((feature) => (
                <div 
                  key={feature.key}
                  className="flex items-center justify-between p-2 sm:p-3 bg-muted/50 rounded-lg gap-2"
                >
                  <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                    <feature.icon className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div className="min-w-0">
                      <p className="text-foreground text-sm font-medium truncate">{feature.label}</p>
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
        ))}
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
