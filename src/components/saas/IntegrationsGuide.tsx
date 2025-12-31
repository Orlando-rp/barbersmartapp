import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Copy, Check, MessageSquare, CreditCard, Bot, Webhook, Key, Globe, Smartphone, Zap } from "lucide-react";
import { toast } from "sonner";

export function IntegrationsGuide() {
  const [copiedItems, setCopiedItems] = useState<Record<string, boolean>>({});

  const copyToClipboard = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedItems(prev => ({ ...prev, [id]: true }));
    toast.success("Copiado!");
    setTimeout(() => {
      setCopiedItems(prev => ({ ...prev, [id]: false }));
    }, 2000);
  };

  const CodeBlock = ({ code, id }: { code: string; id: string }) => (
    <div className="relative group">
      <pre className="bg-muted p-4 rounded-lg text-sm overflow-x-auto">
        <code>{code}</code>
      </pre>
      <Button
        size="icon"
        variant="ghost"
        className={`absolute top-2 right-2 h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity ${
          copiedItems[id] ? 'bg-success text-success-foreground' : ''
        }`}
        onClick={() => copyToClipboard(code, id)}
      >
        {copiedItems[id] ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
      </Button>
    </div>
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Guia de Integrações
          </CardTitle>
          <CardDescription>
            Configure integrações com WhatsApp, gateways de pagamento e outras APIs externas
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* WhatsApp Integration */}
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="whatsapp-evolution">
              <AccordionTrigger>
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-green-500" />
                  <span>WhatsApp - Evolution API</span>
                  <Badge variant="secondary">Recomendado</Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-4">
                <p className="text-muted-foreground">
                  A Evolution API é uma solução open-source para integração com WhatsApp Business.
                </p>
                
                <div className="space-y-3">
                  <h4 className="font-semibold">1. Configuração do Servidor</h4>
                  <p className="text-sm text-muted-foreground">
                    Deploy via Docker Compose:
                  </p>
                  <CodeBlock
                    id="evolution-docker"
                    code={`# docker-compose.evolution.yml
version: '3.8'
services:
  evolution:
    image: atendai/evolution-api:latest
    container_name: evolution_api
    restart: always
    ports:
      - "8080:8080"
    environment:
      - SERVER_URL=https://api.seudominio.com
      - AUTHENTICATION_API_KEY=sua_chave_api_secreta
      - AUTHENTICATION_EXPOSE_IN_FETCH_INSTANCES=true
      - DATABASE_ENABLED=true
      - DATABASE_PROVIDER=postgresql
      - DATABASE_CONNECTION_URI=postgresql://user:pass@db:5432/evolution
      - DATABASE_SAVE_DATA_INSTANCE=true
      - DATABASE_SAVE_DATA_NEW_MESSAGE=true
      - DATABASE_SAVE_MESSAGE_UPDATE=true
      - DATABASE_SAVE_DATA_CONTACTS=true
      - DATABASE_SAVE_DATA_CHATS=true
      - RABBITMQ_ENABLED=false
      - WEBSOCKET_ENABLED=true
      - LOG_LEVEL=ERROR
    volumes:
      - evolution_instances:/evolution/instances
    networks:
      - evolution_network

volumes:
  evolution_instances:

networks:
  evolution_network:
    driver: bridge`}
                  />
                </div>

                <div className="space-y-3">
                  <h4 className="font-semibold">2. Secrets Necessários</h4>
                  <div className="bg-muted/50 p-4 rounded-lg space-y-2">
                    <div className="flex items-center gap-2">
                      <Key className="h-4 w-4" />
                      <code className="text-sm">EVOLUTION_API_URL</code>
                      <span className="text-sm text-muted-foreground">- URL da sua instância</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Key className="h-4 w-4" />
                      <code className="text-sm">EVOLUTION_API_KEY</code>
                      <span className="text-sm text-muted-foreground">- Chave de autenticação</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="font-semibold">3. Configurar Webhook</h4>
                  <CodeBlock
                    id="evolution-webhook"
                    code={`# Configurar webhook para receber mensagens
curl -X POST "https://api.evolution.com/webhook/set/sua-instancia" \\
  -H "apikey: sua_chave_api" \\
  -H "Content-Type: application/json" \\
  -d '{
    "url": "https://seu-projeto.supabase.co/functions/v1/evolution-webhook",
    "webhook_by_events": true,
    "events": [
      "MESSAGES_UPSERT",
      "MESSAGES_UPDATE", 
      "CONNECTION_UPDATE",
      "QRCODE_UPDATED"
    ]
  }'`}
                  />
                </div>

                <div className="space-y-3">
                  <h4 className="font-semibold">4. Enviar Mensagem (Exemplo)</h4>
                  <CodeBlock
                    id="evolution-send"
                    code={`// Usando a edge function send-whatsapp-evolution
const { data, error } = await supabase.functions.invoke('send-whatsapp-evolution', {
  body: {
    action: 'sendText',
    instanceName: 'minha-instancia',
    number: '5511999999999',
    text: 'Olá! Sua consulta foi confirmada.',
    barbershopId: 'uuid-da-barbearia'
  }
});`}
                  />
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="whatsapp-meta">
              <AccordionTrigger>
                <div className="flex items-center gap-2">
                  <Smartphone className="h-4 w-4 text-blue-500" />
                  <span>WhatsApp - Meta Cloud API</span>
                  <Badge variant="outline">Oficial</Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-4">
                <p className="text-muted-foreground">
                  API oficial da Meta para WhatsApp Business. Requer conta verificada no Meta Business.
                </p>

                <div className="space-y-3">
                  <h4 className="font-semibold">1. Pré-requisitos</h4>
                  <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                    <li>Conta no Meta for Developers</li>
                    <li>App criado no Meta Business Suite</li>
                    <li>Número de telefone verificado</li>
                    <li>Aprovação do Meta para produção</li>
                  </ul>
                </div>

                <div className="space-y-3">
                  <h4 className="font-semibold">2. Secrets Necessários</h4>
                  <div className="bg-muted/50 p-4 rounded-lg space-y-2">
                    <div className="flex items-center gap-2">
                      <Key className="h-4 w-4" />
                      <code className="text-sm">WHATSAPP_API_TOKEN</code>
                    </div>
                    <div className="flex items-center gap-2">
                      <Key className="h-4 w-4" />
                      <code className="text-sm">WHATSAPP_PHONE_NUMBER_ID</code>
                    </div>
                    <div className="flex items-center gap-2">
                      <Key className="h-4 w-4" />
                      <code className="text-sm">WHATSAPP_VERIFY_TOKEN</code>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="font-semibold">3. Enviar Mensagem</h4>
                  <CodeBlock
                    id="meta-send"
                    code={`// Usando a edge function send-whatsapp
const { data, error } = await supabase.functions.invoke('send-whatsapp', {
  body: {
    to: '5511999999999',
    message: 'Olá! Sua consulta foi confirmada.',
    barbershopId: 'uuid-da-barbearia'
  }
});`}
                  />
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="payments-mercadopago">
              <AccordionTrigger>
                <div className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-blue-400" />
                  <span>Mercado Pago</span>
                  <Badge variant="secondary">Recomendado Brasil</Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-4">
                <p className="text-muted-foreground">
                  Gateway de pagamento com suporte a Pix, cartões e boleto.
                </p>

                <div className="space-y-3">
                  <h4 className="font-semibold">1. Obter Credenciais</h4>
                  <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                    <li>Acesse: <a href="https://www.mercadopago.com.br/developers" target="_blank" className="text-primary hover:underline">mercadopago.com.br/developers</a></li>
                    <li>Crie uma aplicação</li>
                    <li>Obtenha o Access Token de produção</li>
                  </ul>
                </div>

                <div className="space-y-3">
                  <h4 className="font-semibold">2. Configuração Global (Super Admin)</h4>
                  <p className="text-sm text-muted-foreground">
                    Configure na tabela <code>global_payment_config</code>:
                  </p>
                  <CodeBlock
                    id="mp-global"
                    code={`-- Configuração global do Mercado Pago
UPDATE global_payment_config SET
  mercadopago_access_token = 'APP_USR-xxxx',
  mercadopago_public_key = 'APP_USR-xxxx',
  mercadopago_enabled = true,
  default_gateway = 'mercadopago';`}
                  />
                </div>

                <div className="space-y-3">
                  <h4 className="font-semibold">3. Configuração por Barbearia</h4>
                  <p className="text-sm text-muted-foreground">
                    Cada barbearia pode ter suas próprias credenciais na tabela <code>payment_settings</code>:
                  </p>
                  <CodeBlock
                    id="mp-tenant"
                    code={`-- Configuração específica da barbearia
INSERT INTO payment_settings (
  barbershop_id,
  mercadopago_access_token,
  mercadopago_public_key,
  allow_online_payment,
  allow_pay_at_location,
  require_deposit,
  deposit_percentage
) VALUES (
  'uuid-da-barbearia',
  'APP_USR-xxxx',
  'APP_USR-xxxx',
  true,
  true,
  false,
  0
);`}
                  />
                </div>

                <div className="space-y-3">
                  <h4 className="font-semibold">4. Webhook de Pagamento</h4>
                  <p className="text-sm text-muted-foreground">
                    Configure o webhook no painel do Mercado Pago:
                  </p>
                  <CodeBlock
                    id="mp-webhook"
                    code={`URL: https://seu-projeto.supabase.co/functions/v1/mercadopago-webhook
Eventos: payment.created, payment.updated`}
                  />
                </div>

                <div className="space-y-3">
                  <h4 className="font-semibold">5. Criar Preferência de Pagamento</h4>
                  <CodeBlock
                    id="mp-preference"
                    code={`// Criar preferência para agendamento
const { data, error } = await supabase.functions.invoke('create-payment-preference', {
  body: {
    appointmentId: 'uuid-do-agendamento',
    barbershopId: 'uuid-da-barbearia',
    items: [{
      title: 'Corte de Cabelo',
      quantity: 1,
      unit_price: 50.00
    }],
    payer: {
      email: 'cliente@email.com',
      name: 'Nome do Cliente'
    }
  }
});

// Redirecionar para checkout
window.location.href = data.init_point;`}
                  />
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="payments-stripe">
              <AccordionTrigger>
                <div className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-purple-500" />
                  <span>Stripe</span>
                  <Badge variant="outline">Internacional</Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-4">
                <p className="text-muted-foreground">
                  Gateway de pagamento internacional para assinaturas e pagamentos únicos.
                </p>

                <div className="space-y-3">
                  <h4 className="font-semibold">1. Secrets Necessários</h4>
                  <div className="bg-muted/50 p-4 rounded-lg space-y-2">
                    <div className="flex items-center gap-2">
                      <Key className="h-4 w-4" />
                      <code className="text-sm">STRIPE_SECRET_KEY</code>
                    </div>
                    <div className="flex items-center gap-2">
                      <Key className="h-4 w-4" />
                      <code className="text-sm">STRIPE_PUBLISHABLE_KEY</code>
                    </div>
                    <div className="flex items-center gap-2">
                      <Key className="h-4 w-4" />
                      <code className="text-sm">STRIPE_WEBHOOK_SECRET</code>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="font-semibold">2. Configuração Global</h4>
                  <CodeBlock
                    id="stripe-global"
                    code={`-- Configuração global do Stripe
UPDATE global_payment_config SET
  stripe_secret_key = 'sk_live_xxxx',
  stripe_publishable_key = 'pk_live_xxxx',
  stripe_webhook_secret = 'whsec_xxxx',
  stripe_enabled = true;`}
                  />
                </div>

                <div className="space-y-3">
                  <h4 className="font-semibold">3. Criar Assinatura</h4>
                  <CodeBlock
                    id="stripe-subscription"
                    code={`// Criar checkout de assinatura
const { data, error } = await supabase.functions.invoke('create-subscription-preference', {
  body: {
    barbershopId: 'uuid-da-barbearia',
    priceId: 'price_xxxx',
    successUrl: 'https://app.com/success',
    cancelUrl: 'https://app.com/cancel'
  }
});

// Redirecionar para Stripe Checkout
window.location.href = data.url;`}
                  />
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="openai">
              <AccordionTrigger>
                <div className="flex items-center gap-2">
                  <Bot className="h-4 w-4 text-emerald-500" />
                  <span>OpenAI - Chatbot IA</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-4">
                <p className="text-muted-foreground">
                  Integração com GPT para chatbot de agendamento inteligente.
                </p>

                <div className="space-y-3">
                  <h4 className="font-semibold">1. Obter API Key</h4>
                  <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                    <li>Acesse: <a href="https://platform.openai.com/api-keys" target="_blank" className="text-primary hover:underline">platform.openai.com/api-keys</a></li>
                    <li>Crie uma nova API key</li>
                    <li>Configure como secret: <code>OPENAI_API_KEY</code></li>
                  </ul>
                </div>

                <div className="space-y-3">
                  <h4 className="font-semibold">2. Configurar Chatbot</h4>
                  <p className="text-sm text-muted-foreground">
                    Configure na tabela <code>global_evolution_config</code>:
                  </p>
                  <CodeBlock
                    id="openai-config"
                    code={`-- Habilitar chatbot
UPDATE global_evolution_config SET
  chatbot_enabled = true,
  chatbot_model = 'gpt-4o-mini',
  chatbot_system_prompt = 'Você é um assistente de barbearia...';`}
                  />
                </div>

                <div className="space-y-3">
                  <h4 className="font-semibold">3. Fluxo do Chatbot</h4>
                  <div className="bg-muted/50 p-4 rounded-lg">
                    <ol className="list-decimal list-inside text-sm space-y-2">
                      <li>Cliente envia mensagem via WhatsApp</li>
                      <li>Webhook recebe e processa mensagem</li>
                      <li>GPT analisa intenção (agendar, remarcar, cancelar, etc.)</li>
                      <li>Sistema executa ação correspondente</li>
                      <li>Resposta automática enviada ao cliente</li>
                    </ol>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="webhooks">
              <AccordionTrigger>
                <div className="flex items-center gap-2">
                  <Webhook className="h-4 w-4 text-orange-500" />
                  <span>Webhooks Personalizados</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-4">
                <p className="text-muted-foreground">
                  Configure webhooks para integrar com sistemas externos.
                </p>

                <div className="space-y-3">
                  <h4 className="font-semibold">Eventos Disponíveis</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      'appointment.created',
                      'appointment.updated',
                      'appointment.cancelled',
                      'appointment.completed',
                      'client.created',
                      'payment.received',
                      'review.submitted',
                      'staff.schedule_changed'
                    ].map(event => (
                      <div key={event} className="bg-muted/50 px-3 py-2 rounded text-sm">
                        <code>{event}</code>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="font-semibold">Formato do Payload</h4>
                  <CodeBlock
                    id="webhook-payload"
                    code={`{
  "event": "appointment.created",
  "timestamp": "2024-01-15T10:30:00Z",
  "barbershop_id": "uuid",
  "data": {
    "id": "appointment-uuid",
    "client_name": "João Silva",
    "service": "Corte de Cabelo",
    "staff": "Carlos",
    "datetime": "2024-01-16T14:00:00Z",
    "price": 50.00
  }
}`}
                  />
                </div>

                <div className="space-y-3">
                  <h4 className="font-semibold">Configurar Webhook</h4>
                  <CodeBlock
                    id="webhook-config"
                    code={`-- Adicionar webhook para uma barbearia
INSERT INTO barbershop_webhooks (
  barbershop_id,
  url,
  events,
  secret,
  active
) VALUES (
  'uuid-da-barbearia',
  'https://seu-sistema.com/webhook',
  ARRAY['appointment.created', 'appointment.cancelled'],
  'seu_secret_para_validacao',
  true
);`}
                  />
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="dns">
              <AccordionTrigger>
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4 text-cyan-500" />
                  <span>DNS e Domínios Customizados</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-4">
                <p className="text-muted-foreground">
                  Configure domínios personalizados para barbearias.
                </p>

                <div className="space-y-3">
                  <h4 className="font-semibold">Tipos de Configuração</h4>
                  <div className="space-y-4">
                    <div className="bg-muted/50 p-4 rounded-lg">
                      <h5 className="font-medium mb-2">Subdomínio</h5>
                      <p className="text-sm text-muted-foreground mb-2">
                        Ex: <code>minhabarbearia.barbersmart.com</code>
                      </p>
                      <CodeBlock
                        id="dns-subdomain"
                        code={`Tipo: CNAME
Nome: minhabarbearia
Valor: app.barbersmart.com`}
                      />
                    </div>

                    <div className="bg-muted/50 p-4 rounded-lg">
                      <h5 className="font-medium mb-2">Domínio Próprio</h5>
                      <p className="text-sm text-muted-foreground mb-2">
                        Ex: <code>www.minhabarbearia.com.br</code>
                      </p>
                      <CodeBlock
                        id="dns-custom"
                        code={`Tipo: CNAME
Nome: www (ou @)
Valor: app.barbersmart.com

# Para domínio raiz (apex domain):
Tipo: A
Nome: @
Valor: IP_DO_SERVIDOR`}
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="font-semibold">Verificar DNS</h4>
                  <p className="text-sm text-muted-foreground">
                    A verificação é feita automaticamente via edge function:
                  </p>
                  <CodeBlock
                    id="dns-verify"
                    code={`// Verificar status do DNS
const { data, error } = await supabase.functions.invoke('verify-dns', {
  body: {
    domain: 'www.minhabarbearia.com.br',
    barbershopId: 'uuid-da-barbearia'
  }
});

// Resposta
{
  "verified": true,
  "dns_records": {
    "cname": "app.barbersmart.com",
    "ssl_status": "active"
  }
}`}
                  />
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>

      {/* Quick Reference Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Referência Rápida de Secrets</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <h4 className="font-medium flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-green-500" />
                WhatsApp
              </h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li><code>EVOLUTION_API_URL</code></li>
                <li><code>EVOLUTION_API_KEY</code></li>
                <li><code>WHATSAPP_API_TOKEN</code></li>
                <li><code>WHATSAPP_PHONE_NUMBER_ID</code></li>
              </ul>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-blue-500" />
                Pagamentos
              </h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li><code>STRIPE_SECRET_KEY</code></li>
                <li><code>STRIPE_WEBHOOK_SECRET</code></li>
                <li><code>MERCADOPAGO_ACCESS_TOKEN</code></li>
              </ul>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium flex items-center gap-2">
                <Bot className="h-4 w-4 text-emerald-500" />
                IA
              </h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li><code>OPENAI_API_KEY</code></li>
              </ul>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium flex items-center gap-2">
                <Globe className="h-4 w-4 text-cyan-500" />
                Infraestrutura
              </h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li><code>SUPABASE_URL</code></li>
                <li><code>SUPABASE_ANON_KEY</code></li>
                <li><code>SUPABASE_SERVICE_ROLE_KEY</code></li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
