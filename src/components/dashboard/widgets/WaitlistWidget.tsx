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
      icon={<Clock className="h-3.5 w-3.5" />}
      onRemove={onRemove}
    >
      <div 
        onClick={handleClick}
        className="cursor-pointer group flex flex-col flex-1"
      >
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-[10px] text-muted-foreground">Aguardando</p>
            <p className="text-sm sm:text-lg font-bold">{stats.waiting}</p>
          </div>
          <div className="flex items-center gap-0.5">
            <TrendingUp className="h-2.5 w-2.5 text-success" />
            <span className="text-[10px] font-medium text-success">{stats.conversionRate}%</span>
          </div>
        </div>

        {/* Sparkline */}
        <div className="flex-1 flex items-center py-1.5">
          {sparklineData.length > 0 && (
            <div className="w-full">
              <Sparkline 
                data={sparklineData} 
                color="primary"
                height={24}
              />
            </div>
          )}
        </div>

        <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-1.5 border-t border-border mt-auto">
          <div className="flex items-center gap-1">
            <Bell className="h-2.5 w-2.5 text-amber-500" />
            <span>{stats.notified} notificados</span>
          </div>
          <ChevronRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </div>
    </DashboardWidget>
  );
};
