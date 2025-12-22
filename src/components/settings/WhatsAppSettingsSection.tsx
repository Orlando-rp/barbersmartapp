import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EvolutionApiConfig } from "@/components/whatsapp/EvolutionApiConfig";
import { MetaApiConfig } from "@/components/whatsapp/MetaApiConfig";

const WhatsAppSettingsSection = () => {
  return (
    <Tabs defaultValue="evolution" className="space-y-4">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="evolution">Evolution API</TabsTrigger>
        <TabsTrigger value="official">API Oficial</TabsTrigger>
      </TabsList>
      
      <TabsContent value="evolution">
        <EvolutionApiConfig isSaasAdmin={false} />
      </TabsContent>
      
      <TabsContent value="official">
        <MetaApiConfig />
      </TabsContent>
    </Tabs>
  );
};

export default WhatsAppSettingsSection;