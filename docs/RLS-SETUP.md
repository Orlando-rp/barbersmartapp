# Configuração de Políticas RLS (Row Level Security)

Este documento explica como configurar as políticas de segurança no Supabase para o BarberSmart.

## 📋 Resumo das Políticas

As políticas RLS implementam um sistema multi-tenant seguro com controle de acesso baseado em roles:

### Roles Disponíveis:
- **super_admin**: Acesso total ao sistema (todas as barbearias)
- **admin**: Acesso total à sua barbearia
- **barbeiro**: Acesso aos próprios agendamentos e informações relacionadas
- **recepcionista**: Gerenciamento de clientes e agendamentos

### Regras de Acesso por Tabela:

#### 1. **Profiles (Perfis)**
- ✅ Usuários podem ver e editar o próprio perfil
- ✅ Admins podem ver perfis da sua barbearia
- ✅ Super admins podem ver todos os perfis

#### 2. **User Roles (Funções)**
- ✅ Usuários podem ver suas próprias roles
- ✅ Super admins podem gerenciar todas as roles
- ✅ Admins podem ver roles da sua barbearia

#### 3. **Barbershops (Barbearias)**
- ✅ Super admins têm acesso total
- ✅ Usuários podem ver sua barbearia
- ✅ Admins podem atualizar dados da sua barbearia

#### 4. **Clients (Clientes)**
- ✅ Todos visualizam clientes da sua barbearia
- ✅ Admins e recepcionistas podem gerenciar clientes

#### 5. **Services (Serviços)**
- ✅ Todos visualizam serviços da sua barbearia
- ✅ Apenas admins podem gerenciar serviços

#### 6. **Staff (Equipe)**
- ✅ Todos visualizam equipe da sua barbearia
- ✅ Staff pode atualizar próprias informações
- ✅ Admins podem gerenciar toda equipe

#### 7. **Appointments (Agendamentos)**
- ✅ Todos visualizam agendamentos da sua barbearia
- ✅ Barbeiros podem gerenciar próprios agendamentos
- ✅ Admins e recepcionistas podem gerenciar todos agendamentos

#### 8. **Transactions (Transações)**
- ✅ Todos visualizam transações da sua barbearia
- ✅ Barbeiros podem ver suas próprias transações
- ✅ Admins podem gerenciar todas transações

#### 9. **Campaigns (Campanhas)**
- ✅ Todos visualizam campanhas da sua barbearia
- ✅ Admins podem gerenciar campanhas

## 🚀 Como Aplicar as Políticas

### Passo 1: Acessar o SQL Editor
1. Acesse [Supabase Dashboard](https://supabase.com/dashboard)
2. Selecione seu projeto
3. Vá em **SQL Editor** no menu lateral

### Passo 2: Executar o Script
1. Clique em **New query**
2. Copie todo o conteúdo do arquivo `docs/rls-policies.sql`
3. Cole no editor
4. Clique em **Run** (ou pressione Ctrl/Cmd + Enter)

### Passo 3: Verificar a Aplicação
Execute este comando para verificar se as políticas foram criadas:

```sql
SELECT schemaname, tablename, policyname 
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

Você deve ver todas as políticas listadas por tabela.

## 🔧 Funções de Segurança

O sistema usa 4 funções auxiliares (SECURITY DEFINER) para evitar recursão no RLS:

1. **`has_role(user_id, role)`**: Verifica se usuário tem uma role específica
2. **`get_user_barbershop_id(user_id)`**: Retorna o barbershop_id do usuário
3. **`is_super_admin(user_id)`**: Verifica se usuário é super admin
4. **`user_belongs_to_barbershop(user_id, barbershop_id)`**: Verifica se usuário pertence à barbearia

## 🧪 Testando as Políticas

### Criar um usuário admin de teste:

```sql
-- 1. Cadastre um usuário pelo frontend (Auth page)
-- 2. Execute este SQL para torná-lo admin:

-- Obtenha o user_id do usuário (substitua o email)
SELECT id FROM auth.users WHERE email = 'seu-email@exemplo.com';

-- Crie uma barbearia
INSERT INTO barbershops (name, active)
VALUES ('Minha Barbearia Teste', true)
RETURNING id;

-- Associe o usuário à barbearia
UPDATE profiles 
SET barbershop_id = 'ID_DA_BARBEARIA_AQUI'
WHERE id = 'ID_DO_USUARIO_AQUI';

-- Adicione a role de admin
INSERT INTO user_roles (user_id, role, barbershop_id)
VALUES ('ID_DO_USUARIO_AQUI', 'admin', 'ID_DA_BARBEARIA_AQUI');
```

### Testar acesso aos dados:

```sql
-- Login como o usuário criado e teste:

-- Deve funcionar: Ver clientes da sua barbearia
SELECT * FROM clients;

-- Deve funcionar: Criar novo cliente
INSERT INTO clients (barbershop_id, name, phone, active)
VALUES ('ID_DA_SUA_BARBEARIA', 'Cliente Teste', '11999999999', true);

-- Não deve funcionar: Ver clientes de outra barbearia
SELECT * FROM clients WHERE barbershop_id != 'ID_DA_SUA_BARBEARIA';
```

## 🛡️ Segurança Adicional

### Desabilitar email confirmation (apenas para desenvolvimento):
1. Vá em **Authentication → Settings** no Supabase
2. Desative **Enable email confirmations**
3. Isso acelera o processo de testes (reative em produção!)

### Habilitar RLS em novas tabelas:
```sql
ALTER TABLE nome_da_tabela ENABLE ROW LEVEL SECURITY;
```

## 📚 Documentação Oficial

- [Supabase RLS Documentation](https://supabase.com/docs/guides/auth/row-level-security)
- [PostgreSQL Row Security Policies](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)

## ⚠️ Importante

- **Sempre teste** as políticas antes de usar em produção
- **Nunca** desabilite RLS em tabelas com dados sensíveis
- **Use** funções SECURITY DEFINER para evitar recursão
- **Revise** as políticas regularmente conforme o sistema evolui
