# Guia de Migração: Supabase Externo → Lovable Cloud

## Visão Geral

Este guia descreve o processo completo de migração de dados do Supabase externo (`nmsblmmhigwsevnqmhwn`) para o Lovable Cloud (`ivakuaptgwhdyfntonxh`).

## Pré-requisitos

- Acesso ao SQL Editor do Supabase externo
- Acesso ao Lovable Cloud (este projeto)
- Lista de usuários para criar no Auth

---

## Etapa 1: Preparar o Lovable Cloud

Execute a migration para adicionar colunas faltantes:

```sql
-- Arquivo: docs/MIGRATION-ADD-CHATBOT-ENABLED.sql
ALTER TABLE whatsapp_config 
ADD COLUMN IF NOT EXISTS chatbot_enabled BOOLEAN DEFAULT false;
```

---

## Etapa 2: Exportar Dados do Supabase Externo

1. Acesse o SQL Editor do Supabase externo
2. Execute o script `docs/EXPORT-ALL-DATA.sql` **seção por seção**
3. Para cada seção:
   - Execute a query
   - Copie os resultados (comandos INSERT)
   - Salve em um arquivo de texto

---

## Etapa 3: Criar Usuários no Auth

Antes de importar profiles e user_roles, você precisa criar os usuários no Auth do Lovable Cloud.

### Exportar lista de usuários (execute no Supabase externo):

```sql
SELECT 
  au.id,
  au.email,
  au.raw_user_meta_data->>'full_name' as full_name,
  p.phone,
  ur.role,
  ur.barbershop_id
FROM auth.users au
LEFT JOIN profiles p ON p.id = au.id
LEFT JOIN user_roles ur ON ur.user_id = au.id
ORDER BY au.created_at;
```

### Criar usuários no Lovable Cloud:

1. No Lovable Cloud, vá em Authentication > Users
2. Crie cada usuário com o **mesmo ID** (use a API ou ajuste manualmente)
3. Alternativamente, crie usuários com IDs novos e atualize os INSERTs

**IMPORTANTE**: Senhas não podem ser migradas. Após criar os usuários, envie emails de reset de senha.

---

## Etapa 4: Importar Dados no Lovable Cloud

Execute os INSERTs na seguinte **ordem**:

| Ordem | Tabela | Notas |
|-------|--------|-------|
| 1 | subscription_plans | |
| 2 | addon_modules | |
| 3 | global_payment_config | |
| 4 | system_branding | |
| 5 | system_config | |
| 6 | barbershops | Matriz primeiro (parent_id NULL) |
| 7 | service_categories | |
| 8 | services | |
| 9 | clients | |
| 10 | business_hours | |
| 11 | special_hours | |
| 12 | blocked_dates | |
| 13 | barbershop_domains | |
| 14 | payment_settings | |
| 15 | whatsapp_config | |
| 16 | message_templates | |
| 17 | campaigns | |
| 18 | coupons | |
| 19 | role_permissions | |
| 20 | subscriptions | |
| 21 | **CRIAR USUÁRIOS NO AUTH** | Etapa manual |
| 22 | profiles | |
| 23 | user_roles | |
| 24 | user_barbershops | |
| 25 | staff | |
| 26 | staff_units | |
| 27 | staff_services | |
| 28 | portfolio_photos | |
| 29 | loyalty_points | |
| 30 | client_users | |
| 31 | appointments | |
| 32 | transactions | |
| 33 | reviews | |
| 34 | whatsapp_messages | |
| 35 | whatsapp_logs | |
| 36 | chatbot_conversations | |
| 37 | subscription_addons | |
| 38 | loyalty_transactions | |
| 39 | waitlist | |
| 40 | usage_metrics | |

---

## Etapa 5: Migrar Arquivos do Storage

### Buckets a migrar:
- `avatars` - Fotos de perfil de usuários e clientes
- `portfolio` - Fotos do portfólio
- `service-images` - Imagens de serviços
- `white-label-assets` - Logos e branding

### Processo:
1. Download todos os arquivos do Storage externo
2. Upload para o Storage do Lovable Cloud
3. Verificar se as URLs estão corretas

---

## Etapa 6: Verificar Edge Functions

As Edge Functions já estão configuradas no Lovable Cloud. Verificar secrets:

| Secret | Descrição |
|--------|-----------|
| SUPABASE_URL | Automático |
| SUPABASE_SERVICE_ROLE_KEY | Automático |
| EVOLUTION_API_URL | URL da Evolution API |
| EVOLUTION_API_KEY | Chave da Evolution API |
| OPENAI_API_KEY | Chave da OpenAI (para chatbot) |

---

## Etapa 7: Atualizar Webhook da Evolution API

Após migração, atualize o webhook para:

```
https://ivakuaptgwhdyfntonxh.supabase.co/functions/v1/evolution-webhook
```

---

## Etapa 8: Testes Finais

Checklist de verificação:

- [ ] Login funciona corretamente
- [ ] Dashboard carrega dados
- [ ] Lista de agendamentos aparece
- [ ] Criar novo agendamento funciona
- [ ] WhatsApp Chat conecta
- [ ] Mensagens são persistidas
- [ ] Chatbot responde (se habilitado)
- [ ] Notificações são enviadas
- [ ] Relatórios mostram dados corretos

---

## Troubleshooting

### Erro: Foreign key violation
**Causa**: Tentando inserir dados antes das dependências
**Solução**: Siga a ordem de importação correta

### Erro: Duplicate key
**Causa**: Dados já existem no banco
**Solução**: Os INSERTs usam `ON CONFLICT DO UPDATE`, então podem ser re-executados

### Erro: User not found
**Causa**: Tentando inserir profile/user_role sem criar usuário no Auth
**Solução**: Crie o usuário no Auth primeiro

### Erro: Invalid enum value
**Causa**: Valor de enum não reconhecido
**Solução**: Verifique se os enums estão configurados corretamente

---

## Rollback

Se precisar reverter:

1. Os dados antigos do Supabase externo permanecem intactos
2. No Lovable Cloud, delete os dados importados na ordem inversa
3. Ou restaure um backup anterior (se disponível)

---

## Suporte

Se encontrar problemas durante a migração, verifique:

1. Logs de erro no console do navegador
2. Logs das Edge Functions
3. Contagem de registros em cada tabela
4. Integridade das foreign keys
