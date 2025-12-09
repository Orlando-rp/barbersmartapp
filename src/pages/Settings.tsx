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
import { Save, User, Bell, Clock } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

interface BarbershopSettings {
  name: string;
  address: string;
  phone: string;
  email: string;
  settings: {
    notifications: {
      whatsapp: boolean;
      email: boolean;
      marketing: boolean;
    };
  };
}

const SettingsPage = () => {
  const { barbershopId } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<BarbershopSettings>({
    name: '',
    address: '',
    phone: '',
    email: '',
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
        const dbSettings = data.settings || {};
        setSettings({
          name: data.name || '',
          address: data.address || '',
          phone: data.phone || '',
          email: data.email || '',
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
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Configurações</h1>
            <p className="text-sm sm:text-base text-muted-foreground">Personalize sua experiência no BarberSmart</p>
          </div>
          <Button 
            variant="premium" 
            size="default"
            onClick={handleSave}
            disabled={saving}
            className="w-full sm:w-auto"
          >
            {saving ? <LoadingSpinner size="sm" /> : <Save className="mr-2 h-4 w-4" />}
            Salvar
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

          {/* Business Hours Link */}
          <Card className="barbershop-card lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" />
                Horário de Funcionamento
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                Configure os horários de abertura, fechamento, intervalos e datas bloqueadas da barbearia.
              </p>
              <Button 
                variant="outline" 
                onClick={() => navigate('/business-hours')}
                className="w-full sm:w-auto"
              >
                <Clock className="mr-2 h-4 w-4" />
                Gerenciar Horários
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default SettingsPage;
