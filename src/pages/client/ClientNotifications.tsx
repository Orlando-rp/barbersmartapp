import { useClientAuth } from '@/contexts/ClientAuthContext';
import { ClientLayout } from '@/components/layout/ClientLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MessageCircle, Check, X, Clock, AlertCircle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Skeleton } from '@/components/ui/skeleton';
import { IllustratedEmptyState } from '@/components/ui/illustrated-empty-state';

const statusConfig: Record<string, { label: string; icon: any; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  sent: { label: 'Enviado', icon: Check, variant: 'default' },
  delivered: { label: 'Entregue', icon: Check, variant: 'default' },
  read: { label: 'Lido', icon: Check, variant: 'default' },
  failed: { label: 'Falhou', icon: X, variant: 'destructive' },
  pending: { label: 'Pendente', icon: Clock, variant: 'secondary' },
};

const messageTypeLabels: Record<string, string> = {
  appointment_confirmation: 'Confirmação de Agendamento',
  appointment_reminder: 'Lembrete',
  appointment_cancelled: 'Cancelamento',
  appointment_updated: 'Alteração',
  review_request: 'Pesquisa de Satisfação',
  campaign: 'Campanha',
  otp: 'Código de Acesso',
  custom: 'Mensagem',
};

export default function ClientNotifications() {
  const { client } = useClientAuth();

  // Fetch WhatsApp messages sent to this client
  const { data: messages, isLoading } = useQuery({
    queryKey: ['client-notifications', client?.phone],
    queryFn: async () => {
      if (!client?.phone) return [];

      // Format phone variations
      const phone = client.phone.replace(/\D/g, '');
      const phoneWithCountry = phone.startsWith('55') ? phone : `55${phone}`;

      const { data, error } = await supabase
        .from('whatsapp_logs')
        .select('*')
        .or(`recipient_phone.eq.${phone},recipient_phone.eq.${phoneWithCountry}`)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      return data || [];
    },
    enabled: !!client?.phone,
  });

  return (
    <ClientLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Notificações</h1>
          <p className="text-muted-foreground">Histórico de mensagens enviadas para você</p>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <Skeleton className="h-5 w-1/3 mb-2" />
                  <Skeleton className="h-4 w-full mb-1" />
                  <Skeleton className="h-4 w-2/3" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : messages?.length === 0 ? (
          <IllustratedEmptyState
            illustration="generic"
            title="Nenhuma notificação"
            description="Você ainda não recebeu nenhuma notificação via WhatsApp."
          />
        ) : (
          <div className="space-y-4">
            {messages?.map((message) => {
              const status = statusConfig[message.status] || statusConfig.pending;
              const StatusIcon = status.icon;

              return (
                <Card key={message.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <MessageCircle className="h-4 w-4 text-primary" />
                          <span className="font-medium text-sm">
                            {messageTypeLabels[message.message_type] || 'Mensagem'}
                          </span>
                          <Badge variant={status.variant} className="text-xs">
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {status.label}
                          </Badge>
                        </div>

                        <p className="text-sm text-muted-foreground line-clamp-3">
                          {message.message_content}
                        </p>

                        <p className="text-xs text-muted-foreground mt-2">
                          {format(parseISO(message.created_at), "d 'de' MMMM 'às' HH:mm", { locale: ptBR })}
                        </p>
                      </div>
                    </div>

                    {message.error_message && (
                      <div className="mt-3 p-2 bg-destructive/10 rounded text-xs text-destructive flex items-start gap-2">
                        <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                        <span>{message.error_message}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </ClientLayout>
  );
}
