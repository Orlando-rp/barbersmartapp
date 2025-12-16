import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

// Definição de todas as permissões disponíveis
export interface PermissionDefinition {
  key: string;
  label: string;
  description: string;
  category: string;
}

export const PERMISSION_CATEGORIES = [
  { key: 'geral', label: 'Geral' },
  { key: 'agendamentos', label: 'Agendamentos' },
  { key: 'clientes', label: 'Clientes' },
  { key: 'servicos', label: 'Serviços' },
  { key: 'financeiro', label: 'Financeiro' },
  { key: 'comunicacao', label: 'Comunicação' },
  { key: 'configuracoes', label: 'Configurações' },
];

export const ALL_PERMISSIONS: PermissionDefinition[] = [
  // Geral
  { key: 'dashboard', label: 'Dashboard', description: 'Acesso ao painel principal', category: 'geral' },
  
  // Agendamentos
  { key: 'appointments', label: 'Ver Agendamentos', description: 'Visualizar lista de agendamentos', category: 'agendamentos' },
  { key: 'appointments_create', label: 'Criar Agendamentos', description: 'Criar novos agendamentos', category: 'agendamentos' },
  { key: 'appointments_edit', label: 'Editar Agendamentos', description: 'Modificar agendamentos existentes', category: 'agendamentos' },
  { key: 'appointments_delete', label: 'Excluir Agendamentos', description: 'Remover agendamentos', category: 'agendamentos' },
  { key: 'waitlist', label: 'Lista de Espera', description: 'Acesso à lista de espera', category: 'agendamentos' },
  
  // Clientes
  { key: 'clients', label: 'Ver Clientes', description: 'Visualizar lista de clientes', category: 'clientes' },
  { key: 'clients_create', label: 'Criar Clientes', description: 'Cadastrar novos clientes', category: 'clientes' },
  { key: 'clients_edit', label: 'Editar Clientes', description: 'Modificar dados de clientes', category: 'clientes' },
  
  // Serviços
  { key: 'services', label: 'Ver Serviços', description: 'Visualizar catálogo de serviços', category: 'servicos' },
  
  // Financeiro
  { key: 'meus_ganhos', label: 'Meus Ganhos', description: 'Ver próprias comissões e ganhos', category: 'financeiro' },
  { key: 'finance', label: 'Financeiro Completo', description: 'Acesso total ao módulo financeiro', category: 'financeiro' },
  { key: 'reports', label: 'Relatórios', description: 'Acesso aos relatórios e análises', category: 'financeiro' },
  
  // Comunicação
  { key: 'reviews', label: 'Avaliações', description: 'Ver e gerenciar avaliações', category: 'comunicacao' },
  { key: 'whatsapp', label: 'WhatsApp Config', description: 'Configurações do WhatsApp', category: 'comunicacao' },
  { key: 'whatsapp_chat', label: 'Chat WhatsApp', description: 'Acesso ao chat do WhatsApp', category: 'comunicacao' },
  { key: 'chatbot', label: 'Chatbot IA', description: 'Configurações do chatbot', category: 'comunicacao' },
  { key: 'marketing', label: 'Marketing', description: 'Campanhas e cupons', category: 'comunicacao' },
  
  // Configurações
  { key: 'staff', label: 'Equipe', description: 'Gerenciar membros da equipe', category: 'configuracoes' },
  { key: 'business_hours', label: 'Horários', description: 'Configurar horários de funcionamento', category: 'configuracoes' },
  { key: 'audit', label: 'Auditoria', description: 'Visualizar logs de auditoria', category: 'configuracoes' },
  { key: 'settings', label: 'Configurações', description: 'Configurações gerais', category: 'configuracoes' },
];

// Permissões padrão por role
export const DEFAULT_PERMISSIONS: Record<string, Record<string, boolean>> = {
  barbeiro: {
    dashboard: true,
    appointments: true,
    appointments_create: true,
    appointments_edit: true, // próprios apenas via RLS
    appointments_delete: false,
    waitlist: false,
    clients: true,
    clients_create: false,
    clients_edit: false,
    services: true,
    meus_ganhos: true,
    finance: false,
    reports: false,
    reviews: false,
    whatsapp: false,
    whatsapp_chat: false,
    chatbot: false,
    marketing: false,
    staff: false,
    business_hours: false,
    audit: false,
    settings: true,
  },
  recepcionista: {
    dashboard: true,
    appointments: true,
    appointments_create: true,
    appointments_edit: true,
    appointments_delete: true,
    waitlist: true,
    clients: true,
    clients_create: true,
    clients_edit: true,
    services: true,
    meus_ganhos: false,
    finance: false,
    reports: false,
    reviews: true,
    whatsapp: false,
    whatsapp_chat: true,
    chatbot: false,
    marketing: false,
    staff: false,
    business_hours: false,
    audit: false,
    settings: true,
  },
};

// Mapeamento de rotas para permissões
export const ROUTE_PERMISSIONS: Record<string, string> = {
  '/': 'dashboard',
  '/appointments': 'appointments',
  '/waitlist': 'waitlist',
  '/clients': 'clients',
  '/services': 'services',
  '/staff': 'staff',
  '/finance': 'finance',
  '/meus-ganhos': 'meus_ganhos',
  '/reports': 'reports',
  '/marketing': 'marketing',
  '/reviews': 'reviews',
  '/whatsapp': 'whatsapp',
  '/whatsapp-chat': 'whatsapp_chat',
  '/chatbot': 'chatbot',
  '/business-hours': 'business_hours',
  '/audit': 'audit',
  '/settings': 'settings',
};

interface RolePermissionsData {
  permissions: Record<string, boolean>;
}

export const useRolePermissions = () => {
  const { userRole, barbershopId } = useAuth();
  const [permissions, setPermissions] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPermissions = async () => {
      // Admin e super_admin têm todas as permissões
      if (userRole === 'admin' || userRole === 'super_admin') {
        const allPermissions: Record<string, boolean> = {};
        ALL_PERMISSIONS.forEach(p => {
          allPermissions[p.key] = true;
        });
        setPermissions(allPermissions);
        setLoading(false);
        return;
      }

      // Se não tem role ou barbershop, usa permissões vazias
      if (!userRole || !barbershopId) {
        setPermissions({});
        setLoading(false);
        return;
      }

      try {
        // Buscar permissões customizadas do banco
        const { data, error } = await supabase
          .from('role_permissions')
          .select('permissions')
          .eq('barbershop_id', barbershopId)
          .eq('role', userRole)
          .maybeSingle();

        if (error) {
          console.error('Erro ao buscar permissões:', error);
          // Usar permissões padrão em caso de erro
          setPermissions(DEFAULT_PERMISSIONS[userRole] || {});
        } else if (data?.permissions) {
          // Merge das permissões customizadas com as padrões
          const customPermissions = data.permissions as Record<string, boolean>;
          setPermissions({
            ...DEFAULT_PERMISSIONS[userRole],
            ...customPermissions,
          });
        } else {
          // Sem configuração customizada, usar padrão
          setPermissions(DEFAULT_PERMISSIONS[userRole] || {});
        }
      } catch (err) {
        console.error('Erro ao buscar permissões:', err);
        setPermissions(DEFAULT_PERMISSIONS[userRole] || {});
      } finally {
        setLoading(false);
      }
    };

    fetchPermissions();
  }, [userRole, barbershopId]);

  const hasPermission = useCallback((permission: string): boolean => {
    // Admin e super_admin sempre têm todas as permissões
    if (userRole === 'admin' || userRole === 'super_admin') {
      return true;
    }
    return permissions[permission] === true;
  }, [permissions, userRole]);

  const hasRoutePermission = useCallback((route: string): boolean => {
    // Admin e super_admin sempre têm acesso
    if (userRole === 'admin' || userRole === 'super_admin') {
      return true;
    }
    
    const permission = ROUTE_PERMISSIONS[route];
    if (!permission) return true; // Rotas sem mapeamento são permitidas
    
    return hasPermission(permission);
  }, [hasPermission, userRole]);

  return {
    permissions,
    hasPermission,
    hasRoutePermission,
    loading,
  };
};

// Hook para administradores gerenciarem permissões
export const useRolePermissionsAdmin = () => {
  const { barbershopId } = useAuth();
  const [rolePermissions, setRolePermissions] = useState<Record<string, Record<string, boolean>>>({
    barbeiro: { ...DEFAULT_PERMISSIONS.barbeiro },
    recepcionista: { ...DEFAULT_PERMISSIONS.recepcionista },
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchAllPermissions = async () => {
      if (!barbershopId) {
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('role_permissions')
          .select('role, permissions')
          .eq('barbershop_id', barbershopId);

        if (error) throw error;

        const newPermissions: Record<string, Record<string, boolean>> = {
          barbeiro: { ...DEFAULT_PERMISSIONS.barbeiro },
          recepcionista: { ...DEFAULT_PERMISSIONS.recepcionista },
        };

        data?.forEach((item: { role: string; permissions: Record<string, boolean> }) => {
          if (item.role in newPermissions) {
            newPermissions[item.role] = {
              ...DEFAULT_PERMISSIONS[item.role],
              ...item.permissions,
            };
          }
        });

        setRolePermissions(newPermissions);
      } catch (err) {
        console.error('Erro ao buscar permissões:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAllPermissions();
  }, [barbershopId]);

  const updatePermission = (role: string, permission: string, value: boolean) => {
    setRolePermissions(prev => ({
      ...prev,
      [role]: {
        ...prev[role],
        [permission]: value,
      },
    }));
  };

  const savePermissions = async (role: string): Promise<boolean> => {
    if (!barbershopId) return false;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('role_permissions')
        .upsert({
          barbershop_id: barbershopId,
          role,
          permissions: rolePermissions[role],
        }, {
          onConflict: 'barbershop_id,role',
        });

      if (error) throw error;
      return true;
    } catch (err) {
      console.error('Erro ao salvar permissões:', err);
      return false;
    } finally {
      setSaving(false);
    }
  };

  const resetToDefaults = (role: string) => {
    setRolePermissions(prev => ({
      ...prev,
      [role]: { ...DEFAULT_PERMISSIONS[role] },
    }));
  };

  return {
    rolePermissions,
    updatePermission,
    savePermissions,
    resetToDefaults,
    loading,
    saving,
  };
};
