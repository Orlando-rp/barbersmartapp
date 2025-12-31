-- =====================================================
-- Adicionar campo de Logo Ícone (quadrado) ao branding
-- =====================================================
-- Este campo é usado para exibir um ícone quadrado na sidebar 
-- colapsada e em outros lugares que precisam de uma imagem quadrada.
-- Diferente do favicon que é pequeno (16-32px), o logo ícone é 
-- maior (64-128px) e mais adequado para interfaces de usuário.

ALTER TABLE system_branding 
ADD COLUMN IF NOT EXISTS logo_icon_url text;

COMMENT ON COLUMN system_branding.logo_icon_url IS 
'Logo ícone quadrado para sidebar colapsada e PWA (64-128px recomendado)';
