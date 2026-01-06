import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Server, Smartphone, Mail, Activity } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { CommunicationStatusCards } from "./CommunicationStatusCards";
import { GlobalEvolutionConfig } from "./GlobalEvolutionConfig";
import { GlobalOtpWhatsAppConfig } from "./GlobalOtpWhatsAppConfig";
import { GlobalEmailAlertConfig } from "./GlobalEmailAlertConfig";
import { WhatsAppStatusPanel } from "./WhatsAppStatusPanel";

export const CommunicationDashboard = () => {
  const [activeTab, setActiveTab] = useState("server");
  const [serverStatus, setServerStatus] = useState<"online" | "offline" | "loading">("loading");
  const [otpStatus, setOtpStatus] = useState<"connected" | "disconnected" | "loading">("loading");
  const [barbershopStats, setBarbershopStats] = useState({ total: 0, connected: 0, configured: 0 });

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    await Promise.all([
      checkServerStatus(),
      checkOtpStatus(),
      loadBarbershopStats(),
    ]);
  };

  const checkServerStatus = async () => {
    try {
      // Get global config
      const { data: configData } = await supabase
        .from("system_config")
        .select("value")
        .eq("key", "evolution_api")
        .single();

      if (!configData?.value) {
        setServerStatus("offline");
        return;
      }

      const config = configData.value as { apiUrl?: string; apiKey?: string };
      
      if (!config.apiUrl || !config.apiKey) {
        setServerStatus("offline");
        return;
      }

      // Test connection
      const { error } = await supabase.functions.invoke("send-whatsapp-evolution", {
        body: {
          action: "checkServer",
          apiUrl: config.apiUrl,
          apiKey: config.apiKey,
        },
      });

      setServerStatus(error ? "offline" : "online");
    } catch {
      setServerStatus("offline");
    }
  };

  const checkOtpStatus = async () => {
    try {
      // Get OTP config
      const { data: otpConfigData } = await supabase
        .from("system_config")
        .select("value")
        .eq("key", "otp_whatsapp")
        .single();

      if (!otpConfigData?.value) {
        setOtpStatus("disconnected");
        return;
      }

      const otpConfig = otpConfigData.value as { instanceName?: string; connectionStatus?: string };
      
      if (!otpConfig.instanceName) {
        setOtpStatus("disconnected");
        return;
      }

      // Get Evolution API config for checking status
      const { data: evolutionConfigData } = await supabase
        .from("system_config")
        .select("value")
        .eq("key", "evolution_api")
        .single();

      if (!evolutionConfigData?.value) {
        setOtpStatus("disconnected");
        return;
      }

      const evolutionConfig = evolutionConfigData.value as { apiUrl?: string; apiKey?: string };

      if (!evolutionConfig.apiUrl || !evolutionConfig.apiKey) {
        setOtpStatus("disconnected");
        return;
      }

      // Check instance status
      const { data, error } = await supabase.functions.invoke("send-whatsapp-evolution", {
        body: {
          action: "checkStatus",
          apiUrl: evolutionConfig.apiUrl,
          apiKey: evolutionConfig.apiKey,
          instanceName: otpConfig.instanceName,
        },
      });

      if (error) {
        setOtpStatus("disconnected");
        return;
      }

      const status = data?.instance?.state || data?.state;
      setOtpStatus(status === "open" ? "connected" : "disconnected");
    } catch {
      setOtpStatus("disconnected");
    }
  };

  const loadBarbershopStats = async () => {
    try {
      // Get all barbershops
      const { data: barbershops } = await supabase
        .from("barbershops")
        .select("id");

      const total = barbershops?.length || 0;

      // Get configured barbershops (with whatsapp_config)
      const { data: configs } = await supabase
        .from("whatsapp_config")
        .select("barbershop_id, is_active, config")
        .eq("provider", "evolution");

      const configured = configs?.length || 0;
      
      // For connected count, we'd need to check each instance status
      // For now, count those with is_active = true as connected
      const connected = configs?.filter(c => c.is_active)?.length || 0;

      setBarbershopStats({ total, connected, configured });
    } catch {
      setBarbershopStats({ total: 0, connected: 0, configured: 0 });
    }
  };

  return (
    <div className="space-y-6">
      {/* Dashboard de Status */}
      <CommunicationStatusCards
        serverStatus={serverStatus}
        otpStatus={otpStatus}
        barbershopStats={barbershopStats}
        onTabChange={setActiveTab}
      />

      {/* Tabs Internas */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4">
          <TabsTrigger value="server" className="gap-2">
            <Server className="h-4 w-4" />
            <span className="hidden sm:inline">Servidor</span>
            {serverStatus === "offline" && (
              <Badge variant="destructive" className="h-5 min-w-5 p-0 text-xs flex items-center justify-center">!</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="otp" className="gap-2">
            <Smartphone className="h-4 w-4" />
            <span className="hidden sm:inline">OTP</span>
            {otpStatus === "disconnected" && (
              <Badge variant="destructive" className="h-5 min-w-5 p-0 text-xs flex items-center justify-center">!</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="alerts" className="gap-2">
            <Mail className="h-4 w-4" />
            <span className="hidden sm:inline">Alertas</span>
          </TabsTrigger>
          <TabsTrigger value="monitoring" className="gap-2">
            <Activity className="h-4 w-4" />
            <span className="hidden sm:inline">Monitoramento</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="server" className="space-y-6">
          <GlobalEvolutionConfig showBarbershopStatus={false} onStatusChange={() => {
            checkServerStatus();
            loadBarbershopStats();
          }} />
        </TabsContent>

        <TabsContent value="otp" className="space-y-6">
          <GlobalOtpWhatsAppConfig onStatusChange={checkOtpStatus} />
        </TabsContent>

        <TabsContent value="alerts" className="space-y-6">
          <GlobalEmailAlertConfig />
        </TabsContent>

        <TabsContent value="monitoring" className="space-y-6">
          <WhatsAppStatusPanel onRefresh={loadBarbershopStats} />
        </TabsContent>
      </Tabs>
    </div>
  );
};
