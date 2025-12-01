# Instruções de Configuração WhatsApp

## 1. Criar Tabela de Logs no Supabase

Execute o script SQL no **Supabase SQL Editor**:

1. Acesse o Supabase Dashboard
2. Vá em **SQL Editor**
3. Crie uma nova query
4. Copie e cole o conteúdo do arquivo `docs/WHATSAPP-LOGS-SETUP.sql`
5. Execute o script (botão "Run" ou Ctrl+Enter)

Este script criará:
- Tabela `whatsapp_logs` para armazenar histórico de mensagens
- Índices para performance
- Políticas RLS (Row Level Security)
- Função `get_whatsapp_stats` para estatísticas

## 2. Configurar Secrets no Lovable Cloud

Configure as seguintes variáveis de ambiente secretas:

### WHATSAPP_API_TOKEN
Token de acesso do WhatsApp Business API obtido no Meta for Developers.

### WHATSAPP_PHONE_NUMBER_ID
ID do número de telefone WhatsApp Business configurado.

### Como obter as credenciais:

1. Acesse [Meta for Developers](https://developers.facebook.com/apps)
2. Crie um novo app ou use um existente
3. Adicione o produto "WhatsApp Business API"
4. Na seção "WhatsApp" > "API Setup":
   - Copie o **Phone Number ID**
   - Gere e copie um **Access Token** permanente
5. Adicione essas credenciais nas secrets do Lovable Cloud

## 3. Testar Integração

1. Acesse a página **Configurações WhatsApp** no menu
2. Preencha o formulário de teste com:
   - Número de telefone (formato: 5511999999999)
   - Mensagem de teste
3. Clique em "Enviar Mensagem de Teste"
4. Verifique:
   - Se a mensagem foi recebida
   - Se apareceu no histórico de mensagens
   - Se as estatísticas foram atualizadas

## 4. Funcionalidades Implementadas

### Automações Ativas:
- ✅ **Confirmação de Agendamento**: Enviada automaticamente ao criar novo agendamento
- 🔄 **Lembrete 24h antes**: Planejado para implementação futura
- 🔄 **Solicitação de avaliação**: Planejado para implementação futura

### Página de Configurações:
- ✅ Estatísticas de envio (últimos 30 dias)
- ✅ Formulário de teste
- ✅ Histórico completo de mensagens enviadas
- ✅ Status e erros detalhados
- ✅ Instruções de configuração

## 5. Troubleshooting

### Erro: "Failed to send a request to edge function"
- Verifique se o edge function `send-whatsapp` está deployado
- Aguarde alguns minutos após o deploy
- Verifique os logs da função no Supabase Dashboard

### Erro: "WhatsApp credentials not configured"
- Verifique se as secrets `WHATSAPP_API_TOKEN` e `WHATSAPP_PHONE_NUMBER_ID` estão configuradas
- As secrets devem estar no Lovable Cloud (não no código)

### Erro: "Failed to send WhatsApp message"
- Verifique se o número de telefone está no formato correto (com DDI)
- Verifique se o Access Token está válido
- Verifique se o Phone Number ID está correto
- Consulte os logs do edge function para mais detalhes

### Mensagens não aparecem no histórico
- Verifique se a tabela `whatsapp_logs` foi criada corretamente
- Verifique as políticas RLS
- Verifique os logs do edge function

## 6. Documentação Oficial

- [WhatsApp Business API - Getting Started](https://developers.facebook.com/docs/whatsapp/business-management-api/get-started)
- [WhatsApp Cloud API](https://developers.facebook.com/docs/whatsapp/cloud-api)
- [Meta for Developers](https://developers.facebook.com/)

## 7. Próximos Passos

- [ ] Implementar lembretes automáticos 24h antes do agendamento
- [ ] Implementar solicitação de avaliação após serviço concluído
- [ ] Criar templates de mensagem customizáveis
- [ ] Adicionar suporte a mensagens com mídia (imagens, documentos)
- [ ] Implementar chatbot para agendamentos via WhatsApp