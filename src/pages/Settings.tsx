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
import { PublicBookingLink } from "@/components/settings/PublicBookingLink";
import DomainSettings from "@/components/settings/DomainSettings";
import PortfolioGalleryManager from "@/components/settings/PortfolioGalleryManager";
import NotificationSettings from "@/components/settings/NotificationSettings";
import BarbershopBrandingConfig from "@/components/settings/BarbershopBrandingConfig";
import { FeatureGate } from "@/components/FeatureGate";
import { Save, User, Bell, Clock, Globe, Image, Sparkles } from "lucide-react";
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
      <div className="space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground">Configurações</h1>
            <p className="text-xs sm:text-sm text-muted-foreground line-clamp-1">Personalize sua experiência</p>
          </div>
          <Button 
            variant="premium" 
            size="sm"
            onClick={handleSave}
            disabled={saving}
            className="w-full sm:w-auto"
          >
            {saving ? <LoadingSpinner size="sm" /> : <Save className="mr-2 h-4 w-4" />}
            Salvar
          </Button>
        </div>

        {/* Public Booking Link */}
        <PublicBookingLink />

        {/* Domain Settings */}
        <DomainSettings />

        {/* Settings Sections */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {/* Profile Settings */}
          <Card className="barbershop-card">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
                <User className="h-4 w-4 sm:h-5 sm:w-5 text-primary shrink-0" />
                Perfil da Barbearia
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 sm:space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="barbershop-name" className="text-xs sm:text-sm">Nome da Barbearia</Label>
                <Input 
                  id="barbershop-name" 
                  value={settings.name}
                  onChange={(e) => setSettings({ ...settings, name: e.target.value })}
                  placeholder="BarberShop Premium"
                  className="h-9 sm:h-10 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="barbershop-address" className="text-xs sm:text-sm">Endereço</Label>
                <Input 
                  id="barbershop-address" 
                  value={settings.address}
                  onChange={(e) => setSettings({ ...settings, address: e.target.value })}
                  placeholder="Rua das Flores, 123"
                  className="h-9 sm:h-10 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="barbershop-phone" className="text-xs sm:text-sm">Telefone</Label>
                <Input 
                  id="barbershop-phone" 
                  value={settings.phone}
                  onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
                  placeholder="(11) 99999-9999"
                  className="h-9 sm:h-10 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="barbershop-email" className="text-xs sm:text-sm">Email</Label>
                <Input 
                  id="barbershop-email" 
                  value={settings.email}
                  onChange={(e) => setSettings({ ...settings, email: e.target.value })}
                  placeholder="contato@barbearia.com"
                  className="h-9 sm:h-10 text-sm"
                />
              </div>
            </CardContent>
          </Card>

          {/* Notification Settings - Full Component */}
          <NotificationSettings />

          {/* Business Hours Link */}
          <Card className="barbershop-card lg:col-span-2">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
                <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-primary shrink-0" />
                Horário de Funcionamento
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-xs sm:text-sm text-muted-foreground">
                Configure horários de abertura, fechamento, intervalos e datas bloqueadas.
              </p>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => navigate('/business-hours')}
                className="w-full sm:w-auto"
              >
                <Clock className="mr-2 h-4 w-4" />
                Gerenciar Horários
              </Button>
            </CardContent>
          </Card>

          {/* Portfolio Gallery */}
          <div className="lg:col-span-2">
            <PortfolioGalleryManager />
          </div>

          {/* White-Label Branding - Protected by FeatureGate */}
          <div className="lg:col-span-2">
            <FeatureGate 
              feature="white_label"
              upgradeMessage="O branding personalizado está disponível apenas para planos com White-Label. Faça upgrade para personalizar completamente a identidade visual do seu sistema."
            >
              <BarbershopBrandingConfig />
            </FeatureGate>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default SettingsPage;
