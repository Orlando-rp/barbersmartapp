import { useState, useEffect } from "react";
import { Users, UserPlus } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { DashboardWidget } from "../DashboardWidget";
import { startOfMonth } from "date-fns";
import { useSharedBarbershopId } from "@/hooks/useSharedBarbershopId";

export const ClientsWidget = ({
  onRemove
}: {
  onRemove?: () => void;
}) => {
  const { user } = useAuth();
  const { sharedBarbershopId, loading: loadingBarbershop } = useSharedBarbershopId();
  const [totalClients, setTotalClients] = useState(0);
  const [newClients, setNewClients] = useState(0);
  const [activeClients, setActiveClients] = useState(0);
  const [isUpdating, setIsUpdating] = useState(false);

  const fetchClients = async () => {
    if (!user || !sharedBarbershopId || loadingBarbershop) return;
    setIsUpdating(true);
    try {
      const monthStart = startOfMonth(new Date()).toISOString();
      
      // Buscar clientes da matriz E de todas as unidades filhas
      const { data: childUnits } = await supabase
        .from('barbershops')
        .select('id')
        .eq('parent_id', sharedBarbershopId);
      
      const allBarbershopIds = [sharedBarbershopId, ...(childUnits?.map(u => u.id) || [])];

      // Total clients
      const { count: total } = await supabase
        .from('clients')
        .select('*', { count: 'exact', head: true })
        .in('barbershop_id', allBarbershopIds);

      // Active clients
      const { count: active } = await supabase
        .from('clients')
        .select('*', { count: 'exact', head: true })
        .in('barbershop_id', allBarbershopIds)
        .eq('active', true);

      // New clients this month
      const { count: newMonth } = await supabase
        .from('clients')
        .select('*', { count: 'exact', head: true })
        .in('barbershop_id', allBarbershopIds)
        .gte('created_at', monthStart);

      setTotalClients(total || 0);
      setActiveClients(active || 0);
      setNewClients(newMonth || 0);
    } catch (error) {
      console.error('Error fetching clients:', error);
    } finally {
      setIsUpdating(false);
    }
  };
  useEffect(() => {
    if (!loadingBarbershop && sharedBarbershopId) {
      fetchClients();
    }

    // Auto-refresh every 60 seconds
    const interval = setInterval(fetchClients, 60000);

    // Real-time subscription
    const channel = supabase.channel('clients-updates').on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'clients'
    }, () => {
      fetchClients();
    }).subscribe();

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [user, sharedBarbershopId, loadingBarbershop]);
  return <DashboardWidget title="Clientes" icon={<Users className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />} onRemove={onRemove} isUpdating={isUpdating}>
      <div className="space-y-2 sm:space-y-4">
        <div>
          <p className="text-xs sm:text-sm text-muted-foreground">Total</p>
          <p className="font-bold text-sm sm:text-lg">{totalClients}</p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:gap-4">
          <div>
            <p className="text-xs sm:text-sm text-muted-foreground">Ativos</p>
            <p className="font-semibold text-sm sm:text-lg">{activeClients}</p>
          </div>
          <div>
            <div className="flex items-center gap-1 mb-0.5 sm:mb-1">
              <UserPlus className="h-3 w-3 text-success" />
              <p className="text-xs sm:text-sm text-muted-foreground truncate">Novos</p>
            </div>
            <p className="font-semibold text-success text-sm sm:text-lg">{newClients}</p>
          </div>
        </div>
      </div>
    </DashboardWidget>;
};