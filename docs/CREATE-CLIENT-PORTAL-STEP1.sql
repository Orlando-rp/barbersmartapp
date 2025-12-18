-- ===========================================
-- PORTAL DO CLIENTE - ETAPA 1: ADICIONAR ROLE
-- Execute este script PRIMEIRO e aguarde
-- ===========================================

-- Adicionar role 'cliente' ao enum app_role
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'cliente';

-- IMPORTANTE: Após executar, aguarde e execute o STEP2
