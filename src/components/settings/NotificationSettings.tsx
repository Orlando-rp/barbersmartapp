import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Bell, Save, MessageSquare, CheckCircle, XCircle, Clock, Star } from "lucide-react";
import { toast } from "sonner";

interface NotificationConfig {
  enabled: boolean;
  hours_before?: number;
}

interface NotificationSettingsData {
  appointment_created: NotificationConfig;
  appointment_updated: NotificationConfig;
  appointment_confirmed: NotificationConfig;
  appointment_cancelled: NotificationConfig;
  appointment_reminder: NotificationConfig;
  appointment_completed: NotificationConfig;
}

const defaultSettings: NotificationSettingsData = {
  appointment_created: { enabled: true },
  appointment_updated: { enabled: true },
  appointment_confirmed: { enabled: true },
  appointment_cancelled: { enabled: true },
  appointment_reminder: { enabled: true, hours_before: 24 },
  appointment_completed: { enabled: true },
};

const NotificationSettings = () => {
  const { barbershopId } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<NotificationSettingsData>(defaultSettings);

  useEffect(() => {
    if (barbershopId) {
      fetchSettings();
    }
  }, [barbershopId]);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('barbershops')
        .select('settings')
        .eq('id', barbershopId)
        .single();

      if (error) throw error;

      if (data?.settings?.notification_config) {
        setSettings({
          ...defaultSettings,
          ...data.settings.notification_config,
        });
      }
    } catch (error) {
      console.error('Erro ao carregar configurações:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      // Fetch current settings first
      const { data: currentData } = await supabase
        .from('barbershops')
        .select('settings')
        .eq('id', barbershopId)
        .single();

      const currentSettings = currentData?.settings || {};

      const { error } = await supabase
        .from('barbershops')
        .update({
          settings: {
            ...currentSettings,
            notification_config: settings,
          }
        })
        .eq('id', barbershopId);

      if (error) throw error;

      toast.success('Configurações de notificação salvas!');
    } catch (error: any) {
      console.error('Erro ao salvar:', error);
      toast.error('Erro ao salvar configurações');
    } finally {
      setSaving(false);
    }
  };

  const updateSetting = (key: keyof NotificationSettingsData, field: keyof NotificationConfig, value: any) => {
    setSettings(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        [field]: value,
      }
    }));
  };

  const notificationTypes = [
    {
      key: 'appointment_created' as const,
      label: 'Agendamento Criado',
      description: 'Confirmação quando um novo agendamento é criado',
      icon: MessageSquare,
      hasHours: false,
    },
    {
      key: 'appointment_updated' as const,
      label: 'Agendamento Alterado',
      description: 'Notificação quando um agendamento é alterado',
      icon: MessageSquare,
      hasHours: false,
    },
    {
      key: 'appointment_confirmed' as const,
      label: 'Agendamento Confirmado',
      description: 'Notificação quando o profissional confirma',
      icon: CheckCircle,
      hasHours: false,
    },
    {
      key: 'appointment_cancelled' as const,
      label: 'Agendamento Cancelado',
      description: 'Notificação quando um agendamento é cancelado',
      icon: XCircle,
      hasHours: false,
    },
    {
      key: 'appointment_reminder' as const,
      label: 'Lembrete de Agendamento',
      description: 'Lembrete enviado antes do horário marcado',
      icon: Clock,
      hasHours: true,
    },
    {
      key: 'appointment_completed' as const,
      label: 'Pesquisa de Satisfação',
      description: 'Mensagem após conclusão do serviço',
      icon: Star,
      hasHours: false,
    },
  ];

  if (loading) {
    return (
      <Card className="barbershop-card">
        <CardContent className="flex items-center justify-center py-8">
          <LoadingSpinner size="lg" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="barbershop-card">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
              <Bell className="h-4 w-4 sm:h-5 sm:w-5 text-primary shrink-0" />
              Configurações de Notificações
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm mt-1">
              Configure quais notificações serão enviadas e a antecedência dos lembretes
            </CardDescription>
          </div>
          <Button
            variant="premium"
            size="sm"
            onClick={handleSave}
            disabled={saving}
            className="shrink-0"
          >
            {saving ? <LoadingSpinner size="sm" /> : <Save className="mr-2 h-4 w-4" />}
            Salvar
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {notificationTypes.map((type) => {
          const Icon = type.icon;
          const setting = settings[type.key];
          
          return (
            <div
              key={type.key}
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 border rounded-lg"
            >
              <div className="flex items-start gap-3 min-w-0 flex-1">
                <Icon className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <Label className="text-sm font-medium">{type.label}</Label>
                  <p className="text-xs text-muted-foreground">{type.description}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3 ml-8 sm:ml-0">
                {type.hasHours && setting.enabled && (
                  <Select
                    value={String(setting.hours_before || 24)}
                    onValueChange={(value) => updateSetting(type.key, 'hours_before', parseInt(value))}
                  >
                    <SelectTrigger className="w-28 h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 hora</SelectItem>
                      <SelectItem value="2">2 horas</SelectItem>
                      <SelectItem value="3">3 horas</SelectItem>
                      <SelectItem value="6">6 horas</SelectItem>
                      <SelectItem value="12">12 horas</SelectItem>
                      <SelectItem value="24">24 horas</SelectItem>
                      <SelectItem value="48">48 horas</SelectItem>
                      <SelectItem value="72">72 horas</SelectItem>
                    </SelectContent>
                  </Select>
                )}
                <Switch
                  checked={setting.enabled}
                  onCheckedChange={(checked) => updateSetting(type.key, 'enabled', checked)}
                />
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};

export default NotificationSettings;
