-- Adicionar campo 'preferred_name' (Como quer ser chamado) nas tabelas clients e profiles
-- Este campo será usado para personalizar notificações, mensagens e emails

-- Adicionar preferred_name na tabela clients
ALTER TABLE clients ADD COLUMN IF NOT EXISTS preferred_name TEXT;

-- Adicionar preferred_name na tabela profiles (staff/funcionários)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS preferred_name TEXT;

-- Comentários de documentação
COMMENT ON COLUMN clients.preferred_name IS 'Nome preferido do cliente para notificações (ex: apelido)';
COMMENT ON COLUMN profiles.preferred_name IS 'Nome preferido do profissional para comunicações (ex: apelido)';

-- Índices para busca (opcional, se necessário)
-- CREATE INDEX IF NOT EXISTS idx_clients_preferred_name ON clients(preferred_name) WHERE preferred_name IS NOT NULL;
-- CREATE INDEX IF NOT EXISTS idx_profiles_preferred_name ON profiles(preferred_name) WHERE preferred_name IS NOT NULL;
