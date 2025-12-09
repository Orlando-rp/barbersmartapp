import { useState, useEffect } from "react";
import { Users, UserPlus } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { DashboardWidget } from "../DashboardWidget";
import { startOfMonth } from "date-fns";
export const ClientsWidget = ({
  onRemove
}: {
  onRemove?: () => void;
}) => {
  const {
    user
  } = useAuth();
  const [totalClients, setTotalClients] = useState(0);
  const [newClients, setNewClients] = useState(0);
  const [activeClients, setActiveClients] = useState(0);
  const [isUpdating, setIsUpdating] = useState(false);
  const fetchClients = async () => {
    if (!user) return;
    setIsUpdating(true);
    try {
      const {
        data: profile
      } = await supabase.from('profiles').select('barbershop_id').eq('id', user.id).single();
      if (!profile?.barbershop_id) return;
      const monthStart = startOfMonth(new Date()).toISOString();

      // Total clients
      const {
        count: total
      } = await supabase.from('clients').select('*', {
        count: 'exact',
        head: true
      }).eq('barbershop_id', profile.barbershop_id);

      // Active clients
      const {
        count: active
      } = await supabase.from('clients').select('*', {
        count: 'exact',
        head: true
      }).eq('barbershop_id', profile.barbershop_id).eq('active', true);

      // New clients this month
      const {
        count: newMonth
      } = await supabase.from('clients').select('*', {
        count: 'exact',
        head: true
      }).eq('barbershop_id', profile.barbershop_id).gte('created_at', monthStart);
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
    fetchClients();

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
  }, [user]);
  return <DashboardWidget title="Clientes" icon={<Users className="h-5 w-5 text-primary" />} onRemove={onRemove} isUpdating={isUpdating}>
      <div className="space-y-4">
        <div>
          <p className="text-sm text-muted-foreground">Total</p>
          <p className="font-bold text-lg">{totalClients}</p>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Ativos</p>
            <p className="font-semibold text-lg">{activeClients}</p>
          </div>
          <div>
            <div className="flex items-center gap-1 mb-1">
              <UserPlus className="h-3 w-3 text-green-500" />
              <p className="text-sm text-muted-foreground">Novos (mês)</p>
            </div>
            <p className="font-semibold text-green-500 text-lg">{newClients}</p>
          </div>
        </div>
      </div>
    </DashboardWidget>;
};