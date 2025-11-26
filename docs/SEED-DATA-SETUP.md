# 🌱 Dados de Teste - BarberSmart

Este documento explica como popular o banco de dados com dados de teste para desenvolvimento e demonstração.

## 📋 O que será criado

O script `seed-data.sql` irá criar:

### 🏪 1 Barbearia
- **Barbearia Estilo & Classe** - Uma barbearia completa com horários, contato e logo

### 👥 5 Usuários com diferentes roles
- **Super Admin** - Acesso total ao sistema
- **Admin da Barbearia** - Gerencia a barbearia (Carlos Silva)
- **2 Barbeiros** (Paulo Silva e Ricardo Santos)
- **1 Recepcionista** (Ana Costa)

### 💼 8 Serviços
- Corte Simples (R$ 35,00)
- Corte + Barba (R$ 55,00)
- Barba Completa (R$ 30,00)
- Design de Sobrancelha (R$ 15,00)
- Hidratação Capilar (R$ 45,00)
- Pigmentação de Barba (R$ 80,00)
- Corte Infantil (R$ 25,00)
- Combo Premium (R$ 120,00)

### 👨‍🦱 8 Clientes
- Clientes fictícios com telefone, email e observações

### 📅 9 Agendamentos
- 5 agendamentos para hoje
- 4 agendamentos para os próximos dias

### 💰 8 Transações
- 6 transações de receita (serviços concluídos)
- 2 transações de despesa
- Histórico dos últimos 5 dias

### 📢 1 Campanha de Marketing
- Promoção Corte + Barba ativa

---

## 🚀 Como Executar

### Passo 0: Executar Migrations

Antes de inserir os dados, certifique-se de que as tabelas necessárias existem:

1. Acesse o Dashboard do Supabase
2. Vá em **Database** → **Migrations**
3. Execute as seguintes migrations na ordem:
   - `20250126000002_create_missing_tables.sql` - Cria as tabelas staff, transactions e campaigns
   - `20250126000003_add_rls_for_new_tables.sql` - Adiciona políticas RLS para as novas tabelas

### Passo 1: Criar Usuários no Supabase Auth

Primeiro, você precisa criar os usuários no Supabase Authentication:

1. Acesse o Dashboard do Supabase
2. Vá em **Authentication** → **Users**
3. Clique em "Add user" → "Create new user"
4. Crie os seguintes usuários (anote os IDs gerados):

| Email | Senha | Função |
|-------|-------|--------|
| superadmin@barbersmart.com | Admin@123 | Super Administrador |
| admin@estiloeclasse.com | Admin@123 | Administrador da Barbearia |
| barbeiro1@estiloeclasse.com | Barber@123 | Barbeiro 1 (Paulo Silva) |
| barbeiro2@estiloeclasse.com | Barber@123 | Barbeiro 2 (Ricardo Santos) |
| recepcionista@estiloeclasse.com | Recep@123 | Recepcionista |

**IMPORTANTE:** Anote os UUIDs de cada usuário criado. Você precisará substituí-los no script SQL.

### Passo 2: Atualizar os IDs no Script SQL

1. Abra o arquivo `docs/seed-data.sql`
2. Localize todos os IDs de exemplo e substitua pelos IDs reais:

**IDs a substituir:**
- `11a2b3c4-d5e6-7890-abcd-ef1234567890` → ID do Super Admin
- `22b3c4d5-e6f7-8901-bcde-f12345678901` → ID do Admin
- `33c4d5e6-f7a8-9012-cdef-123456789012` → ID do Barbeiro 1 (Paulo)
- `44d5e6f7-a8b9-0123-def1-234567890123` → ID do Barbeiro 2 (Ricardo)
- `55e6f7a8-b9c0-1234-ef12-345678901234` → ID da Recepcionista

Use o comando "Find and Replace" do seu editor para substituir todos os IDs de uma vez.

### Passo 3: Executar o Script

1. Acesse o Supabase Dashboard
2. Vá em **SQL Editor**
3. Clique em **New Query**
4. Copie todo o conteúdo do arquivo `docs/seed-data.sql`
5. Cole no editor SQL
6. Clique em **Run** ou pressione `Ctrl+Enter`

### Passo 4: Verificar os Dados

Execute as seguintes queries para verificar se os dados foram inseridos corretamente:

```sql
-- Verificar barbearia
SELECT * FROM barbershops;

-- Verificar perfis
SELECT * FROM profiles;

-- Verificar roles
SELECT * FROM user_roles;

-- Verificar equipe
SELECT * FROM staff;

-- Verificar serviços
SELECT * FROM services;

-- Verificar clientes
SELECT * FROM clients;

-- Verificar agendamentos
SELECT * FROM appointments ORDER BY appointment_date, appointment_time;

-- Verificar transações
SELECT * FROM transactions ORDER BY transaction_date DESC;

-- Verificar campanhas
SELECT * FROM campaigns;
```

---

## 🔐 Credenciais de Teste

Após executar o script, você pode fazer login com qualquer um dos usuários criados:

### Super Admin
- **Email:** superadmin@barbersmart.com
- **Senha:** Admin@123
- **Acesso:** Total (todas as barbearias)

### Admin da Barbearia
- **Email:** admin@estiloeclasse.com
- **Senha:** Admin@123
- **Acesso:** Gerencia a Barbearia Estilo & Classe

### Barbeiro 1 (Paulo Silva)
- **Email:** barbeiro1@estiloeclasse.com
- **Senha:** Barber@123
- **Acesso:** Ver e gerenciar seus próprios agendamentos

### Barbeiro 2 (Ricardo Santos)
- **Email:** barbeiro2@estiloeclasse.com
- **Senha:** Barber@123
- **Acesso:** Ver e gerenciar seus próprios agendamentos

### Recepcionista
- **Email:** recepcionista@estiloeclasse.com
- **Senha:** Recep@123
- **Acesso:** Gerenciar agendamentos e clientes

---

## 🧹 Limpar os Dados de Teste

Se você quiser remover todos os dados de teste e começar do zero:

```sql
-- CUIDADO: Isso irá deletar TODOS os dados!
-- Execute apenas em ambiente de desenvolvimento

DELETE FROM campaigns;
DELETE FROM transactions;
DELETE FROM appointments;
DELETE FROM clients;
DELETE FROM services;
DELETE FROM staff;
DELETE FROM user_roles;
DELETE FROM profiles;
DELETE FROM barbershops;

-- Os usuários em auth.users devem ser deletados manualmente
-- no Supabase Dashboard > Authentication > Users
```

---

## 📝 Notas Importantes

1. **Migrations Primeiro:** Certifique-se de executar as migrations de criação das tabelas antes do script de seed

2. **RLS Policies:** As políticas RLS devem estar aplicadas (arquivo `docs/rls-policies.sql`)

3. **UUIDs Únicos:** Não execute este script múltiplas vezes sem limpar os dados primeiro

4. **Datas Dinâmicas:** Os agendamentos usam `CURRENT_DATE`, então sempre terão datas relativas ao dia da execução

5. **Comissões:** As taxas de comissão são 40% (Paulo) e 45% (Ricardo)

6. **Horários:** A barbearia funciona de Segunda a Sábado, fechada aos Domingos

---

## 🎯 Próximos Passos

Após popular o banco de dados:

1. ✅ Faça login com diferentes usuários para testar as permissões
2. ✅ Crie novos agendamentos através da interface
3. ✅ Teste a visualização de relatórios financeiros
4. ✅ Verifique se cada role tem acesso apenas aos dados permitidos
5. ✅ Teste as notificações e funcionalidades de marketing

---

## 🆘 Problemas Comuns

### Erro: "column does not exist"
- **Causa:** As migrations de criação das tabelas não foram executadas
- **Solução:** Execute as migrations no Passo 0 antes do script de seed

### Erro: "duplicate key value violates unique constraint"
- **Causa:** Você já executou este script antes
- **Solução:** Execute o script de limpeza de dados ou use UUIDs diferentes

### Erro: "violates foreign key constraint"
- **Causa:** Os IDs dos usuários no script não correspondem aos IDs reais
- **Solução:** Verifique e atualize os UUIDs conforme o Passo 2

### Erro: "new row violates row-level security policy"
- **Causa:** As políticas RLS não foram aplicadas corretamente
- **Solução:** Execute o script `docs/rls-policies.sql` e também a migration de RLS

### Não consigo fazer login
- **Causa:** O usuário não foi criado no Supabase Auth
- **Solução:** Crie os usuários manualmente no Dashboard conforme o Passo 1

---

## 📞 Suporte

Se encontrar problemas, verifique:
1. As migrations foram executadas?
2. As políticas RLS estão ativas?
3. Os IDs dos usuários foram substituídos corretamente?
4. Os usuários foram criados no Supabase Auth?
5. Você está logado com o usuário correto para os dados que está tentando acessar?
