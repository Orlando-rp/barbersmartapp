import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Card } from "@/components/ui/card";

export const PreferencesForm = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  
  // Preferências de notificação
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [whatsappNotifications, setWhatsappNotifications] = useState(true);
  const [appointmentReminders, setAppointmentReminders] = useState(true);
  const [marketingEmails, setMarketingEmails] = useState(false);

  // Preferências de interface
  const [compactView, setCompactView] = useState(false);
  const [showAvatars, setShowAvatars] = useState(true);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Simular salvamento (implementar integração com banco de dados posteriormente)
    setTimeout(() => {
      toast({
        title: "Preferências salvas!",
        description: "Suas preferências foram atualizadas com sucesso.",
      });
      setLoading(false);
    }, 1000);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card className="p-4 space-y-4">
        <div>
          <h3 className="text-lg font-semibold mb-4">Notificações</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="emailNotifications">Notificações por Email</Label>
                <p className="text-xs text-muted-foreground">
                  Receba atualizações importantes por email
                </p>
              </div>
              <Switch
                id="emailNotifications"
                checked={emailNotifications}
                onCheckedChange={setEmailNotifications}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="whatsappNotifications">Notificações por WhatsApp</Label>
                <p className="text-xs text-muted-foreground">
                  Receba lembretes e atualizações via WhatsApp
                </p>
              </div>
              <Switch
                id="whatsappNotifications"
                checked={whatsappNotifications}
                onCheckedChange={setWhatsappNotifications}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="appointmentReminders">Lembretes de Agendamento</Label>
                <p className="text-xs text-muted-foreground">
                  Receba lembretes antes dos seus compromissos
                </p>
              </div>
              <Switch
                id="appointmentReminders"
                checked={appointmentReminders}
                onCheckedChange={setAppointmentReminders}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="marketingEmails">Emails de Marketing</Label>
                <p className="text-xs text-muted-foreground">
                  Receba novidades, dicas e promoções
                </p>
              </div>
              <Switch
                id="marketingEmails"
                checked={marketingEmails}
                onCheckedChange={setMarketingEmails}
              />
            </div>
          </div>
        </div>
      </Card>

      <Card className="p-4 space-y-4">
        <div>
          <h3 className="text-lg font-semibold mb-4">Interface</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="compactView">Visualização Compacta</Label>
                <p className="text-xs text-muted-foreground">
                  Exibir mais informações em menos espaço
                </p>
              </div>
              <Switch
                id="compactView"
                checked={compactView}
                onCheckedChange={setCompactView}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="showAvatars">Mostrar Fotos de Perfil</Label>
                <p className="text-xs text-muted-foreground">
                  Exibir avatares nas listas e cards
                </p>
              </div>
              <Switch
                id="showAvatars"
                checked={showAvatars}
                onCheckedChange={setShowAvatars}
              />
            </div>
          </div>
        </div>
      </Card>

      <div className="flex justify-end pt-4 border-t">
        <Button type="submit" variant="premium" disabled={loading}>
          {loading ? 'Salvando...' : 'Salvar Preferências'}
        </Button>
      </div>
    </form>
  );
};
