# Chatbot IA para Agendamento via WhatsApp

## SQL para criar tabela de conversas do chatbot

Execute o seguinte SQL no Supabase:

```sql
-- Tabela para armazenar conversas do chatbot
CREATE TABLE IF NOT EXISTS chatbot_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  barbershop_id UUID NOT NULL REFERENCES barbershops(id) ON DELETE CASCADE,
  client_phone TEXT NOT NULL,
  user_message TEXT NOT NULL,
  bot_response TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX idx_chatbot_conversations_barbershop ON chatbot_conversations(barbershop_id);
CREATE INDEX idx_chatbot_conversations_phone ON chatbot_conversations(client_phone);
CREATE INDEX idx_chatbot_conversations_created ON chatbot_conversations(created_at DESC);

-- RLS policies
ALTER TABLE chatbot_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view chatbot conversations" ON chatbot_conversations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_barbershops ub
      WHERE ub.barbershop_id = chatbot_conversations.barbershop_id
      AND ub.user_id = auth.uid()
    )
  );

-- Adicionar coluna message_type na tabela whatsapp_logs (se não existir)
ALTER TABLE whatsapp_logs ADD COLUMN IF NOT EXISTS message_type TEXT DEFAULT 'manual';
```

## Como funciona o Chatbot

1. **Recebimento de Mensagens**: O Evolution API recebe mensagens do WhatsApp e encaminha para o webhook do chatbot.

2. **Processamento com IA**: O chatbot usa GPT-4o-mini para entender a intenção do cliente:
   - Agendar um serviço
   - Reagendar compromisso
   - Cancelar compromisso
   - Tirar dúvidas

3. **Fluxo de Agendamento**:
   - Identifica o serviço desejado
   - Pergunta preferência de profissional
   - Sugere horários disponíveis
   - Confirma dados do cliente
   - Cria o agendamento automaticamente

4. **Resposta Automática**: O chatbot responde via WhatsApp usando a Evolution API.

## Configuração do Webhook no Evolution API

Para ativar o chatbot, configure o webhook no Evolution API:

1. Acesse o painel do Evolution API
2. Configure o webhook para a instância:
   ```
   URL: https://nmsblmmhigwsevnqmhwn.supabase.co/functions/v1/whatsapp-chatbot
   Events: MESSAGES_UPSERT
   ```

3. O payload enviado deve incluir:
   - `message`: Texto da mensagem recebida
   - `from`: Número do cliente
   - `barbershopId`: ID da barbearia
   - `instanceName`: Nome da instância Evolution
   - `apiUrl`: URL da Evolution API
   - `apiKey`: Chave da API (opcional)

## Exemplo de teste via cURL

```bash
curl -X POST https://nmsblmmhigwsevnqmhwn.supabase.co/functions/v1/whatsapp-chatbot \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Olá, gostaria de agendar um corte",
    "from": "5511999999999",
    "barbershopId": "seu-barbershop-id",
    "instanceName": "barbershop-instance",
    "apiUrl": "https://sua-evolution-api.com"
  }'
```
