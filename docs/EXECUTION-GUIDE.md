# 🚀 Guia de Execução - BarberSmart

Este guia descreve o processo completo para configurar o banco de dados do BarberSmart no Supabase.

---

## 📋 Pré-requisitos

- ✅ Conta no Supabase com projeto criado
- ✅ Acesso ao SQL Editor do Supabase
- ✅ Credenciais do projeto atualizadas em `src/lib/supabase.ts`

---

## 🔧 Passo 1: Executar Migrations

Execute as migrations na ordem correta no **Supabase SQL Editor** (Dashboard > SQL Editor > New Query):

### 1.1 - Criar Tabelas Faltantes

Copie e execute o conteúdo de:
```
supabase/migrations/20250126000001_create_missing_tables.sql
```

Esta migration irá:
- ✅ Criar tabelas `staff`, `transactions` e `campaigns`
- ✅ Adicionar índices para performance
- ✅ Configurar triggers de `updated_at`
- ✅ Habilitar Row Level Security (RLS)

### 1.2 - Configurar Políticas RLS

Copie e execute o conteúdo de:
```
supabase/migrations/20250126000002_add_rls_policies.sql
```

Esta migration irá:
- ✅ Criar políticas RLS para `staff`
- ✅ Criar políticas RLS para `transactions`
- ✅ Criar políticas RLS para `campaigns`

**⚠️ IMPORTANTE:** Esta migration assume que as seguintes funções helper já existem no banco:
- `public.is_super_admin(user_id uuid)`
- `public.get_user_barbershop(user_id uuid)`
- `public.has_role(user_id uuid, role text)`

Se essas funções não existirem, execute primeiro as migrations anteriores que as criam.

---

## 👥 Passo 2: Criar Usuários no Supabase Auth

Acesse: **Authentication > Users > Add User**

Crie os seguintes usuários:

### 2.1 - Super Admin
- **Email:** `admin@barbersmart.com`
- **Senha:** `Admin@123456`
- **Auto-confirm:** ✅ Sim
- **Anote o UUID gerado:** `________________________________________`

### 2.2 - Admin da Barbearia
- **Email:** `admin@barbearia.com`
- **Senha:** `Barber@123456`
- **Auto-confirm:** ✅ Sim
- **Anote o UUID gerado:** `________________________________________`

### 2.3 - Barbeiro 1 (Carlos Mendes)
- **Email:** `carlos@barbearia.com`
- **Senha:** `Barber@123456`
- **Auto-confirm:** ✅ Sim
- **Anote o UUID gerado:** `________________________________________`

### 2.4 - Barbeiro 2 (Ricardo Santos)
- **Email:** `ricardo@barbearia.com`
- **Senha:** `Barber@123456`
- **Auto-confirm:** ✅ Sim
- **Anote o UUID gerado:** `________________________________________`

### 2.5 - Recepcionista (Ana Paula)
- **Email:** `ana@barbearia.com`
- **Senha:** `Barber@123456`
- **Auto-confirm:** ✅ Sim
- **Anote o UUID gerado:** `________________________________________`

---

## 📝 Passo 3: Atualizar IDs no Script de Seed

Abra o arquivo `docs/seed-data.sql` e substitua os UUIDs nos seguintes locais:

### 3.1 - Seção de Profiles (linhas ~46-104)

```sql
-- Super Admin
INSERT INTO public.profiles (id, barbershop_id, full_name, ...)
VALUES (
  'COLE_AQUI_O_UUID_DO_SUPER_ADMIN',  -- ← Substituir
  NULL,
  'Super Admin BarberSmart',
  ...
);

-- Admin da Barbearia
INSERT INTO public.profiles (id, barbershop_id, full_name, ...)
VALUES (
  'COLE_AQUI_O_UUID_DO_ADMIN_BARBEARIA',  -- ← Substituir
  'b1a2c3d4-e5f6-7890-abcd-ef1234567890',
  'João Silva',
  ...
);

-- E assim por diante para os outros 3 usuários...
```

### 3.2 - Seção de User Roles (linhas ~111-148)

```sql
-- Super Admin Role
INSERT INTO public.user_roles (id, user_id, role, barbershop_id, ...)
VALUES (
  gen_random_uuid(),
  'COLE_AQUI_O_UUID_DO_SUPER_ADMIN',  -- ← Substituir
  'super_admin',
  NULL,
  ...
);

-- E assim por diante para os outros papéis...
```

### 3.3 - Seção de Staff (linhas ~155-194)

```sql
-- Carlos Mendes - Barbeiro
INSERT INTO public.staff (id, barbershop_id, user_id, ...)
VALUES (
  '11e6f7g8-h9i0-1234-9012-345678901234',
  'b1a2c3d4-e5f6-7890-abcd-ef1234567890',
  'COLE_AQUI_O_UUID_DO_CARLOS',  -- ← Substituir
  ...
);

-- E assim por diante para o Ricardo...
```

---

## 🎯 Passo 4: Executar Script de Seed

No **Supabase SQL Editor**, copie e cole **TODO** o conteúdo do arquivo `docs/seed-data.sql` (já atualizado com os IDs reais).

Clique em **Run** para executar o script completo.

---

## ✅ Passo 5: Verificar Dados

Execute as queries de verificação:

```sql
-- Verificar barbearia criada
SELECT * FROM public.barbershops;

-- Verificar profiles
SELECT id, full_name, barbershop_id FROM public.profiles;

-- Verificar roles
SELECT u.user_id, u.role, p.full_name 
FROM public.user_roles u
JOIN public.profiles p ON u.user_id = p.id;

-- Verificar staff
SELECT s.id, p.full_name, s.specialties, s.commission_rate
FROM public.staff s
JOIN public.profiles p ON s.user_id = p.id;

-- Verificar serviços
SELECT name, category, price, duration FROM public.services;

-- Verificar clientes
SELECT name, phone, tags FROM public.clients;

-- Verificar agendamentos
SELECT 
  a.appointment_date,
  a.appointment_time,
  a.client_name,
  a.service_name,
  a.status
FROM public.appointments a
ORDER BY a.appointment_date DESC, a.appointment_time DESC;

-- Verificar transações
SELECT 
  type,
  amount,
  category,
  payment_method,
  description,
  transaction_date
FROM public.transactions
ORDER BY transaction_date DESC;

-- Verificar campanhas
SELECT name, type, status, config FROM public.campaigns;
```

---

## 🔐 Passo 6: Testar Login

Acesse a aplicação e teste o login com cada usuário:

### Super Admin
- **Email:** `admin@barbersmart.com`
- **Senha:** `Admin@123456`
- **Acesso:** Todas as barbearias e funcionalidades

### Admin da Barbearia
- **Email:** `admin@barbearia.com`
- **Senha:** `Barber@123456`
- **Acesso:** Gestão completa da barbearia

### Barbeiro (Carlos)
- **Email:** `carlos@barbearia.com`
- **Senha:** `Barber@123456`
- **Acesso:** Visualizar seus agendamentos e atualizar status

### Barbeiro (Ricardo)
- **Email:** `ricardo@barbearia.com`
- **Senha:** `Barber@123456`
- **Acesso:** Visualizar seus agendamentos e atualizar status

### Recepcionista
- **Email:** `ana@barbearia.com`
- **Senha:** `Barber@123456`
- **Acesso:** Gerenciar agendamentos e clientes

---

## 🐛 Problemas Comuns

### Erro: "column does not exist"
**Solução:** Verifique se as migrations foram executadas na ordem correta.

### Erro: "duplicate key value"
**Solução:** Limpe os dados antigos antes de executar o seed novamente:
```sql
DELETE FROM public.campaigns;
DELETE FROM public.transactions;
DELETE FROM public.appointments;
DELETE FROM public.staff;
DELETE FROM public.services;
DELETE FROM public.clients;
DELETE FROM public.user_roles;
DELETE FROM public.profiles;
DELETE FROM public.barbershops;
```

### Erro: "violates foreign key constraint"
**Solução:** Certifique-se de que substituiu TODOS os UUIDs no script de seed pelos IDs reais dos usuários criados no Auth.

### Erro: "violates row-level security policy"
**Solução:** Verifique se as políticas RLS foram criadas corretamente executando a migration `20250126000002_add_rls_policies.sql`.

### Não consigo fazer login
**Solução:** 
1. Verifique se o usuário foi criado no Supabase Auth
2. Confirme que o email foi confirmado (auto-confirm ativado)
3. Verifique se as credenciais do Supabase em `src/lib/supabase.ts` estão corretas

---

## 📚 Próximos Passos

Após configurar o banco de dados com sucesso:

1. ✅ Testar todas as páginas da aplicação
2. ✅ Verificar permissões de cada role
3. ✅ Criar novos agendamentos
4. ✅ Adicionar novos clientes
5. ✅ Registrar transações
6. ✅ Verificar relatórios financeiros

---

## 🆘 Suporte

Se encontrar problemas:
1. Verifique o console do navegador para erros JavaScript
2. Verifique os logs do Supabase para erros de banco de dados
3. Consulte a documentação em `docs/barbersmart_schema.md`
