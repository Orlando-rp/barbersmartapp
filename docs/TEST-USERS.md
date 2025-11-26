# Credenciais de Teste - BarberSmart

Este documento contém as credenciais dos usuários de teste criados no sistema.

## ⚠️ Importante
- **Senha padrão para todos os usuários:** `123456`
- Para testar, faça login em `/auth` com cada uma das credenciais abaixo
- Após o login, você verá as permissões específicas de cada role

## 👤 Usuários de Teste

### 1. Super Admin
- **Email:** `admin@barber.com`
- **Senha:** `123456`
- **Role:** `super_admin`
- **Barbearia:** Nenhuma (acesso global)
- **Permissões:** Acesso total ao sistema, gerenciamento de todas as barbearias

### 2. Admin da Barbearia (Orlando)
- **Email:** `orlandoromulo@gmail.com`
- **Senha:** `123456`
- **Role:** `admin`
- **Barbearia:** Barbearia Estilo & Classe
- **Nome:** Carlos Silva
- **Permissões:** Gerenciamento completo da barbearia, equipe, finanças, configurações

### 3. Barbeiro - Paulo Silva
- **Email:** `paulo@barber.com`
- **Senha:** `123456`
- **Role:** `barbeiro`
- **Barbearia:** Barbearia Estilo & Classe
- **Especialidades:** Cortes clássicos, degradê
- **Permissões:** Ver e gerenciar seus próprios agendamentos, ver clientes, registrar atendimentos

### 4. Barbeiro - Ricardo Santos
- **Email:** `ricardo@barber.com`
- **Senha:** `123456`
- **Role:** `barbeiro`
- **Barbearia:** Barbearia Estilo & Classe
- **Especialidades:** Barbas, tratamentos
- **Permissões:** Ver e gerenciar seus próprios agendamentos, ver clientes, registrar atendimentos

### 5. Recepcionista - Ana Costa
- **Email:** `ana@barber.com`
- **Senha:** `123456`
- **Role:** `recepcionista`
- **Barbearia:** Barbearia Estilo & Classe
- **Permissões:** Gerenciar agendamentos de todos os barbeiros, cadastrar clientes, ver finanças básicas

## 🧪 Checklist de Testes

### Teste de Login
- [ ] Login com Super Admin funciona
- [ ] Login com Admin funciona
- [ ] Login com Barbeiro Paulo funciona
- [ ] Login com Barbeiro Ricardo funciona
- [ ] Login com Recepcionista funciona
- [ ] Após login, usuário é redirecionado para dashboard
- [ ] Logout funciona corretamente

### Teste de Permissões por Role

#### Super Admin
- [ ] Pode ver todas as barbearias
- [ ] Pode criar/editar/deletar barbearias
- [ ] Pode gerenciar usuários de qualquer barbearia
- [ ] Acesso a configurações globais do sistema

#### Admin da Barbearia
- [ ] Vê apenas dados da sua barbearia
- [ ] Pode criar/editar serviços
- [ ] Pode gerenciar equipe (barbeiros, recepcionistas)
- [ ] Pode ver relatórios financeiros completos
- [ ] Pode configurar horários de funcionamento
- [ ] Pode criar campanhas de marketing

#### Barbeiro
- [ ] Vê apenas seus próprios agendamentos
- [ ] Pode marcar agendamentos como concluídos
- [ ] Pode ver lista de clientes
- [ ] Não pode ver dados financeiros de outros barbeiros
- [ ] Pode ver suas próprias comissões
- [ ] Não pode editar serviços ou configurações

#### Recepcionista
- [ ] Pode criar agendamentos para qualquer barbeiro
- [ ] Pode ver lista completa de clientes
- [ ] Pode cadastrar novos clientes
- [ ] Pode ver agendamentos de todos os barbeiros
- [ ] Não pode ver relatórios financeiros completos
- [ ] Não pode editar configurações da barbearia

### Teste de Dados

#### Verificar se as tabelas têm dados:
- [ ] `barbershops` - 1 barbearia
- [ ] `profiles` - 5 perfis de usuário
- [ ] `user_roles` - 5 roles atribuídas
- [ ] `staff` - 2 barbeiros (Paulo e Ricardo)
- [ ] `services` - 8 serviços
- [ ] `clients` - 8 clientes
- [ ] `appointments` - 9 agendamentos
- [ ] `transactions` - 8 transações

## 🔍 Como Verificar os Dados

Execute o SQL abaixo no Supabase SQL Editor:

```sql
-- Verificar barbearias
SELECT COUNT(*) as total_barbershops FROM barbershops;

-- Verificar perfis
SELECT COUNT(*) as total_profiles FROM profiles;

-- Verificar roles
SELECT ur.role, COUNT(*) as total 
FROM user_roles ur 
GROUP BY ur.role 
ORDER BY ur.role;

-- Verificar staff
SELECT s.id, p.full_name, s.specialties 
FROM staff s
JOIN profiles p ON p.id = s.user_id;

-- Verificar serviços
SELECT COUNT(*) as total_services FROM services;

-- Verificar clientes
SELECT COUNT(*) as total_clients FROM clients;

-- Verificar agendamentos
SELECT status, COUNT(*) as total 
FROM appointments 
GROUP BY status;

-- Verificar transações
SELECT type, COUNT(*) as total, SUM(amount) as total_amount
FROM transactions 
GROUP BY type;
```

## 📧 Configuração do Supabase

### Desabilitar Confirmação de Email (Recomendado para Testes)
1. Vá para Authentication → Settings no Supabase
2. Desative a opção "Enable email confirmations"
3. Isso permite login imediato sem precisar confirmar o email

### URLs de Redirect
Certifique-se de configurar as URLs corretas em Authentication → URL Configuration:
- **Site URL:** URL da sua aplicação
- **Redirect URLs:** Adicione todas as URLs onde a aplicação pode rodar

## 🐛 Problemas Comuns

### Erro: "Invalid login credentials"
- Verifique se os usuários foram criados no Supabase Auth
- Confirme que a senha está correta (123456)
- Verifique se o email está correto

### Erro: "Row Level Security policy violation"
- Execute o script `docs/insert-user-roles.sql` para garantir que as roles estão cadastradas
- Verifique se as políticas RLS estão aplicadas corretamente

### Dados não aparecem após login
- Verifique se as políticas RLS estão permitindo acesso aos dados
- Confirme que o `barbershop_id` está correto no perfil do usuário
- Use o console do navegador para ver erros de API
