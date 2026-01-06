import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Server, Smartphone, Mail, Activity, Info } from "lucide-react";
import { supabase } from "@/lib/supabase";
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

      // Suporta tanto snake_case quanto camelCase
      const config = configData.value as { api_url?: string; api_key?: string; apiUrl?: string; apiKey?: string };
      const apiUrl = config.api_url || config.apiUrl;
      const apiKey = config.api_key || config.apiKey;
      
      if (!apiUrl || !apiKey) {
        setServerStatus("offline");
        return;
      }

      // Test connection
      const { error } = await supabase.functions.invoke("send-whatsapp-evolution", {
        body: {
          action: "checkServer",
          apiUrl,
          apiKey,
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

      // Suporta tanto snake_case quanto camelCase
      const otpConfig = otpConfigData.value as { instance_name?: string; instanceName?: string; status?: string };
      const instanceName = otpConfig.instance_name || otpConfig.instanceName;
      
      if (!instanceName) {
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

      // Suporta tanto snake_case quanto camelCase
      const evolutionConfig = evolutionConfigData.value as { api_url?: string; api_key?: string; apiUrl?: string; apiKey?: string };
      const apiUrl = evolutionConfig.api_url || evolutionConfig.apiUrl;
      const apiKey = evolutionConfig.api_key || evolutionConfig.apiKey;

      if (!apiUrl || !apiKey) {
        setOtpStatus("disconnected");
        return;
      }

      // Check instance status using connectionState action
      const { data, error } = await supabase.functions.invoke("send-whatsapp-evolution", {
        body: {
          action: "connectionState",
          apiUrl,
          apiKey,
          instanceName,
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
      {/* Guia de Conexão */}
      <Alert className="border-primary/30 bg-primary/5">
        <Info className="h-4 w-4 text-primary" />
        <AlertTitle className="text-primary">Como funciona a conexão WhatsApp</AlertTitle>
        <AlertDescription className="text-muted-foreground">
          <ul className="list-disc pl-4 mt-2 space-y-1 text-sm">
            <li><strong>Passo 1 - Servidor:</strong> Configure a URL e API Key do Evolution API (usado por todas as barbearias)</li>
            <li><strong>Passo 2 - OTP:</strong> Configure a instância para login de clientes via WhatsApp (opcional)</li>
            <li><strong>Passo 3 - Barbearias:</strong> Cada barbearia conecta seu número em <strong>Comunicação → WhatsApp</strong> no painel delas</li>
          </ul>
        </AlertDescription>
      </Alert>

      {/* Dashboard de Status */}
      <CommunicationStatusCards
        serverStatus={serverStatus}
        otpStatus={otpStatus}
        barbershopStats={barbershopStats}
        onTabChange={setActiveTab}
      />

      {/* Tabs Internas */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="flex flex-wrap gap-1 h-auto p-1 w-full">
          <TabsTrigger value="server" className="flex-1 min-w-[70px] gap-1.5 text-xs sm:text-sm py-2">
            <Server className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span className="hidden xs:inline">Servidor</span>
            {serverStatus === "offline" && (
              <Badge variant="destructive" className="h-4 w-4 sm:h-5 sm:min-w-5 p-0 text-[10px] sm:text-xs flex items-center justify-center">!</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="otp" className="flex-1 min-w-[70px] gap-1.5 text-xs sm:text-sm py-2">
            <Smartphone className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span className="hidden xs:inline">OTP</span>
            {otpStatus === "disconnected" && (
              <Badge variant="destructive" className="h-4 w-4 sm:h-5 sm:min-w-5 p-0 text-[10px] sm:text-xs flex items-center justify-center">!</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="alerts" className="flex-1 min-w-[70px] gap-1.5 text-xs sm:text-sm py-2">
            <Mail className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span className="hidden xs:inline">Alertas</span>
          </TabsTrigger>
          <TabsTrigger value="monitoring" className="flex-1 min-w-[70px] gap-1.5 text-xs sm:text-sm py-2">
            <Activity className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span className="hidden xs:inline">Monitor</span>
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
