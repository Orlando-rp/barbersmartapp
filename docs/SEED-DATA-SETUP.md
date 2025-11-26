# 🌱 Dados de Teste - BarberSmart

Este documento explica como popular o banco de dados com dados de teste para desenvolvimento e demonstração.

## 📋 O que será criado

O script `seed-data.sql` irá criar:

### 🏪 1 Barbearia
- **Barber Smart Premium** - Uma barbearia completa com horários, contato e logo

### 👥 5 Usuários com diferentes roles
- **Super Admin** - Acesso total ao sistema
- **Admin da Barbearia** - Gerencia a barbearia
- **2 Barbeiros** (João Santos e Maria Oliveira)
- **1 Recepcionista** (Ana Costa)

### 💼 8 Serviços
- Corte Simples (R$ 35,00)
- Corte + Barba (R$ 55,00)
- Barba Completa (R$ 30,00)
- Degradê (R$ 45,00)
- Corte Infantil (R$ 28,00)
- Sobrancelha (R$ 15,00)
- Luzes (R$ 120,00)
- Pacote Premium (R$ 85,00)

### 👨‍🦱 8 Clientes
- Clientes fictícios com telefone, email e observações

### 📅 9 Agendamentos
- 4 agendamentos para hoje
- 3 agendamentos para amanhã
- 2 agendamentos para depois de amanhã

### 💰 8 Transações
- 7 transações de receita (serviços concluídos)
- 1 transação de despesa
- Histórico dos últimos 30 dias

### 📢 1 Campanha de Marketing
- Promoção Dia dos Pais ativa

---

## 🚀 Como Executar

### Passo 1: Criar os Usuários no Supabase Auth

**IMPORTANTE:** Primeiro você precisa criar os usuários manualmente no Supabase Dashboard ou através da funcionalidade de SignUp da aplicação.

#### Opção A: Via Supabase Dashboard

1. Acesse o Supabase Dashboard
2. Vá em **Authentication** > **Users**
3. Clique em **Add User** e crie os seguintes usuários:

| Email | Senha | Nome Completo |
|-------|-------|---------------|
| super@admin.com | Admin123! | Super Administrador |
| admin@barbersmartpremium.com.br | Admin123! | Carlos Silva |
| joao@barbersmartpremium.com.br | Barbeiro123! | João Santos |
| maria@barbersmartpremium.com.br | Barbeiro123! | Maria Oliveira |
| recep@barbersmartpremium.com.br | Recep123! | Ana Costa |

4. **Anote os IDs (UUID) de cada usuário criado** - você precisará deles no próximo passo

#### Opção B: Via Interface da Aplicação

1. Acesse a página de SignUp da aplicação
2. Registre cada usuário com os dados acima
3. Copie os IDs dos usuários criados (você pode consultar na tabela `auth.users`)

### Passo 2: Atualizar os IDs no Script SQL

1. Abra o arquivo `docs/seed-data.sql`
2. Localize as seções com comentário `-- Substituir pelo ID real`
3. Substitua os UUIDs de exemplo pelos IDs reais dos usuários que você criou:

```sql
-- Exemplo: Se o ID do super admin for '123e4567-e89b-12d3-a456-426614174000'
-- Substitua em todas as ocorrências:

-- ANTES (exemplo):
'00000000-0000-0000-0000-000000000001'

-- DEPOIS (com ID real):
'123e4567-e89b-12d3-a456-426614174000'
```

**Locais que precisam ser atualizados:**
- Seção 3: CRIAR PERFIS DE USUÁRIOS (5 substituições)
- Seção 4: ATRIBUIR ROLES AOS USUÁRIOS (5 substituições)
- Seção 5: CRIAR EQUIPE (2 substituições)

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
SELECT * FROM appointments ORDER BY appointment_date, start_time;

-- Verificar transações
SELECT * FROM transactions ORDER BY transaction_date DESC;

-- Verificar campanhas
SELECT * FROM campaigns;
```

---

## 🔐 Credenciais de Teste

Após executar o script, você pode fazer login com qualquer um dos usuários criados:

### Super Admin
- **Email:** super@admin.com
- **Senha:** Admin123!
- **Acesso:** Total (todas as barbearias)

### Admin da Barbearia
- **Email:** admin@barbersmartpremium.com.br
- **Senha:** Admin123!
- **Acesso:** Gerencia a Barber Smart Premium

### Barbeiro (João)
- **Email:** joao@barbersmartpremium.com.br
- **Senha:** Barbeiro123!
- **Acesso:** Ver e gerenciar seus próprios agendamentos

### Barbeira (Maria)
- **Email:** maria@barbersmartpremium.com.br
- **Senha:** Barbeiro123!
- **Acesso:** Ver e gerenciar seus próprios agendamentos

### Recepcionista
- **Email:** recep@barbersmartpremium.com.br
- **Senha:** Recep123!
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

1. **RLS Policies:** Certifique-se de que as políticas RLS foram aplicadas antes de executar este script (veja `docs/rls-policies.sql`)

2. **UUIDs Únicos:** Não execute este script múltiplas vezes sem limpar os dados primeiro, pois os UUIDs são fixos e causarão erros de duplicação

3. **Datas Dinâmicas:** Os agendamentos usam `CURRENT_DATE`, então sempre terão datas relativas ao dia em que o script for executado

4. **Comissões:** As taxas de comissão dos barbeiros são 40% (João) e 45% (Maria)

5. **Horários:** A barbearia funciona de Segunda a Sábado, fechada aos Domingos

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

### Erro: "duplicate key value violates unique constraint"
- **Causa:** Você já executou este script antes
- **Solução:** Execute o script de limpeza de dados ou use UUIDs diferentes

### Erro: "violates foreign key constraint"
- **Causa:** Os IDs dos usuários no script não correspondem aos IDs reais
- **Solução:** Verifique e atualize os UUIDs conforme o Passo 2

### Erro: "new row violates row-level security policy"
- **Causa:** As políticas RLS não foram aplicadas corretamente
- **Solução:** Execute primeiro o script `docs/rls-policies.sql`

### Não consigo fazer login
- **Causa:** O usuário não foi criado no Supabase Auth
- **Solução:** Crie os usuários manualmente no Dashboard conforme o Passo 1

---

## 📞 Suporte

Se encontrar problemas, verifique:
1. As políticas RLS estão ativas?
2. Os IDs dos usuários foram substituídos corretamente?
3. Os usuários foram criados no Supabase Auth?
4. Você está logado com o usuário correto para os dados que está tentando acessar?
