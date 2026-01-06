import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Server, Smartphone, Building2, Loader2 } from "lucide-react";

interface CommunicationStatusCardsProps {
  serverStatus: "online" | "offline" | "loading";
  otpStatus: "connected" | "disconnected" | "loading";
  barbershopStats: {
    total: number;
    connected: number;
    configured: number;
  };
  onTabChange?: (tab: string) => void;
}

export const CommunicationStatusCards = ({
  serverStatus,
  otpStatus,
  barbershopStats,
  onTabChange,
}: CommunicationStatusCardsProps) => {
  const getServerBadge = () => {
    if (serverStatus === "loading") {
      return (
        <Badge variant="secondary" className="gap-1">
          <Loader2 className="h-3 w-3 animate-spin" />
          Verificando
        </Badge>
      );
    }
    return (
      <Badge variant={serverStatus === "online" ? "default" : "destructive"} className={serverStatus === "online" ? "bg-green-500 hover:bg-green-600" : ""}>
        {serverStatus === "online" ? "Online" : "Offline"}
      </Badge>
    );
  };

  const getOtpBadge = () => {
    if (otpStatus === "loading") {
      return (
        <Badge variant="secondary" className="gap-1">
          <Loader2 className="h-3 w-3 animate-spin" />
          Verificando
        </Badge>
      );
    }
    return (
      <Badge variant={otpStatus === "connected" ? "default" : "outline"} className={otpStatus === "connected" ? "bg-green-500 hover:bg-green-600" : ""}>
        {otpStatus === "connected" ? "Conectado" : "Desconectado"}
      </Badge>
    );
  };

  return (
    <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-3">
      {/* Card Servidor */}
      <Card 
        className="cursor-pointer hover:border-primary transition-colors"
        onClick={() => onTabChange?.("server")}
      >
        <CardContent className="p-3 sm:p-4 flex items-center gap-3 sm:gap-4">
          <div className="p-2 sm:p-3 rounded-full bg-primary/10">
            <Server className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs sm:text-sm text-muted-foreground truncate">Servidor Evolution</p>
            <div className="mt-1">
              {getServerBadge()}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Card OTP */}
      <Card 
        className="cursor-pointer hover:border-primary transition-colors"
        onClick={() => onTabChange?.("otp")}
      >
        <CardContent className="p-3 sm:p-4 flex items-center gap-3 sm:gap-4">
          <div className="p-2 sm:p-3 rounded-full bg-primary/10">
            <Smartphone className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs sm:text-sm text-muted-foreground truncate">WhatsApp OTP</p>
            <div className="mt-1">
              {getOtpBadge()}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Card Barbearias */}
      <Card 
        className="cursor-pointer hover:border-primary transition-colors"
        onClick={() => onTabChange?.("monitoring")}
      >
        <CardContent className="p-3 sm:p-4 flex items-center gap-3 sm:gap-4">
          <div className="p-2 sm:p-3 rounded-full bg-primary/10">
            <Building2 className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs sm:text-sm text-muted-foreground truncate">Barbearias Conectadas</p>
            <div className="flex items-baseline gap-1 sm:gap-2 mt-1 flex-wrap">
              <span className="text-xl sm:text-2xl font-bold">{barbershopStats.connected}</span>
              <span className="text-xs sm:text-sm text-muted-foreground">/ {barbershopStats.total}</span>
              {barbershopStats.configured > 0 && barbershopStats.configured !== barbershopStats.connected && (
                <span className="text-xs text-muted-foreground hidden sm:inline">
                  ({barbershopStats.configured} config.)
                </span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
