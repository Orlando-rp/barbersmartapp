
-- Alterar coluna user_id para permitir NULL temporariamente
-- Isso permite importar staff sem usuários vinculados
ALTER TABLE staff ALTER COLUMN user_id DROP NOT NULL;

-- Adicionar comentário explicativo
COMMENT ON COLUMN staff.user_id IS 'UUID do usuário auth.users. Pode ser NULL para staff importados aguardando vinculação com conta de usuário.';
