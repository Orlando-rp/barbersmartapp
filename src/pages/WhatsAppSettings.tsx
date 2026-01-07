import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MessageSquare, Smartphone } from "lucide-react";
import { MetaApiConfig } from "@/components/whatsapp/MetaApiConfig";
import { EvolutionApiConfig } from "@/components/whatsapp/EvolutionApiConfig";
import { useAuth } from "@/contexts/AuthContext";
import { FeatureGate } from "@/components/FeatureGate";

const WhatsAppSettings = () => {
  const { userRole } = useAuth();
  const isSaasAdmin = userRole === 'super_admin';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Configurações WhatsApp</h1>
        <p className="text-sm sm:text-base text-muted-foreground">
          Configure a integração com WhatsApp para mensagens automáticas
        </p>
      </div>

      <FeatureGate 
        feature="whatsapp_notifications"
        upgradeMessage="Notificações via WhatsApp não estão disponíveis no seu plano atual."
      >
        {/* Tabs */}
        <Tabs defaultValue="evolution" className="space-y-4 sm:space-y-6">
          <TabsList className="grid w-full grid-cols-2 max-w-md h-auto">
            <TabsTrigger value="evolution" className="flex items-center gap-1 sm:gap-2 py-2 text-xs sm:text-sm">
              <Smartphone className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Evolution API</span>
              <span className="sm:hidden">Evolution</span>
            </TabsTrigger>
            <TabsTrigger value="official" className="flex items-center gap-1 sm:gap-2 py-2 text-xs sm:text-sm">
              <MessageSquare className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">API Oficial</span>
              <span className="sm:hidden">Oficial</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="evolution" className="space-y-6">
            <EvolutionApiConfig isSaasAdmin={isSaasAdmin} />
          </TabsContent>

          <TabsContent value="official" className="space-y-6">
            <MetaApiConfig />
          </TabsContent>
        </Tabs>
      </FeatureGate>
    </div>
  );
};

export default WhatsAppSettings;
