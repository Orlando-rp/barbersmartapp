import Layout from "@/components/layout/Layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MessageSquare, Smartphone } from "lucide-react";
import { MetaApiConfig } from "@/components/whatsapp/MetaApiConfig";
import { EvolutionApiConfig } from "@/components/whatsapp/EvolutionApiConfig";

const WhatsAppSettings = () => {
  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground">Configurações WhatsApp</h1>
          <p className="text-muted-foreground">
            Configure a integração com WhatsApp para envio de mensagens automáticas
          </p>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="official" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 max-w-md">
            <TabsTrigger value="official" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              API Oficial
            </TabsTrigger>
            <TabsTrigger value="evolution" className="flex items-center gap-2">
              <Smartphone className="h-4 w-4" />
              Evolution API
            </TabsTrigger>
          </TabsList>

          <TabsContent value="official" className="space-y-6">
            <MetaApiConfig />
          </TabsContent>

          <TabsContent value="evolution" className="space-y-6">
            <EvolutionApiConfig />
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default WhatsAppSettings;
