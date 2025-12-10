import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, CheckCircle, XCircle, TrendingUp } from "lucide-react";
import { supabase } from "@/lib/supabase";

interface WhatsAppStats {
  total_sent: number;
  total_success: number;
  total_failed: number;
  success_rate: number;
}

interface WhatsAppStatsProps {
  provider: 'meta' | 'evolution';
}

export const WhatsAppStats = ({ provider }: WhatsAppStatsProps) => {
  const { barbershopId } = useAuth();
  const [stats, setStats] = useState<WhatsAppStats | null>(null);

  useEffect(() => {
    if (barbershopId) {
      loadStats();
    }
  }, [barbershopId, provider]);

  const loadStats = async () => {
    if (!barbershopId) return;

    try {
      const { data, error } = await supabase
        .rpc('get_whatsapp_stats', { 
          barbershop_uuid: barbershopId,
          days_ago: 30 
        });

      if (error) {
        if (error.code === 'PGRST202' || error.code === 'PGRST204') {
          await calculateStats();
        } else {
          throw error;
        }
      } else if (data && data.length > 0) {
        setStats(data[0]);
      }
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error);
      await calculateStats();
    }
  };

  const calculateStats = async () => {
    if (!barbershopId) return;

    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data } = await supabase
        .from('whatsapp_logs')
        .select('status')
        .eq('barbershop_id', barbershopId)
        .eq('provider', provider)
        .gte('created_at', thirtyDaysAgo.toISOString());

      if (data) {
        const total = data.length;
        const success = data.filter(l => l.status === 'sent').length;
        const failed = data.filter(l => l.status === 'failed').length;
        const rate = total > 0 ? Math.round((success / total) * 100) : 0;

        setStats({
          total_sent: total,
          total_success: success,
          total_failed: failed,
          success_rate: rate,
        });
      }
    } catch (error) {
      console.error('Erro ao calcular estatísticas:', error);
    }
  };

  return (
    <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Enviado</CardTitle>
          <Activity className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats?.total_sent || 0}</div>
          <p className="text-xs text-muted-foreground">Últimos 30 dias</p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Sucesso</CardTitle>
          <CheckCircle className="h-4 w-4 text-success" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-success">{stats?.total_success || 0}</div>
          <p className="text-xs text-muted-foreground">Mensagens entregues</p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Falhas</CardTitle>
          <XCircle className="h-4 w-4 text-destructive" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-destructive">{stats?.total_failed || 0}</div>
          <p className="text-xs text-muted-foreground">Erros de envio</p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Taxa de Sucesso</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats?.success_rate || 0}%</div>
          <p className="text-xs text-muted-foreground">Média geral</p>
        </CardContent>
      </Card>
    </div>
  );
};
