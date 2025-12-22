import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Clock, Bell, TrendingUp, ChevronRight } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { DashboardWidget } from "../DashboardWidget";
import { Sparkline } from "@/components/ui/sparkline";

interface WaitlistWidgetProps {
  onRemove?: () => void;
}

export const WaitlistWidget = ({ onRemove }: WaitlistWidgetProps) => {
  const navigate = useNavigate();
  const { activeBarbershopIds } = useAuth();
  const [stats, setStats] = useState({
    waiting: 0,
    notified: 0,
    converted: 0,
    conversionRate: 0,
  });
  const [sparklineData, setSparklineData] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (activeBarbershopIds.length === 0) return;

    const fetchStats = async () => {
      try {
        // Buscar contagens por status
        const { data: entries } = await supabase
          .from("waitlist")
          .select("status, created_at")
          .in("barbershop_id", activeBarbershopIds);

        if (entries) {
          const waiting = entries.filter(e => e.status === "waiting").length;
          const notified = entries.filter(e => e.status === "notified").length;
          const converted = entries.filter(e => e.status === "converted").length;
          const total = waiting + notified + converted;
          const conversionRate = total > 0 ? Math.round((converted / total) * 100) : 0;

          setStats({ waiting, notified, converted, conversionRate });

          // Dados para sparkline (últimos 7 dias)
          const last7Days = Array.from({ length: 7 }, (_, i) => {
            const date = new Date();
            date.setDate(date.getDate() - (6 - i));
            return date.toISOString().split('T')[0];
          });

          const dailyCounts = last7Days.map(day => 
            entries.filter(e => e.created_at?.startsWith(day)).length
          );
          setSparklineData(dailyCounts);
        }
      } catch (error) {
        console.error("Erro ao buscar estatísticas da lista de espera:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();

    // Real-time subscription
    const channel = supabase
      .channel("waitlist-widget-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "waitlist" },
        () => fetchStats()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeBarbershopIds]);

  const handleClick = () => {
    navigate("/waitlist");
  };

  return (
    <DashboardWidget
      title="Lista de Espera"
      icon={<Clock className="h-4 w-4" />}
      onRemove={onRemove}
    >
      <div 
        onClick={handleClick}
        className="cursor-pointer group"
      >
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-2xl font-bold">{stats.waiting}</p>
            <p className="text-xs text-muted-foreground">Aguardando</p>
          </div>
          <ChevronRight className="h-5 w-5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="flex items-center gap-2">
            <Bell className="h-3.5 w-3.5 text-amber-500" />
            <div>
              <p className="text-sm font-medium">{stats.notified}</p>
              <p className="text-xs text-muted-foreground">Notificados</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
            <div>
              <p className="text-sm font-medium">{stats.conversionRate}%</p>
              <p className="text-xs text-muted-foreground">Conversão</p>
            </div>
          </div>
        </div>

        {sparklineData.length > 0 && (
          <div className="mt-4">
            <Sparkline 
              data={sparklineData} 
              color="primary"
              height={32}
            />
            <p className="text-xs text-muted-foreground mt-1">Últimos 7 dias</p>
          </div>
        )}
      </div>
    </DashboardWidget>
  );
};
