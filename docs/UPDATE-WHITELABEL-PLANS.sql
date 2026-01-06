-- =============================================
-- ATUALIZAÇÃO DOS PLANOS PARA WHITE LABEL
-- Execute no SQL Editor do Supabase
-- =============================================

-- Atualizar plano Enterprise com todas as features incluindo white_label
UPDATE subscription_plans
SET feature_flags = jsonb_set(
  jsonb_set(
    jsonb_set(
      jsonb_set(
        jsonb_set(
          jsonb_set(
            feature_flags,
            '{white_label}', 'true'::jsonb
          ),
          '{whatsapp_chatbot}', 'true'::jsonb
        ),
        '{whatsapp_notifications}', 'true'::jsonb
      ),
      '{whatsapp_chat}', 'true'::jsonb
    ),
    '{custom_domain}', 'true'::jsonb
  ),
  '{independent_whatsapp}', 'true'::jsonb  -- Nova feature: permite config WhatsApp independente
)
WHERE slug = 'enterprise';

-- Atualizar plano Premium com white_label e chatbot
UPDATE subscription_plans
SET feature_flags = jsonb_set(
  jsonb_set(
    jsonb_set(
      jsonb_set(
        jsonb_set(
          feature_flags,
          '{white_label}', 'true'::jsonb
        ),
        '{whatsapp_chatbot}', 'true'::jsonb
      ),
      '{whatsapp_notifications}', 'true'::jsonb
    ),
    '{whatsapp_chat}', 'true'::jsonb
  ),
  '{independent_whatsapp}', 'true'::jsonb
)
WHERE slug = 'premium';

-- Atualizar plano Professional (sem white_label, mas com chatbot)
UPDATE subscription_plans
SET feature_flags = jsonb_set(
  jsonb_set(
    jsonb_set(
      feature_flags,
      '{whatsapp_chatbot}', 'true'::jsonb
    ),
    '{whatsapp_notifications}', 'true'::jsonb
  ),
  '{whatsapp_chat}', 'true'::jsonb
)
WHERE slug = 'professional';

-- Atualizar plano Starter (apenas notificações básicas)
UPDATE subscription_plans
SET feature_flags = jsonb_set(
  feature_flags,
  '{whatsapp_notifications}', 'true'::jsonb
)
WHERE slug = 'starter';

-- Verificar atualizações
SELECT 
  slug, 
  name, 
  price,
  feature_flags->>'white_label' as white_label,
  feature_flags->>'whatsapp_chatbot' as whatsapp_chatbot,
  feature_flags->>'whatsapp_notifications' as whatsapp_notifications,
  feature_flags->>'independent_whatsapp' as independent_whatsapp
FROM subscription_plans
ORDER BY price DESC;
