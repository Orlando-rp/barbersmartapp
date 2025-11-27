import { useState } from "react";
import Layout from "@/components/layout/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { MessageSquare, Send, CheckCircle, XCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

const WhatsAppSettings = () => {
  const [testPhone, setTestPhone] = useState("");
  const [testMessage, setTestMessage] = useState("Olá! Esta é uma mensagem de teste do BarberSmart.");
  const [sending, setSending] = useState(false);

  const handleSendTest = async () => {
    if (!testPhone.trim() || !testMessage.trim()) {
      toast.error("Preencha o telefone e a mensagem");
      return;
    }

    try {
      setSending(true);

      const { data, error } = await supabase.functions.invoke('send-whatsapp', {
        body: {
          to: testPhone,
          message: testMessage,
          type: 'text'
        }
      });

      if (error) throw error;

      if (data?.success) {
        toast.success("Mensagem enviada com sucesso!");
      } else {
        throw new Error(data?.error || "Falha ao enviar mensagem");
      }
    } catch (error) {
      console.error("Erro ao enviar mensagem:", error);
      
      // Detect specific error types
      if (error instanceof Error && error.message.includes("Failed to send a request")) {
        toast.error(
          "A função WhatsApp não está disponível. Verifique se ela foi deployada corretamente e aguarde alguns minutos.",
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
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground">Configurações WhatsApp</h1>
          <p className="text-muted-foreground">
            Configure e teste a integração com WhatsApp Business API
          </p>
        </div>

        {/* Alert */}
        <Card className="border-orange-500/50 bg-orange-500/10">
          <CardContent className="pt-6">
            <div className="flex gap-3">
              <MessageSquare className="h-5 w-5 text-orange-500 flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-medium text-orange-900 dark:text-orange-100">
                  Importante: Deploy da função
                </p>
                <p className="text-sm text-orange-800 dark:text-orange-200">
                  A edge function <code className="bg-orange-900/20 px-1.5 py-0.5 rounded">send-whatsapp</code> precisa estar deployada no Lovable Cloud. 
                  Após qualquer alteração, aguarde alguns minutos para o deploy ser concluído antes de testar.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Setup Instructions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-primary" />
              Como Configurar
            </CardTitle>
            <CardDescription>
              Siga os passos abaixo para configurar a integração
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-start gap-3">
                <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm font-bold">
                  1
                </div>
                <div>
                  <p className="font-medium">Criar conta WhatsApp Business API</p>
                  <p className="text-sm text-muted-foreground">
                    Acesse <a href="https://developers.facebook.com/apps" target="_blank" rel="noopener noreferrer" className="text-primary underline">Meta for Developers</a> e crie um app
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm font-bold">
                  2
                </div>
                <div>
                  <p className="font-medium">Obter credenciais</p>
                  <p className="text-sm text-muted-foreground">
                    Copie o <strong>Phone Number ID</strong> e o <strong>Access Token</strong>
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm font-bold">
                  3
                </div>
                <div>
                  <p className="font-medium">Configurar secrets</p>
                  <p className="text-sm text-muted-foreground">
                    Adicione as credenciais nas variáveis de ambiente:
                  </p>
                  <ul className="text-sm text-muted-foreground list-disc list-inside mt-1">
                    <li><code className="bg-muted px-1 py-0.5 rounded">WHATSAPP_API_TOKEN</code></li>
                    <li><code className="bg-muted px-1 py-0.5 rounded">WHATSAPP_PHONE_NUMBER_ID</code></li>
                  </ul>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm font-bold">
                  4
                </div>
                <div>
                  <p className="font-medium">Testar integração</p>
                  <p className="text-sm text-muted-foreground">
                    Use o formulário abaixo para enviar uma mensagem de teste
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t">
              <p className="text-sm text-muted-foreground">
                📚 <a href="https://developers.facebook.com/docs/whatsapp/business-management-api/get-started" target="_blank" rel="noopener noreferrer" className="text-primary underline">
                  Documentação oficial do WhatsApp Business API
                </a>
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Test Message */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Send className="h-5 w-5 text-success" />
              Enviar Mensagem de Teste
            </CardTitle>
            <CardDescription>
              Teste se a integração está funcionando corretamente
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Número de Telefone (com DDI)</Label>
              <Input
                id="phone"
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
              <Label htmlFor="message">Mensagem</Label>
              <Textarea
                id="message"
                value={testMessage}
                onChange={(e) => setTestMessage(e.target.value)}
                placeholder="Digite sua mensagem de teste..."
                rows={4}
                disabled={sending}
              />
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

        {/* Automation Templates */}
        <Card>
          <CardHeader>
            <CardTitle>Automações Disponíveis</CardTitle>
            <CardDescription>
              Mensagens automáticas que podem ser enviadas via WhatsApp
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 border border-border rounded-lg">
                <CheckCircle className="h-5 w-5 text-success" />
                <div>
                  <p className="font-medium">Confirmação de Agendamento</p>
                  <p className="text-sm text-muted-foreground">
                    Enviada automaticamente após novo agendamento
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 border border-border rounded-lg">
                <CheckCircle className="h-5 w-5 text-success" />
                <div>
                  <p className="font-medium">Lembrete 24h Antes</p>
                  <p className="text-sm text-muted-foreground">
                    Lembrete enviado 24 horas antes do horário agendado
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 border border-border rounded-lg">
                <CheckCircle className="h-5 w-5 text-success" />
                <div>
                  <p className="font-medium">Solicitação de Avaliação</p>
                  <p className="text-sm text-muted-foreground">
                    Enviada após conclusão do serviço
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 border border-border rounded-lg">
                <CheckCircle className="h-5 w-5 text-success" />
                <div>
                  <p className="font-medium">Campanhas de Marketing</p>
                  <p className="text-sm text-muted-foreground">
                    Promoções e novidades para clientes
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default WhatsAppSettings;
