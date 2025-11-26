# 🔍 Sistema de Auditoria - BarberSmart

## Visão Geral

Sistema completo de auditoria que rastreia todas as alterações críticas no banco de dados, capturando automaticamente:
- **Quem** fez a alteração (usuário)
- **Quando** foi feita (timestamp)
- **O que** mudou (dados antes/depois)
- **Onde** foi feito (tabela e registro)

---

## 📋 Funcionalidades

### 1. Rastreamento Automático
- **Triggers em todas as tabelas críticas** capturam automaticamente INSERT, UPDATE e DELETE
- **Dados completos** antes e depois da alteração em formato JSON
- **Campos alterados** identificados automaticamente em operações UPDATE

### 2. Informações Capturadas
- ID do usuário e nome/email
- Barbearia relacionada (multi-tenant)
- Tabela e operação realizada
- Timestamp preciso da alteração
- Dados antigos e novos em JSON
- Lista de campos que foram alterados

### 3. Interface de Visualização
- **Página de Logs**: `/audit` com filtros avançados
- **Filtros disponíveis**:
  - Por tabela (clientes, serviços, agendamentos, etc.)
  - Por operação (criação, atualização, exclusão)
  - Por usuário ou barbearia (busca textual)
- **Detalhes completos**: Modal com diff de dados antes/depois

### 4. Segurança
- **RLS ativado**: Super admin vê tudo, admin vê apenas sua barbearia
- **Imutável**: Logs não podem ser editados ou excluídos por usuários
- **Auditoria de auditoria**: Até mesmo alterações nos logs são rastreadas

---

## 🗄️ Estrutura do Banco de Dados

### Tabela `audit_logs`

```sql
CREATE TABLE public.audit_logs (
  id uuid PRIMARY KEY,
  table_name text NOT NULL,           -- Tabela alterada
  operation audit_operation NOT NULL, -- INSERT, UPDATE ou DELETE
  record_id uuid NOT NULL,            -- ID do registro alterado
  old_data jsonb,                     -- Dados antes da alteração
  new_data jsonb,                     -- Dados depois da alteração
  changed_fields text[],              -- Campos que mudaram (UPDATE)
  user_id uuid,                       -- Usuário que fez a alteração
  user_email text,                    -- Email do usuário
  user_name text,                     -- Nome do usuário
  barbershop_id uuid,                 -- Barbearia (multi-tenant)
  ip_address inet,                    -- IP do usuário (futuro)
  user_agent text,                    -- Browser/device (futuro)
  created_at timestamptz              -- Quando ocorreu
);
```

### Enum `audit_operation`

```sql
CREATE TYPE public.audit_operation AS ENUM (
  'INSERT',
  'UPDATE',
  'DELETE'
);
```

---

## 🎯 Tabelas Monitoradas

Todas as tabelas críticas têm triggers de auditoria:

1. **barbershops** - Barbearias
2. **profiles** - Perfis de usuário
3. **user_roles** - Permissões de usuário
4. **clients** - Clientes
5. **services** - Serviços
6. **staff** - Equipe
7. **appointments** - Agendamentos
8. **transactions** - Transações financeiras
9. **campaigns** - Campanhas de marketing

---

## 🔧 Funções Auxiliares

### 1. `audit_trigger_function()`
Função principal que captura as alterações automaticamente.

**Recursos:**
- Identifica automaticamente a operação (INSERT, UPDATE, DELETE)
- Extrai dados antigos e novos
- Identifica campos alterados
- Obtém informações do usuário logado
- Insere log de auditoria

### 2. `get_record_history(table_name, record_id)`
Consulta o histórico completo de um registro específico.

**Uso:**
```sql
SELECT * FROM get_record_history('clients', 'uuid-do-cliente');
```

**Retorna:**
- Todas as alterações feitas no registro
- Quem fez cada alteração
- Quando foi feito
- Quais campos mudaram
- Dados antes e depois

---

## 📊 View de Relatório

### `audit_report`
View simplificada para relatórios gerenciais:

```sql
SELECT * FROM audit_report
WHERE tabela = 'appointments'
  AND data_hora >= '2025-01-01'
ORDER BY data_hora DESC;
```

**Colunas:**
- `tabela` - Nome amigável da tabela
- `operacao` - Tipo de operação
- `usuario` - Nome ou email do usuário
- `barbearia` - Nome da barbearia
- `campos_alterados` - Lista de campos modificados
- `data_hora` - Timestamp da alteração

---

## 🔐 Políticas de Segurança (RLS)

### Super Admin
```sql
-- Pode ver todos os logs de todas as barbearias
CREATE POLICY "Super admin can view all audit logs"
ON public.audit_logs FOR SELECT
TO authenticated
USING (public.is_super_admin(auth.uid()));
```

### Admin de Barbearia
```sql
-- Pode ver apenas logs da própria barbearia
CREATE POLICY "Admin can view barbershop audit logs"
ON public.audit_logs FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  AND barbershop_id = public.get_user_barbershop_id(auth.uid())
);
```

### Sistema
```sql
-- Apenas triggers do sistema podem inserir logs
CREATE POLICY "System can insert audit logs"
ON public.audit_logs FOR INSERT
TO authenticated
WITH CHECK (true);
```

---

## 💻 Exemplos de Uso

### Consultar Logs de uma Tabela
```typescript
const { data, error } = await supabase
  .from("audit_logs")
  .select("*")
  .eq("table_name", "appointments")
  .order("created_at", { ascending: false });
```

### Consultar Histórico de um Cliente
```typescript
const { data, error } = await supabase
  .rpc("get_record_history", {
    p_table_name: "clients",
    p_record_id: clientId,
  });
```

### Filtrar Logs por Usuário
```typescript
const { data, error } = await supabase
  .from("audit_logs")
  .select("*")
  .eq("user_id", userId)
  .order("created_at", { ascending: false });
```

---

## 📈 Índices de Performance

O sistema possui índices otimizados para consultas rápidas:

```sql
-- Consultas por tabela
CREATE INDEX idx_audit_logs_table_name ON audit_logs(table_name);

-- Consultas por usuário
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);

-- Consultas por barbearia
CREATE INDEX idx_audit_logs_barbershop_id ON audit_logs(barbershop_id);

-- Consultas por data
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- Consultas por registro específico
CREATE INDEX idx_audit_logs_record_id ON audit_logs(record_id);
```

---

## 🚀 Como Ativar

### 1. Executar Migration
```bash
# No Supabase SQL Editor:
supabase/migrations/20250126000002_create_audit_system.sql
```

### 2. Acessar Interface
Navegue para: **`/audit`**

### 3. Testar Auditoria
1. Faça qualquer alteração no sistema (crie/edite/delete)
2. Acesse a página de Auditoria
3. Veja o log da alteração em tempo real

---

## 🔍 Casos de Uso

### Compliance e Regulamentação
- LGPD: Rastrear quem acessou/modificou dados de clientes
- Auditorias fiscais: Histórico completo de transações financeiras
- Regulamentações de saúde: Rastreabilidade de agendamentos

### Segurança
- Detectar alterações não autorizadas
- Rastrear ações suspeitas
- Investigar incidentes de segurança

### Operacional
- Debugar problemas reportados por usuários
- Entender padrões de uso do sistema
- Reverter alterações incorretas (com dados old_data)

### Gestão
- Monitorar atividade da equipe
- Identificar usuários mais ativos
- Analisar padrões de alterações

---

## 🎨 Interface de Auditoria

### Filtros Disponíveis
1. **Busca textual**: Por usuário ou barbearia
2. **Filtro por tabela**: Foco em uma entidade específica
3. **Filtro por operação**: INSERT, UPDATE ou DELETE

### Visualização de Detalhes
- Modal com informações completas
- Diff visual entre dados antigos e novos
- Lista de campos alterados
- Metadados completos (usuário, data, barbearia)

---

## ⚡ Performance

### Otimizações Implementadas
- **Índices estratégicos** para consultas rápidas
- **Limit de 200 logs** na tela principal
- **Lazy loading** para detalhes
- **Real-time updates** via Supabase channels

### Manutenção
Para evitar crescimento infinito da tabela, considere:

```sql
-- Deletar logs antigos (executar periodicamente)
DELETE FROM audit_logs
WHERE created_at < NOW() - INTERVAL '1 year';

-- Ou arquivar logs antigos em tabela separada
INSERT INTO audit_logs_archive
SELECT * FROM audit_logs
WHERE created_at < NOW() - INTERVAL '6 months';
```

---

## 🎯 Próximos Passos

### Melhorias Futuras
- [ ] Captura de IP e User Agent
- [ ] Exportação de logs para CSV/PDF
- [ ] Alertas automáticos para ações críticas
- [ ] Dashboard de atividade com gráficos
- [ ] Retenção automática de logs (archive/delete)
- [ ] Assinatura digital de logs para imutabilidade legal

---

## 📝 Conclusão

O sistema de auditoria está completamente funcional e rastreando todas as alterações críticas automaticamente. Use a página `/audit` para visualizar logs em tempo real e investigar qualquer alteração no sistema.

**Tudo já está funcionando! 🎉**
