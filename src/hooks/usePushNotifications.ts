import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface PushNotificationState {
  isSupported: boolean;
  permission: NotificationPermission | 'unsupported';
  isSubscribed: boolean;
  loading: boolean;
}

export const usePushNotifications = () => {
  const { user, barbershopId } = useAuth();
  const [state, setState] = useState<PushNotificationState>({
    isSupported: false,
    permission: 'unsupported',
    isSubscribed: false,
    loading: true,
  });

  // Verificar suporte e estado inicial
  useEffect(() => {
    const checkSupport = async () => {
      const isSupported = 'Notification' in window && 'serviceWorker' in navigator;
      
      if (!isSupported) {
        setState({
          isSupported: false,
          permission: 'unsupported',
          isSubscribed: false,
          loading: false,
        });
        return;
      }

      // Service Worker é registrado automaticamente pelo vite-plugin-pwa
      // Aguardar o SW estar pronto
      try {
        await navigator.serviceWorker.ready;
        console.log('[Push] Service Worker pronto');
      } catch (error) {
        console.error('[Push] Erro ao aguardar SW:', error);
      }

      const permission = Notification.permission;
      const isSubscribed = permission === 'granted';

      setState({
        isSupported: true,
        permission,
        isSubscribed,
        loading: false,
      });
    };

    checkSupport();
  }, []);

  // Solicitar permissão para notificações
  const requestPermission = useCallback(async () => {
    if (!state.isSupported) {
      toast.error('Seu navegador não suporta notificações push');
      return false;
    }

    setState(prev => ({ ...prev, loading: true }));

    try {
      const permission = await Notification.requestPermission();
      
      setState(prev => ({
        ...prev,
        permission,
        isSubscribed: permission === 'granted',
        loading: false,
      }));

      if (permission === 'granted') {
        toast.success('Notificações push ativadas!');
        
        // Mostrar notificação de teste
        showNotification({
          title: 'Barber Smart',
          body: 'Notificações push ativadas com sucesso!',
          icon: '/favicon.ico',
        });

        return true;
      } else if (permission === 'denied') {
        toast.error('Permissão para notificações negada');
        return false;
      } else {
        toast.info('Permissão para notificações pendente');
        return false;
      }
    } catch (error) {
      console.error('[Push] Erro ao solicitar permissão:', error);
      setState(prev => ({ ...prev, loading: false }));
      toast.error('Erro ao solicitar permissão');
      return false;
    }
  }, [state.isSupported]);

  // Mostrar notificação local
  const showNotification = useCallback(async (options: {
    title: string;
    body: string;
    icon?: string;
    tag?: string;
    data?: any;
    requireInteraction?: boolean;
    actions?: Array<{ action: string; title: string }>;
  }) => {
    if (!state.isSupported || state.permission !== 'granted') {
      console.log('[Push] Notificações não permitidas');
      return;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      
      await registration.showNotification(options.title, {
        body: options.body,
        icon: options.icon || '/favicon.ico',
        badge: '/favicon.ico',
        tag: options.tag || `notification-${Date.now()}`,
        requireInteraction: options.requireInteraction || false,
        data: options.data || {},
      } as NotificationOptions);

      console.log('[Push] Notificação mostrada');
    } catch (error) {
      console.error('[Push] Erro ao mostrar notificação:', error);
    }
  }, [state.isSupported, state.permission]);

  // Desativar notificações (apenas marca como desativado localmente)
  const disableNotifications = useCallback(() => {
    setState(prev => ({ ...prev, isSubscribed: false }));
    toast.info('Notificações push desativadas');
  }, []);

  return {
    ...state,
    requestPermission,
    showNotification,
    disableNotifications,
  };
};

// Função helper para mostrar notificação de qualquer lugar
export const sendLocalNotification = async (options: {
  title: string;
  body: string;
  icon?: string;
  tag?: string;
  url?: string;
}) => {
  if (!('Notification' in window) || Notification.permission !== 'granted') {
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    
    await registration.showNotification(options.title, {
      body: options.body,
      icon: options.icon || '/favicon.ico',
      badge: '/favicon.ico',
      tag: options.tag || `notification-${Date.now()}`,
      data: { url: options.url || '/' },
    } as NotificationOptions);

    return true;
  } catch (error) {
    console.error('[Push] Erro ao enviar notificação:', error);
    return false;
  }
};
