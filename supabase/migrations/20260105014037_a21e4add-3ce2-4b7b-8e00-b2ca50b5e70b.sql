
-- ==============================================
-- FASE 1: CRIAR TABELAS FALTANTES
-- ==============================================

-- 1.1 Criar tabela addon_modules
CREATE TABLE IF NOT EXISTS public.addon_modules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name varchar NOT NULL,
  slug varchar NOT NULL UNIQUE,
  description text,
  price numeric NOT NULL DEFAULT 0,
  features_enabled jsonb NOT NULL DEFAULT '{}',
  category varchar NOT NULL DEFAULT 'general',
  icon varchar DEFAULT 'package',
  sort_order integer DEFAULT 0,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 1.2 Criar tabela subscription_addons
CREATE TABLE IF NOT EXISTS public.subscription_addons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id uuid NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
  addon_id uuid NOT NULL REFERENCES addon_modules(id) ON DELETE CASCADE,
  added_at timestamptz DEFAULT now(),
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  UNIQUE(subscription_id, addon_id)
);

-- 1.3 Criar tabela message_templates
CREATE TABLE IF NOT EXISTS public.message_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  barbershop_id uuid NOT NULL REFERENCES barbershops(id) ON DELETE CASCADE,
  name text NOT NULL,
  type text NOT NULL,
  content text NOT NULL,
  variables text[] DEFAULT '{}',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 1.4 Criar tabela chatbot_conversations
CREATE TABLE IF NOT EXISTS public.chatbot_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  barbershop_id uuid NOT NULL REFERENCES barbershops(id) ON DELETE CASCADE,
  client_phone text NOT NULL,
  user_message text NOT NULL,
  bot_response text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- ==============================================
-- FASE 2: ADICIONAR COLUNAS FALTANTES
-- ==============================================

-- 2.1 Appointments - campos de recorrencia e pausa
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS reminder_sent timestamptz;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS reschedule_suggested_at timestamptz;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS recurrence_rule text;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS recurrence_index integer DEFAULT 0;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS original_date date;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS is_paused boolean DEFAULT false;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS paused_at timestamptz;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS paused_until date;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS pause_reason text;

-- 2.2 Clients - campos de notificacao e avatar
ALTER TABLE clients ADD COLUMN IF NOT EXISTS avatar_url text;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS notification_enabled boolean DEFAULT true;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS notification_types jsonb DEFAULT '{"no_show_reschedule": true, "appointment_created": true, "appointment_updated": true, "appointment_reminder": true, "appointment_cancelled": true, "appointment_completed": true, "appointment_confirmed": true}';
ALTER TABLE clients ADD COLUMN IF NOT EXISTS reminder_hours integer DEFAULT 24;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS preferred_name text;

-- 2.3 Barbershops - campos de responsavel
ALTER TABLE barbershops ADD COLUMN IF NOT EXISTS cnpj text;
ALTER TABLE barbershops ADD COLUMN IF NOT EXISTS responsible_name text;
ALTER TABLE barbershops ADD COLUMN IF NOT EXISTS responsible_phone text;
ALTER TABLE barbershops ADD COLUMN IF NOT EXISTS responsible_email text;

-- 2.4 Staff - campo is_also_barber
ALTER TABLE staff ADD COLUMN IF NOT EXISTS is_also_barber boolean DEFAULT false;

-- 2.5 Subscription Plans - campos de bundle
ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS is_base_plan boolean DEFAULT false;
ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS is_bundle boolean DEFAULT false;
ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS included_addons uuid[] DEFAULT '{}';
ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS discount_percentage numeric DEFAULT 0;
ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS highlight_text varchar;

-- ==============================================
-- FASE 3: HABILITAR RLS NAS NOVAS TABELAS
-- ==============================================

ALTER TABLE addon_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_addons ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE chatbot_conversations ENABLE ROW LEVEL SECURITY;

-- ==============================================
-- FASE 4: CRIAR POLICIES RLS
-- ==============================================

-- addon_modules: todos podem ver ativos, super admin gerencia
CREATE POLICY "Anyone can view active addon modules"
  ON addon_modules FOR SELECT
  USING (active = true OR is_super_admin(auth.uid()));

CREATE POLICY "Super admin can manage addon modules"
  ON addon_modules FOR ALL
  USING (is_super_admin(auth.uid()))
  WITH CHECK (is_super_admin(auth.uid()));

-- subscription_addons: super admin gerencia, usuarios veem proprias
CREATE POLICY "Users can view own subscription addons"
  ON subscription_addons FOR SELECT
  USING (
    is_super_admin(auth.uid()) OR
    EXISTS (
      SELECT 1 FROM subscriptions s
      WHERE s.id = subscription_addons.subscription_id
      AND s.barbershop_id = get_user_barbershop_id(auth.uid())
    )
  );

CREATE POLICY "Super admin can manage subscription addons"
  ON subscription_addons FOR ALL
  USING (is_super_admin(auth.uid()))
  WITH CHECK (is_super_admin(auth.uid()));

-- message_templates: admin da barbearia gerencia
CREATE POLICY "message_templates_select"
  ON message_templates FOR SELECT
  USING (
    is_super_admin(auth.uid()) OR
    user_has_access_to_barbershop_hierarchy(auth.uid(), barbershop_id)
  );

CREATE POLICY "message_templates_manage"
  ON message_templates FOR ALL
  USING (
    is_super_admin(auth.uid()) OR
    is_admin_of_barbershop(auth.uid(), barbershop_id)
  );

-- chatbot_conversations: admin da barbearia visualiza
CREATE POLICY "chatbot_conversations_select"
  ON chatbot_conversations FOR SELECT
  USING (
    is_super_admin(auth.uid()) OR
    user_has_access_to_barbershop_hierarchy(auth.uid(), barbershop_id)
  );

CREATE POLICY "chatbot_conversations_insert"
  ON chatbot_conversations FOR INSERT
  WITH CHECK (true);

CREATE POLICY "chatbot_conversations_manage"
  ON chatbot_conversations FOR ALL
  USING (
    is_super_admin(auth.uid()) OR
    is_admin_of_barbershop(auth.uid(), barbershop_id)
  );
