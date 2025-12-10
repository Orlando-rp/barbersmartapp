import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Send } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { WhatsAppLogs } from "./WhatsAppLogs";
import { MessageTemplates, MessageTemplate } from "./MessageTemplates";
import { WhatsAppStats } from "./WhatsAppStats";

export const MetaApiConfig = () => {
  const { user, barbershopId } = useAuth();
  const [testPhone, setTestPhone] = useState("");
  const [testMessage, setTestMessage] = useState("Olá! Esta é uma mensagem de teste do BarberSmart.");
  const [sending, setSending] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>();

  const handleSelectTemplate = (template: MessageTemplate) => {
    setTestMessage(template.message);
    setSelectedTemplateId(template.id);
    toast.success(`Template "${template.name}" selecionado`);
  };

  const handleSendTest = async () => {
    if (!testPhone.trim() || !testMessage.trim()) {
      toast.error("Preencha o telefone e a mensagem");
      return;
    }

    if (!barbershopId) {
      toast.error("ID da barbearia não encontrado");
      return;
    }

    try {
      setSending(true);

      const { data, error } = await supabase.functions.invoke('send-whatsapp', {
        body: {
          to: testPhone,
          message: testMessage,
          type: 'text',
          barbershopId,
          recipientName: 'Teste',
          createdBy: user?.id,
          provider: 'meta'
        }
      });

      if (error) throw error;

      if (data?.success) {
        toast.success("Mensagem enviada com sucesso!");
        setTestPhone("");
      } else {
        throw new Error(data?.error || "Falha ao enviar mensagem");
      }
    } catch (error) {
      console.error("Erro ao enviar mensagem:", error);
      
      if (error instanceof Error && error.message.includes("Failed to send a request")) {
        toast.error(
          "A função WhatsApp não está disponível. Verifique se ela foi deployada corretamente.",
          { duration: 5000 }
        );
      } else {
        toast.error(error instanceof Error ? error.message : "Erro ao enviar mensagem");
      }
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Statistics Dashboard */}
      <WhatsAppStats provider="meta" />

      {/* Templates */}
      <MessageTemplates 
        onSelectTemplate={handleSelectTemplate}
        selectedTemplateId={selectedTemplateId}
      />

      {/* Test Message */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Send className="h-5 w-5 text-primary" />
            Enviar Mensagem de Teste
          </CardTitle>
          <CardDescription>
            Teste a integração com a API Oficial do WhatsApp
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="meta-phone">Número de Telefone (com DDI)</Label>
            <Input
              id="meta-phone"
              type="tel"
              value={testPhone}
              onChange={(e) => setTestPhone(e.target.value)}
              placeholder="5511999999999"
              disabled={sending}
            />
            <p className="text-xs text-muted-foreground">
              Formato: código do país + DDD + número (ex: 5511999999999)
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="meta-message">Mensagem</Label>
            <Textarea
              id="meta-message"
              value={testMessage}
              onChange={(e) => {
                setTestMessage(e.target.value);
                setSelectedTemplateId(undefined);
              }}
              placeholder="Digite sua mensagem de teste..."
              rows={8}
              disabled={sending}
            />
            <p className="text-xs text-muted-foreground">
              Use variáveis como {'{nome}'}, {'{data}'}, {'{hora}'} para personalizar
            </p>
          </div>

          <Button 
            onClick={handleSendTest} 
            disabled={sending || !testPhone.trim() || !testMessage.trim()}
            className="w-full"
          >
            <Send className="mr-2 h-4 w-4" />
            {sending ? "Enviando..." : "Enviar Mensagem de Teste"}
          </Button>
        </CardContent>
      </Card>

      {/* Logs with Stats Dashboard */}
      <WhatsAppLogs provider="meta" />
    </div>
  );
};
