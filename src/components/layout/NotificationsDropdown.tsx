import { useState, useEffect } from "react";
import { Bell, Calendar, UserPlus, Star, MessageSquare, Check, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface Notification {
  id: string;
  type: 'appointment' | 'client' | 'review' | 'system' | 'waitlist';
  title: string;
  message: string;
  read: boolean;
  created_at: string;
  data?: any;
}

export const NotificationsDropdown = () => {
  const { barbershopId, user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (barbershopId) {
      fetchNotifications();
      subscribeToNotifications();
    }
  }, [barbershopId]);

  const fetchNotifications = async () => {
    try {
      setLoading(true);

      // Buscar notificações reais do sistema
      const notifs: Notification[] = [];

      // 1. Agendamentos pendentes de hoje
      const today = new Date().toISOString().split('T')[0];
      const { data: pendingAppointments } = await supabase
        .from('appointments')
        .select('id, client_name, appointment_time, service_name')
        .eq('barbershop_id', barbershopId)
        .eq('appointment_date', today)
        .eq('status', 'pendente')
        .order('appointment_time', { ascending: true })
        .limit(5);

      if (pendingAppointments && pendingAppointments.length > 0) {
        notifs.push({
          id: 'pending-today',
          type: 'appointment',
          title: 'Agendamentos Pendentes',
          message: `${pendingAppointments.length} agendamento(s) pendente(s) para hoje`,
          read: false,
          created_at: new Date().toISOString(),
          data: { count: pendingAppointments.length }
        });
      }

      // 2. Clientes na lista de espera
      const { data: waitlistItems } = await supabase
        .from('waitlist')
        .select('id, client_name')
        .eq('barbershop_id', barbershopId)
        .eq('status', 'waiting')
        .limit(5);

      if (waitlistItems && waitlistItems.length > 0) {
        notifs.push({
          id: 'waitlist-pending',
          type: 'waitlist',
          title: 'Lista de Espera',
          message: `${waitlistItems.length} cliente(s) aguardando na fila`,
          read: false,
          created_at: new Date().toISOString(),
          data: { count: waitlistItems.length }
        });
      }

      // 3. Novas avaliações (últimas 24h)
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      
      const { data: recentReviews } = await supabase
        .from('reviews')
        .select('id, client_name, rating, created_at')
        .eq('barbershop_id', barbershopId)
        .gte('created_at', yesterday.toISOString())
        .order('created_at', { ascending: false })
        .limit(3);

      if (recentReviews) {
        recentReviews.forEach((review) => {
          notifs.push({
            id: `review-${review.id}`,
            type: 'review',
            title: 'Nova Avaliação',
            message: `${review.client_name} deixou uma avaliação de ${review.rating} estrelas`,
            read: false,
            created_at: review.created_at,
          });
        });
      }

      // 4. Novos clientes (últimas 24h)
      const { data: newClients } = await supabase
        .from('clients')
        .select('id, name, created_at')
        .eq('barbershop_id', barbershopId)
        .gte('created_at', yesterday.toISOString())
        .order('created_at', { ascending: false })
        .limit(3);

      if (newClients) {
        newClients.forEach((client) => {
          notifs.push({
            id: `client-${client.id}`,
            type: 'client',
            title: 'Novo Cliente',
            message: `${client.name} foi cadastrado`,
            read: false,
            created_at: client.created_at,
          });
        });
      }

      // Ordenar por data (mais recentes primeiro)
      notifs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      setNotifications(notifs);
    } catch (error) {
      console.error('Erro ao buscar notificações:', error);
    } finally {
      setLoading(false);
    }
  };

  const subscribeToNotifications = () => {
    // Escutar novos agendamentos em tempo real
    const channel = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'appointments',
          filter: `barbershop_id=eq.${barbershopId}`
        },
        (payload) => {
          const apt = payload.new as any;
          setNotifications(prev => [{
            id: `apt-${apt.id}`,
            type: 'appointment',
            title: 'Novo Agendamento',
            message: `${apt.client_name} agendou ${apt.service_name}`,
            read: false,
            created_at: new Date().toISOString(),
          }, ...prev]);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'reviews',
          filter: `barbershop_id=eq.${barbershopId}`
        },
        (payload) => {
          const review = payload.new as any;
          setNotifications(prev => [{
            id: `review-${review.id}`,
            type: 'review',
            title: 'Nova Avaliação',
            message: `Nova avaliação de ${review.rating} estrelas`,
            read: false,
            created_at: new Date().toISOString(),
          }, ...prev]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const markAsRead = (id: string) => {
    setNotifications(prev => 
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    );
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const clearAll = () => {
    setNotifications([]);
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  const getIcon = (type: Notification['type']) => {
    switch (type) {
      case 'appointment':
        return <Calendar className="h-4 w-4" />;
      case 'client':
        return <UserPlus className="h-4 w-4" />;
      case 'review':
        return <Star className="h-4 w-4" />;
      case 'waitlist':
        return <MessageSquare className="h-4 w-4" />;
      default:
        return <Bell className="h-4 w-4" />;
    }
  };

  const getIconBg = (type: Notification['type']) => {
    switch (type) {
      case 'appointment':
        return 'bg-blue-500/10 text-blue-500';
      case 'client':
        return 'bg-green-500/10 text-green-500';
      case 'review':
        return 'bg-amber-500/10 text-amber-500';
      case 'waitlist':
        return 'bg-purple-500/10 text-purple-500';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 h-5 w-5 bg-primary rounded-full flex items-center justify-center">
              <span className="text-xs text-primary-foreground font-medium">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-80" align="end">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h4 className="font-semibold">Notificações</h4>
          {notifications.length > 0 && (
            <div className="flex items-center gap-2">
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-7 text-xs"
                onClick={markAllAsRead}
              >
                <Check className="h-3 w-3 mr-1" />
                Marcar lidas
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-7 text-xs text-muted-foreground"
                onClick={clearAll}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          )}
        </div>

        <ScrollArea className="h-[300px]">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <Bell className="h-8 w-8 mb-2 opacity-50" />
              <p className="text-sm">Nenhuma notificação</p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={cn(
                    "flex items-start gap-3 px-4 py-3 hover:bg-muted/50 cursor-pointer transition-colors",
                    !notification.read && "bg-primary/5"
                  )}
                  onClick={() => markAsRead(notification.id)}
                >
                  <div className={cn("p-2 rounded-full", getIconBg(notification.type))}>
                    {getIcon(notification.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium truncate">{notification.title}</p>
                      {!notification.read && (
                        <Badge variant="default" className="h-1.5 w-1.5 p-0 rounded-full" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {notification.message}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDistanceToNow(new Date(notification.created_at), {
                        addSuffix: true,
                        locale: ptBR
                      })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        {notifications.length > 0 && (
          <div className="border-t px-4 py-2">
            <p className="text-xs text-center text-muted-foreground">
              {unreadCount > 0 ? `${unreadCount} não lida(s)` : 'Todas lidas'}
            </p>
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
