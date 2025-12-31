import { useState } from 'react';
import { useClientAuth } from '@/contexts/ClientAuthContext';
import { ClientLayout } from '@/components/layout/ClientLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { ClientAvatar } from '@/components/ui/smart-avatar';
import { User, Phone, Mail, Calendar, Bell, Save, Loader2 } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { format } from 'date-fns';

export default function ClientProfile() {
  const { client, refreshClient } = useClientAuth();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    name: client?.name || '',
    preferred_name: client?.preferred_name || '',
    email: client?.email || '',
    phone: client?.phone || '',
    birth_date: client?.birth_date || '',
  });

  const [notifications, setNotifications] = useState({
    notification_enabled: client?.notification_enabled ?? true,
    appointment_created: client?.notification_types?.appointment_created ?? true,
    appointment_updated: client?.notification_types?.appointment_updated ?? true,
    appointment_confirmed: client?.notification_types?.appointment_confirmed ?? true,
    appointment_cancelled: client?.notification_types?.appointment_cancelled ?? true,
    appointment_completed: client?.notification_types?.appointment_completed ?? true,
    appointment_reminder: client?.notification_types?.appointment_reminder ?? true,
  });

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!client?.id) throw new Error('Cliente não encontrado');

      const { error } = await supabase
        .from('clients')
        .update({
          name: formData.name,
          preferred_name: formData.preferred_name || null,
          email: formData.email || null,
          birth_date: formData.birth_date || null,
          notification_enabled: notifications.notification_enabled,
          notification_types: {
            appointment_created: notifications.appointment_created,
            appointment_updated: notifications.appointment_updated,
            appointment_confirmed: notifications.appointment_confirmed,
            appointment_cancelled: notifications.appointment_cancelled,
            appointment_completed: notifications.appointment_completed,
            appointment_reminder: notifications.appointment_reminder,
          },
        })
        .eq('id', client.id);

      if (error) throw error;
    },
    onSuccess: async () => {
      await refreshClient();
      toast.success('Perfil atualizado com sucesso');
    },
    onError: () => {
      toast.error('Erro ao atualizar perfil');
    },
  });

  const displayName = client?.preferred_name || client?.name || 'Cliente';
  const initials = displayName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

  return (
    <ClientLayout>
      <div className="space-y-6 max-w-2xl mx-auto">
        <div>
          <h1 className="text-2xl font-bold">Meu Perfil</h1>
          <p className="text-muted-foreground">Gerencie suas informações pessoais</p>
        </div>

        {/* Profile Header */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <ClientAvatar
                src={client?.avatar_url}
                fallbackText={displayName}
                size="2xl"
                lazy={false}
              />
              <div>
                <h2 className="text-xl font-semibold">{displayName}</h2>
                <p className="text-muted-foreground">{client?.phone}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Personal Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <User className="h-5 w-5" />
              Informações Pessoais
            </CardTitle>
            <CardDescription>
              Seus dados cadastrais
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Nome Completo</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="preferred_name">Apelido (como prefere ser chamado)</Label>
                <Input
                  id="preferred_name"
                  value={formData.preferred_name}
                  onChange={(e) => setFormData({ ...formData, preferred_name: e.target.value })}
                  placeholder="Ex: João"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="pl-10"
                    placeholder="seu@email.com"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Telefone</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="phone"
                    value={formData.phone}
                    disabled
                    className="pl-10 bg-muted"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  O telefone não pode ser alterado
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="birth_date">Data de Nascimento</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="birth_date"
                  type="date"
                  value={formData.birth_date}
                  onChange={(e) => setFormData({ ...formData, birth_date: e.target.value })}
                  className="pl-10"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notification Preferences */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Preferências de Notificação
            </CardTitle>
            <CardDescription>
              Configure quais notificações você deseja receber via WhatsApp
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="notification_enabled" className="font-medium">
                  Receber Notificações
                </Label>
                <p className="text-sm text-muted-foreground">
                  Ativar ou desativar todas as notificações
                </p>
              </div>
              <Switch
                id="notification_enabled"
                checked={notifications.notification_enabled}
                onCheckedChange={(checked) => 
                  setNotifications({ ...notifications, notification_enabled: checked })
                }
              />
            </div>

            {notifications.notification_enabled && (
              <>
                <Separator />
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="appointment_created">
                      Confirmação de Agendamento
                    </Label>
                    <Switch
                      id="appointment_created"
                      checked={notifications.appointment_created}
                      onCheckedChange={(checked) => 
                        setNotifications({ ...notifications, appointment_created: checked })
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="appointment_reminder">
                      Lembretes
                    </Label>
                    <Switch
                      id="appointment_reminder"
                      checked={notifications.appointment_reminder}
                      onCheckedChange={(checked) => 
                        setNotifications({ ...notifications, appointment_reminder: checked })
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="appointment_updated">
                      Alterações de Agendamento
                    </Label>
                    <Switch
                      id="appointment_updated"
                      checked={notifications.appointment_updated}
                      onCheckedChange={(checked) => 
                        setNotifications({ ...notifications, appointment_updated: checked })
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="appointment_cancelled">
                      Cancelamentos
                    </Label>
                    <Switch
                      id="appointment_cancelled"
                      checked={notifications.appointment_cancelled}
                      onCheckedChange={(checked) => 
                        setNotifications({ ...notifications, appointment_cancelled: checked })
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="appointment_completed">
                      Conclusão de Serviço
                    </Label>
                    <Switch
                      id="appointment_completed"
                      checked={notifications.appointment_completed}
                      onCheckedChange={(checked) => 
                        setNotifications({ ...notifications, appointment_completed: checked })
                      }
                    />
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button 
            onClick={() => updateMutation.mutate()}
            disabled={updateMutation.isPending}
          >
            {updateMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Salvar Alterações
              </>
            )}
          </Button>
        </div>
      </div>
    </ClientLayout>
  );
}
