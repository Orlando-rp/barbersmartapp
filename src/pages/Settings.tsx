import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import Layout from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Settings, Save, User, Bell, Shield } from "lucide-react";
import { toast } from "sonner";

interface BarbershopSettings {
  name: string;
  address: string;
  phone: string;
  email: string;
  settings: {
    opening_hours: Record<string, { open: string; close: string }>;
    notifications: {
      whatsapp: boolean;
      email: boolean;
      marketing: boolean;
    };
  };
}

const daysOfWeek = [
  { key: 'monday', label: 'Segunda' },
  { key: 'tuesday', label: 'Terça' },
  { key: 'wednesday', label: 'Quarta' },
  { key: 'thursday', label: 'Quinta' },
  { key: 'friday', label: 'Sexta' },
  { key: 'saturday', label: 'Sábado' },
];

const SettingsPage = () => {
  const { barbershopId } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<BarbershopSettings>({
    name: '',
    address: '',
    phone: '',
    email: '',
    settings: {
      opening_hours: {
        monday: { open: '09:00', close: '18:00' },
        tuesday: { open: '09:00', close: '18:00' },
        wednesday: { open: '09:00', close: '18:00' },
        thursday: { open: '09:00', close: '18:00' },
        friday: { open: '09:00', close: '18:00' },
        saturday: { open: '09:00', close: '18:00' },
      },
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

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('barbershops')
        .select('name, address, phone, email, settings')
        .eq('id', barbershopId)
        .single();

      if (error) throw error;

      if (data) {
        setSettings({
          name: data.name || '',
          address: data.address || '',
          phone: data.phone || '',
          email: data.email || '',
          settings: data.settings || settings.settings
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

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-96">
          <LoadingSpinner size="lg" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Configurações</h1>
            <p className="text-muted-foreground">Personalize sua experiência no BarberSmart</p>
          </div>
          <Button 
            variant="premium" 
            size="lg"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? <LoadingSpinner size="sm" /> : <Save className="mr-2 h-5 w-5" />}
            Salvar Alterações
          </Button>
        </div>

        {/* Settings Sections */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Profile Settings */}
          <Card className="barbershop-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5 text-primary" />
                Perfil da Barbearia
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
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
                <Label htmlFor="barbershop-address">Endereço</Label>
                <Input 
                  id="barbershop-address" 
                  value={settings.address}
                  onChange={(e) => setSettings({ ...settings, address: e.target.value })}
                  placeholder="Rua das Flores, 123" 
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

          {/* Notification Settings */}
          <Card className="barbershop-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-primary" />
                Notificações
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="whatsapp-notifications">WhatsApp</Label>
                  <p className="text-sm text-muted-foreground">Receber notificações via WhatsApp</p>
                </div>
                <Switch 
                  id="whatsapp-notifications"
                  checked={settings.settings.notifications.whatsapp}
                  onCheckedChange={(checked) => 
                    setSettings({
                      ...settings,
                      settings: {
                        ...settings.settings,
                        notifications: {
                          ...settings.settings.notifications,
                          whatsapp: checked
                        }
                      }
                    })
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="email-notifications">Email</Label>
                  <p className="text-sm text-muted-foreground">Receber notificações por email</p>
                </div>
                <Switch 
                  id="email-notifications"
                  checked={settings.settings.notifications.email}
                  onCheckedChange={(checked) => 
                    setSettings({
                      ...settings,
                      settings: {
                        ...settings.settings,
                        notifications: {
                          ...settings.settings.notifications,
                          email: checked
                        }
                      }
                    })
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="marketing-emails">Marketing</Label>
                  <p className="text-sm text-muted-foreground">Receber emails promocionais</p>
                </div>
                <Switch 
                  id="marketing-emails"
                  checked={settings.settings.notifications.marketing}
                  onCheckedChange={(checked) => 
                    setSettings({
                      ...settings,
                      settings: {
                        ...settings.settings,
                        notifications: {
                          ...settings.settings.notifications,
                          marketing: checked
                        }
                      }
                    })
                  }
                />
              </div>
            </CardContent>
          </Card>

          {/* Business Hours */}
          <Card className="barbershop-card lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5 text-primary" />
                Horário de Funcionamento
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4 mb-4">
                <Label className="text-sm font-medium">Dia</Label>
                <Label className="text-sm font-medium">Abertura</Label>
                <Label className="text-sm font-medium">Fechamento</Label>
              </div>
              {daysOfWeek.map(({ key, label }) => (
                <div key={key} className="grid grid-cols-3 gap-4 items-center">
                  <Label className="text-sm">{label}</Label>
                  <Input 
                    type="time" 
                    value={settings.settings.opening_hours[key]?.open || '09:00'}
                    onChange={(e) => 
                      setSettings({
                        ...settings,
                        settings: {
                          ...settings.settings,
                          opening_hours: {
                            ...settings.settings.opening_hours,
                            [key]: {
                              ...settings.settings.opening_hours[key],
                              open: e.target.value
                            }
                          }
                        }
                      })
                    }
                  />
                  <Input 
                    type="time" 
                    value={settings.settings.opening_hours[key]?.close || '18:00'}
                    onChange={(e) => 
                      setSettings({
                        ...settings,
                        settings: {
                          ...settings.settings,
                          opening_hours: {
                            ...settings.settings.opening_hours,
                            [key]: {
                              ...settings.settings.opening_hours[key],
                              close: e.target.value
                            }
                          }
                        }
                      })
                    }
                  />
                </div>
              ))}
              <div className="grid grid-cols-3 gap-4 items-center pt-2 border-t">
                <Label className="text-sm">Domingo</Label>
                <span className="text-sm text-muted-foreground col-span-2">Fechado</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default SettingsPage;
