-- ==============================================================
-- CREATE-ADDON-MODULES.sql
-- Sistema de Assinatura Modular - BarberSmart
-- Criação de tabelas para módulos add-on e pacotes configuráveis
-- ==============================================================

-- 1. Criar tabela addon_modules para armazenar os módulos disponíveis
CREATE TABLE IF NOT EXISTS addon_modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(50) UNIQUE NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL DEFAULT 0,
  features_enabled JSONB NOT NULL DEFAULT '{}',
  category VARCHAR(50) NOT NULL DEFAULT 'general',
  icon VARCHAR(50) DEFAULT 'package',
  sort_order INTEGER DEFAULT 0,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Criar tabela subscription_addons para vincular assinaturas aos add-ons
CREATE TABLE IF NOT EXISTS subscription_addons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
  addon_id UUID NOT NULL REFERENCES addon_modules(id) ON DELETE CASCADE,
  added_at TIMESTAMPTZ DEFAULT NOW(),
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(subscription_id, addon_id)
);

-- 3. Adicionar colunas para suporte a pacotes no subscription_plans
ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS is_base_plan BOOLEAN DEFAULT false;
ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS is_bundle BOOLEAN DEFAULT false;
ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS included_addons UUID[] DEFAULT '{}';
ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS discount_percentage DECIMAL(5,2) DEFAULT 0;
ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS highlight_text VARCHAR(100);

-- 4. Habilitar RLS nas novas tabelas
ALTER TABLE addon_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_addons ENABLE ROW LEVEL SECURITY;

-- 5. Políticas RLS para addon_modules
DROP POLICY IF EXISTS "Anyone can view active addon modules" ON addon_modules;
CREATE POLICY "Anyone can view active addon modules"
  ON addon_modules FOR SELECT
  USING (active = true);

DROP POLICY IF EXISTS "Super admins can manage addon modules" ON addon_modules;
CREATE POLICY "Super admins can manage addon modules"
  ON addon_modules FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role = 'super_admin'
    )
  );

-- 6. Políticas RLS para subscription_addons
DROP POLICY IF EXISTS "Users can view own subscription addons" ON subscription_addons;
CREATE POLICY "Users can view own subscription addons"
  ON subscription_addons FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM subscriptions s
      JOIN barbershops b ON b.id = s.barbershop_id
      WHERE s.id = subscription_addons.subscription_id
      AND (
        EXISTS (
          SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'super_admin'
        )
        OR user_has_access_to_barbershop_hierarchy(auth.uid(), s.barbershop_id)
      )
    )
  );

DROP POLICY IF EXISTS "Super admins can manage subscription addons" ON subscription_addons;
CREATE POLICY "Super admins can manage subscription addons"
  ON subscription_addons FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role = 'super_admin'
    )
  );

-- 7. Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_addon_modules_slug ON addon_modules(slug);
CREATE INDEX IF NOT EXISTS idx_addon_modules_category ON addon_modules(category);
CREATE INDEX IF NOT EXISTS idx_addon_modules_active ON addon_modules(active);
CREATE INDEX IF NOT EXISTS idx_subscription_addons_subscription_id ON subscription_addons(subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscription_addons_addon_id ON subscription_addons(addon_id);

-- 8. Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_addon_modules_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_addon_modules_updated_at ON addon_modules;
CREATE TRIGGER update_addon_modules_updated_at
  BEFORE UPDATE ON addon_modules
  FOR EACH ROW
  EXECUTE FUNCTION update_addon_modules_updated_at();

-- 9. Inserir módulos add-on padrão
INSERT INTO addon_modules (name, slug, description, price, features_enabled, category, icon, sort_order)
VALUES
  -- Módulos de Comunicação
  ('WhatsApp Básico', 'whatsapp_basic', 'Notificações e lembretes automáticos via WhatsApp', 19.90, 
   '{"whatsapp_notifications": true}', 'comunicacao', 'message-square', 10),
  
  ('WhatsApp Avançado', 'whatsapp_advanced', 'Chat integrado + Chatbot com IA para agendamento automático', 39.90,
   '{"whatsapp_notifications": true, "whatsapp_chat": true, "whatsapp_chatbot": true}', 'comunicacao', 'bot', 20),
  
  -- Módulos de Marketing
  ('Marketing', 'marketing', 'Campanhas promocionais e cupons de desconto', 24.90,
   '{"marketing_campaigns": true, "marketing_coupons": true}', 'marketing', 'megaphone', 30),
  
  ('Programa de Fidelidade', 'loyalty', 'Sistema de pontos e recompensas para clientes', 14.90,
   '{"loyalty_program": true}', 'marketing', 'gift', 40),
  
  -- Módulos de Gestão
  ('Comissões', 'commissions', 'Cálculo automático de comissões por profissional', 14.90,
   '{"commissions": true, "staff_earnings": true}', 'gestao', 'calculator', 50),
  
  ('Relatórios Avançados', 'reports', 'Métricas detalhadas, análises e exportação de dados', 19.90,
   '{"advanced_reports": true, "predictive_analytics": true, "export_data": true}', 'gestao', 'bar-chart-3', 60),
  
  -- Módulos Empresariais
  ('Multi-unidade', 'multi_unit', 'Gerencie até 5 unidades em um painel centralizado', 49.90,
   '{"multi_unit": true, "multi_unit_reports": true}', 'empresarial', 'building-2', 70),
  
  ('White Label', 'white_label', 'Domínio próprio e personalização completa da marca', 99.90,
   '{"white_label": true, "custom_domain": true}', 'empresarial', 'palette', 80)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  price = EXCLUDED.price,
  features_enabled = EXCLUDED.features_enabled,
  category = EXCLUDED.category,
  icon = EXCLUDED.icon,
  sort_order = EXCLUDED.sort_order,
  updated_at = NOW();

-- 10. Criar/Atualizar pacote base obrigatório
INSERT INTO subscription_plans (
  name, slug, description, price, billing_period,
  max_staff, max_clients, max_appointments_month,
  is_base_plan, is_bundle, discount_percentage,
  feature_flags, active
)
VALUES (
  'Base', 'base', 'Pacote base obrigatório com funcionalidades essenciais',
  29.90, 'monthly',
  3, 100, 200,
  true, false, 0,
  '{
    "appointments": true,
    "clients": true,
    "services": true,
    "staff_basic": true,
    "finance_basic": true,
    "public_booking": true,
    "business_hours": true,
    "basic_reports": true,
    "reviews": true,
    "client_history": true,
    "waitlist": true
  }'::jsonb,
  true
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  price = EXCLUDED.price,
  is_base_plan = EXCLUDED.is_base_plan,
  feature_flags = EXCLUDED.feature_flags,
  updated_at = NOW();

-- 11. Criar os 3 pacotes pré-configurados

-- Pacote Essencial: Base + WhatsApp Básico = R$ 49,90 (economia de R$ 0 pois é o mínimo recomendado)
INSERT INTO subscription_plans (
  name, slug, description, price, billing_period,
  max_staff, max_clients, max_appointments_month,
  is_base_plan, is_bundle, discount_percentage, highlight_text,
  feature_flags, active
)
VALUES (
  'Essencial', 'essencial', 'Ideal para barbearias pequenas. Inclui agendamento online e notificações WhatsApp.',
  49.90, 'monthly',
  3, 150, 300,
  false, true, 0, 'Comece Agora',
  '{
    "appointments": true,
    "clients": true,
    "services": true,
    "staff_basic": true,
    "finance_basic": true,
    "public_booking": true,
    "business_hours": true,
    "basic_reports": true,
    "reviews": true,
    "client_history": true,
    "waitlist": true,
    "whatsapp_notifications": true
  }'::jsonb,
  true
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  price = EXCLUDED.price,
  max_staff = EXCLUDED.max_staff,
  max_clients = EXCLUDED.max_clients,
  max_appointments_month = EXCLUDED.max_appointments_month,
  is_bundle = EXCLUDED.is_bundle,
  discount_percentage = EXCLUDED.discount_percentage,
  highlight_text = EXCLUDED.highlight_text,
  feature_flags = EXCLUDED.feature_flags,
  updated_at = NOW();

-- Pacote Profissional: Base + WhatsApp + Marketing + Comissões + Relatórios = R$ 97,90 (economia de R$ 30)
INSERT INTO subscription_plans (
  name, slug, description, price, billing_period,
  max_staff, max_clients, max_appointments_month,
  is_base_plan, is_bundle, discount_percentage, highlight_text,
  feature_flags, active
)
VALUES (
  'Profissional', 'profissional', 'Para barbearias em crescimento. Marketing, comissões e relatórios avançados.',
  97.90, 'monthly',
  8, 500, 1000,
  false, true, 23, 'Mais Popular',
  '{
    "appointments": true,
    "clients": true,
    "services": true,
    "staff_basic": true,
    "staff_advanced": true,
    "staff_earnings": true,
    "finance_basic": true,
    "finance_advanced": true,
    "commissions": true,
    "public_booking": true,
    "business_hours": true,
    "basic_reports": true,
    "advanced_reports": true,
    "export_data": true,
    "reviews": true,
    "client_history": true,
    "waitlist": true,
    "whatsapp_notifications": true,
    "marketing_campaigns": true,
    "marketing_coupons": true
  }'::jsonb,
  true
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  price = EXCLUDED.price,
  max_staff = EXCLUDED.max_staff,
  max_clients = EXCLUDED.max_clients,
  max_appointments_month = EXCLUDED.max_appointments_month,
  is_bundle = EXCLUDED.is_bundle,
  discount_percentage = EXCLUDED.discount_percentage,
  highlight_text = EXCLUDED.highlight_text,
  feature_flags = EXCLUDED.feature_flags,
  updated_at = NOW();

-- Pacote Completo: Todos os módulos exceto White Label = R$ 197,90 (economia de R$ 50+)
INSERT INTO subscription_plans (
  name, slug, description, price, billing_period,
  max_staff, max_clients, max_appointments_month,
  is_base_plan, is_bundle, discount_percentage, highlight_text,
  feature_flags, active
)
VALUES (
  'Completo', 'completo', 'Tudo que você precisa. Multi-unidade, chatbot IA, fidelidade e muito mais.',
  197.90, 'monthly',
  -1, -1, -1,
  false, true, 20, 'Melhor Valor',
  '{
    "appointments": true,
    "clients": true,
    "services": true,
    "staff_basic": true,
    "staff_advanced": true,
    "staff_earnings": true,
    "staff_multi_unit": true,
    "finance_basic": true,
    "finance_advanced": true,
    "commissions": true,
    "public_booking": true,
    "business_hours": true,
    "basic_reports": true,
    "advanced_reports": true,
    "predictive_analytics": true,
    "export_data": true,
    "reviews": true,
    "client_history": true,
    "waitlist": true,
    "whatsapp_notifications": true,
    "whatsapp_chat": true,
    "whatsapp_chatbot": true,
    "marketing_campaigns": true,
    "marketing_coupons": true,
    "loyalty_program": true,
    "multi_unit": true,
    "multi_unit_reports": true,
    "audit_logs": true,
    "priority_support": true
  }'::jsonb,
  true
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  price = EXCLUDED.price,
  max_staff = EXCLUDED.max_staff,
  max_clients = EXCLUDED.max_clients,
  max_appointments_month = EXCLUDED.max_appointments_month,
  is_bundle = EXCLUDED.is_bundle,
  discount_percentage = EXCLUDED.discount_percentage,
  highlight_text = EXCLUDED.highlight_text,
  feature_flags = EXCLUDED.feature_flags,
  updated_at = NOW();

-- 12. Conceder permissões
GRANT SELECT ON addon_modules TO authenticated;
GRANT SELECT ON subscription_addons TO authenticated;
GRANT ALL ON subscription_addons TO authenticated;

-- 13. Função para calcular preço total da assinatura com add-ons
CREATE OR REPLACE FUNCTION calculate_subscription_total(p_subscription_id UUID)
RETURNS DECIMAL(10,2) AS $$
DECLARE
  v_base_price DECIMAL(10,2);
  v_addons_total DECIMAL(10,2);
  v_discount DECIMAL(5,2);
  v_total DECIMAL(10,2);
BEGIN
  -- Get base plan price
  SELECT sp.price, sp.discount_percentage
  INTO v_base_price, v_discount
  FROM subscriptions s
  JOIN subscription_plans sp ON sp.id = s.plan_id
  WHERE s.id = p_subscription_id;

  -- Get total of active addons
  SELECT COALESCE(SUM(am.price), 0)
  INTO v_addons_total
  FROM subscription_addons sa
  JOIN addon_modules am ON am.id = sa.addon_id
  WHERE sa.subscription_id = p_subscription_id
  AND sa.active = true;

  -- Calculate total with discount
  v_total := v_base_price + v_addons_total;
  
  IF v_discount > 0 THEN
    v_total := v_total * (1 - v_discount / 100);
  END IF;

  RETURN v_total;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION calculate_subscription_total(UUID) TO authenticated;

-- 14. Verificação final
DO $$
BEGIN
  RAISE NOTICE '✅ Tabela addon_modules criada com sucesso';
  RAISE NOTICE '✅ Tabela subscription_addons criada com sucesso';
  RAISE NOTICE '✅ Colunas adicionadas em subscription_plans';
  RAISE NOTICE '✅ Módulos add-on inseridos';
  RAISE NOTICE '✅ Pacotes pré-configurados criados (Essencial, Profissional, Completo)';
  RAISE NOTICE '✅ Função calculate_subscription_total criada';
END $$;
