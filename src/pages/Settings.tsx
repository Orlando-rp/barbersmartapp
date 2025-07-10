import Layout from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Settings, Save, User, Bell, Shield, Palette } from "lucide-react";

const SettingsPage = () => {
  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Configurações</h1>
            <p className="text-muted-foreground">Personalize sua experiência no BarberSmart</p>
          </div>
          <Button variant="premium" size="lg">
            <Save className="mr-2 h-5 w-5" />
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
                <Input id="barbershop-name" placeholder="BarberShop Premium" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="barbershop-address">Endereço</Label>
                <Input id="barbershop-address" placeholder="Rua das Flores, 123" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="barbershop-phone">Telefone</Label>
                <Input id="barbershop-phone" placeholder="(11) 99999-9999" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="barbershop-email">Email</Label>
                <Input id="barbershop-email" placeholder="contato@barbearia.com" />
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
                <Switch id="whatsapp-notifications" />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="email-notifications">Email</Label>
                  <p className="text-sm text-muted-foreground">Receber notificações por email</p>
                </div>
                <Switch id="email-notifications" />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="marketing-emails">Marketing</Label>
                  <p className="text-sm text-muted-foreground">Receber emails promocionais</p>
                </div>
                <Switch id="marketing-emails" />
              </div>
            </CardContent>
          </Card>

          {/* Business Hours */}
          <Card className="barbershop-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5 text-primary" />
                Horário de Funcionamento
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label className="text-sm">Dia</Label>
                </div>
                <div>
                  <Label className="text-sm">Abertura</Label>
                </div>
                <div>
                  <Label className="text-sm">Fechamento</Label>
                </div>
              </div>
              {['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'].map((day) => (
                <div key={day} className="grid grid-cols-3 gap-4 items-center">
                  <Label className="text-sm">{day}</Label>
                  <Input type="time" defaultValue="09:00" />
                  <Input type="time" defaultValue="18:00" />
                </div>
              ))}
              <div className="grid grid-cols-3 gap-4 items-center">
                <Label className="text-sm">Domingo</Label>
                <span className="text-sm text-muted-foreground col-span-2">Fechado</span>
              </div>
            </CardContent>
          </Card>

          {/* Security Settings */}
          <Card className="barbershop-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                Segurança
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="current-password">Senha Atual</Label>
                <Input id="current-password" type="password" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-password">Nova Senha</Label>
                <Input id="new-password" type="password" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirmar Senha</Label>
                <Input id="confirm-password" type="password" />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="two-factor">Autenticação em Duas Etapas</Label>
                  <p className="text-sm text-muted-foreground">Adicionar camada extra de segurança</p>
                </div>
                <Switch id="two-factor" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default SettingsPage;