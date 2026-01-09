import Layout from "@/components/layout/Layout";
import { WhatsAppChat } from "@/components/whatsapp/WhatsAppChat";
import { FeatureGate } from "@/components/FeatureGate";
import { MessageSquare } from "lucide-react";

const WhatsAppChatPage = () => {
  return (
    <Layout>
      <div className="space-y-4">
        {/* Header */}
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground flex items-center gap-2">
            <MessageSquare className="h-6 w-6 sm:h-8 sm:w-8 text-green-500" />
            Chat WhatsApp
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Gerencie as conversas com seus clientes via WhatsApp
          </p>
        </div>

        <FeatureGate 
          feature="whatsapp_notifications"
          upgradeMessage="Chat WhatsApp não está disponível no seu plano atual."
        >
          <WhatsAppChat />
        </FeatureGate>
      </div>
    </Layout>
  );
};

export default WhatsAppChatPage;
