# 📘 Barber Smart – Database Documentation

Documentação oficial do banco de dados do sistema **Barber Smart** — um sistema de gestão de barbearias com arquitetura **multi-tenant**, segurança avançada via **Row Level Security (RLS)** e integração total com Supabase Auth.

---

# 🧾 Resumo Geral

Este projeto implementa:

- Estrutura de banco de dados profissional  
- Suporte multi-tenant (várias barbearias no mesmo sistema)  
- Controle de acesso baseado em papéis (RBAC)  
- Policies de Row Level Security  
- Triggers automáticas  
- Funções de segurança (Security Definer)  
- Seed de dados com barbearia, serviços, clientes, agendamentos etc.  

---

# 🔧 O que foi configurado

## ✔️ 1. Tabelas principais criadas

| Tabela | Função |
|-------|--------|
| barbershops | informações das barbearias |
| profiles | perfis dos usuários do Supabase Auth |
| user_roles | sistema de papéis e permissões |
| clients | clientes atendidos |
| services | serviços oferecidos |
| staff | equipe da barbearia |
| appointments | agendamentos |
| transactions | fluxo de caixa |
| campaigns | campanhas de marketing |

---

## ✔️ 2. Enums criados

### `app_role`
- super_admin  
- admin  
- barbeiro  
- recepcionista  

### `appointment_status`
- pendente  
- confirmado  
- concluido  
- cancelado  
- falta  

### `transaction_type`
- receita  
- despesa  

### `payment_method`
- dinheiro  
- cartao_credito  
- cartao_debito  
- pix  
- transferencia  

---

## ✔️ 3. Funções de segurança

- `has_role(user_id, role)`
- `get_user_barbershop(user_id)`
- `is_super_admin(user_id)`
- `user_belongs_to_barbershop(user_id, barbershop_id)`

---

## ✔️ 4. Triggers configuradas

### Criação automática de perfil
Ao criar usuário no Auth → cria perfil automaticamente.

### Atualização automática de updated_at
Em barbershops, profiles, clients, services, appointments.

---

## ✔️ 5. RLS ativado

Ativado em todas as tabelas com políticas para:

- super_admin acessar tudo  
- admin acessar dados da própria barbearia  
- barbeiro acessar apenas seus agendamentos  
- recepcionista gerenciar agenda e clientes  
- usuários comuns acessar apenas seus dados  

---

# 🗄 SCHEMA COMPLETO DO BANCO

## barbershops

```
id uuid PK
name text
address text
phone text
email text
logo_url text
settings jsonb
active boolean
created_at timestamptz
updated_at timestamptz
```

## profiles

```
id uuid PK (FK → auth.users.id)
barbershop_id uuid FK
full_name text
phone text
avatar_url text
created_at timestamptz
updated_at timestamptz
```

## user_roles

```
id uuid PK
user_id uuid FK
role app_role
barbershop_id uuid FK
created_at timestamptz
UNIQUE (user_id, role, barbershop_id)
```

## clients

```
id uuid PK
barbershop_id uuid FK
name text
email text
phone text
birth_date date
address text
notes text
tags text[]
active boolean
created_at timestamptz
updated_at timestamptz
```

## services

```
id uuid PK
barbershop_id uuid FK
name text
description text
category text
price decimal(10,2)
duration integer
active boolean
created_at timestamptz
updated_at timestamptz
```

## staff

```
id uuid PK
barbershop_id uuid FK (matriz)
user_id uuid FK
specialties text[]
commission_rate decimal(5,2) (default, usado se não houver config na unidade)
schedule jsonb (default, usado se não houver config na unidade)
active boolean
created_at timestamptz
updated_at timestamptz
UNIQUE (barbershop_id, user_id)
```

## staff_units

```
id uuid PK
staff_id uuid FK (referencia staff da matriz)
barbershop_id uuid FK (unidade específica)
commission_rate decimal(5,2) (config específica da unidade)
schedule jsonb (horário específico da unidade)
active boolean
created_at timestamptz
updated_at timestamptz
UNIQUE (staff_id, barbershop_id)
```

## appointments

```
id uuid PK
barbershop_id uuid FK
client_id uuid FK
staff_id uuid FK
service_id uuid FK
appointment_date date
appointment_time time
status appointment_status
notes text
client_name text
client_phone text
service_name text
service_price decimal(10,2)
created_at timestamptz
updated_at timestamptz
```

## transactions

```
id uuid PK
barbershop_id uuid FK
appointment_id uuid FK
type transaction_type
amount decimal(10,2)
category text
payment_method payment_method
description text
transaction_date date
created_by uuid FK
created_at timestamptz
updated_at timestamptz
```

## campaigns

```
id uuid PK
barbershop_id uuid FK
name text
type text
status text
config jsonb
created_at timestamptz
updated_at timestamptz
```

---

# 🔗 Relacionamentos

```
auth.users (1) ---- (1) profiles
profiles (1) ---- (N) user_roles
barbershops (1) ---- (N) profiles
barbershops (1) ---- (N) clients
barbershops (1) ---- (N) services
barbershops (1) ---- (N) staff
staff (1) ---- (N) appointments
clients (1) ---- (N) appointments
services (1) ---- (N) appointments
appointments (1) ---- (N) transactions
```

---

# 🎯 Conclusão

Você agora possui:

- Banco robusto  
- Multi-tenant  
- Segurança avançada  
- Seed inicial funcional  
- Estrutura pronta para escalar backend, frontend e automações.  
