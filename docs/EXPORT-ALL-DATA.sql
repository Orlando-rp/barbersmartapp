-- ============================================================
-- SCRIPT DE EXPORTAÇÃO COMPLETO - BARBERSMART
-- Execute no Supabase EXTERNO (nmsblmmhigwsevnqmhwn)
-- ============================================================
-- INSTRUÇÕES:
-- 1. Execute cada seção separadamente no SQL Editor
-- 2. Copie o resultado (comandos INSERT)
-- 3. Cole e execute no Lovable Cloud na ORDEM indicada
-- ============================================================

-- ============================================================
-- NÍVEL 0: TABELAS SEM DEPENDÊNCIAS
-- ============================================================

-- 0.1 subscription_plans
SELECT 
  'INSERT INTO subscription_plans (id, name, slug, description, price, billing_period, max_staff, max_clients, max_appointments_month, features, feature_flags, active, is_base_plan, is_bundle, included_addons, discount_percentage, highlight_text, created_at, updated_at) VALUES (' ||
  quote_literal(id) || ', ' ||
  quote_literal(name) || ', ' ||
  quote_literal(slug) || ', ' ||
  COALESCE(quote_literal(description), 'NULL') || ', ' ||
  price || ', ' ||
  quote_literal(billing_period) || ', ' ||
  COALESCE(max_staff::text, 'NULL') || ', ' ||
  COALESCE(max_clients::text, 'NULL') || ', ' ||
  COALESCE(max_appointments_month::text, 'NULL') || ', ' ||
  quote_literal(COALESCE(features, '[]')::text) || '::jsonb, ' ||
  quote_literal(COALESCE(feature_flags, '{}')::text) || '::jsonb, ' ||
  active || ', ' ||
  COALESCE(is_base_plan::text, 'false') || ', ' ||
  COALESCE(is_bundle::text, 'false') || ', ' ||
  quote_literal(COALESCE(included_addons, '{}')::text) || '::uuid[], ' ||
  COALESCE(discount_percentage::text, '0') || ', ' ||
  COALESCE(quote_literal(highlight_text), 'NULL') || ', ' ||
  quote_literal(created_at::text) || ', ' ||
  quote_literal(updated_at::text) || 
  ') ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, price = EXCLUDED.price, features = EXCLUDED.features, feature_flags = EXCLUDED.feature_flags, active = EXCLUDED.active;' as sql
FROM subscription_plans;

-- 0.2 addon_modules
SELECT 
  'INSERT INTO addon_modules (id, slug, name, description, price, features_enabled, category, icon, sort_order, active, created_at, updated_at) VALUES (' ||
  quote_literal(id) || ', ' ||
  quote_literal(slug) || ', ' ||
  quote_literal(name) || ', ' ||
  COALESCE(quote_literal(description), 'NULL') || ', ' ||
  price || ', ' ||
  quote_literal(COALESCE(features_enabled, '{}')::text) || '::jsonb, ' ||
  quote_literal(category) || ', ' ||
  COALESCE(quote_literal(icon), 'NULL') || ', ' ||
  COALESCE(sort_order::text, '0') || ', ' ||
  COALESCE(active::text, 'true') || ', ' ||
  quote_literal(created_at::text) || ', ' ||
  quote_literal(updated_at::text) || 
  ') ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, price = EXCLUDED.price, features_enabled = EXCLUDED.features_enabled, active = EXCLUDED.active;' as sql
FROM addon_modules;

-- 0.3 global_payment_config (versão simplificada - colunas que existem no banco externo)
SELECT 
  'INSERT INTO global_payment_config (id, default_gateway, platform_fee_percentage, allow_tenant_credentials, mercadopago_enabled, mercadopago_access_token, mercadopago_public_key, asaas_enabled, asaas_api_key, asaas_wallet_id, environment, created_at, updated_at) VALUES (' ||
  quote_literal(id) || ', ' ||
  COALESCE(quote_literal(default_gateway), '''mercadopago''') || ', ' ||
  COALESCE(platform_fee_percentage::text, '0') || ', ' ||
  COALESCE(allow_tenant_credentials::text, 'true') || ', ' ||
  COALESCE(mercadopago_enabled::text, 'false') || ', ' ||
  COALESCE(quote_literal(mercadopago_access_token), 'NULL') || ', ' ||
  COALESCE(quote_literal(mercadopago_public_key), 'NULL') || ', ' ||
  COALESCE(asaas_enabled::text, 'false') || ', ' ||
  COALESCE(quote_literal(asaas_api_key), 'NULL') || ', ' ||
  COALESCE(quote_literal(asaas_wallet_id), 'NULL') || ', ' ||
  COALESCE(quote_literal(environment), '''test''') || ', ' ||
  quote_literal(created_at::text) || ', ' ||
  quote_literal(updated_at::text) || 
  ') ON CONFLICT (id) DO UPDATE SET default_gateway = EXCLUDED.default_gateway, mercadopago_enabled = EXCLUDED.mercadopago_enabled, asaas_enabled = EXCLUDED.asaas_enabled, environment = EXCLUDED.environment;' as sql
FROM global_payment_config;

-- 0.4 system_branding
SELECT 
  'INSERT INTO system_branding (id, system_name, tagline, logo_url, favicon_url, primary_color, secondary_color, accent_color, allow_tenant_customization, logo_light_url, logo_dark_url, logo_icon_url, created_at, updated_at) VALUES (' ||
  quote_literal(id) || ', ' ||
  quote_literal(COALESCE(system_name, 'BarberSmart')) || ', ' ||
  COALESCE(quote_literal(tagline), 'NULL') || ', ' ||
  COALESCE(quote_literal(logo_url), 'NULL') || ', ' ||
  COALESCE(quote_literal(favicon_url), 'NULL') || ', ' ||
  COALESCE(quote_literal(primary_color), '''#d4a574''') || ', ' ||
  COALESCE(quote_literal(secondary_color), '''#1a1a2e''') || ', ' ||
  COALESCE(quote_literal(accent_color), '''#c9a86c''') || ', ' ||
  COALESCE(allow_tenant_customization::text, 'true') || ', ' ||
  COALESCE(quote_literal(logo_light_url), 'NULL') || ', ' ||
  COALESCE(quote_literal(logo_dark_url), 'NULL') || ', ' ||
  COALESCE(quote_literal(logo_icon_url), 'NULL') || ', ' ||
  quote_literal(created_at::text) || ', ' ||
  quote_literal(updated_at::text) || 
  ') ON CONFLICT (id) DO UPDATE SET system_name = EXCLUDED.system_name, logo_url = EXCLUDED.logo_url, primary_color = EXCLUDED.primary_color;' as sql
FROM system_branding;

-- 0.5 system_config
SELECT 
  'INSERT INTO system_config (id, key, value, created_at, updated_at) VALUES (' ||
  quote_literal(id) || ', ' ||
  quote_literal(key) || ', ' ||
  quote_literal(value::text) || '::jsonb, ' ||
  quote_literal(created_at::text) || ', ' ||
  quote_literal(updated_at::text) || 
  ') ON CONFLICT (id) DO UPDATE SET value = EXCLUDED.value, updated_at = EXCLUDED.updated_at;' as sql
FROM system_config;

-- ============================================================
-- NÍVEL 1: BARBERSHOPS (BASE PARA QUASE TUDO)
-- ============================================================

-- Versão compatível com schema externo (sem slug e email_config)
SELECT 
  'INSERT INTO barbershops (id, parent_id, name, address, phone, email, cnpj, logo_url, settings, custom_branding, responsible_name, responsible_phone, responsible_email, active, created_at, updated_at) VALUES (' ||
  quote_literal(id) || ', ' ||
  COALESCE(quote_literal(parent_id), 'NULL') || ', ' ||
  quote_literal(name) || ', ' ||
  COALESCE(quote_literal(address), 'NULL') || ', ' ||
  COALESCE(quote_literal(phone), 'NULL') || ', ' ||
  COALESCE(quote_literal(email), 'NULL') || ', ' ||
  COALESCE(quote_literal(cnpj), 'NULL') || ', ' ||
  COALESCE(quote_literal(logo_url), 'NULL') || ', ' ||
  quote_literal(COALESCE(settings, '{}')::text) || '::jsonb, ' ||
  COALESCE(quote_literal(custom_branding::text) || '::jsonb', 'NULL') || ', ' ||
  COALESCE(quote_literal(responsible_name), 'NULL') || ', ' ||
  COALESCE(quote_literal(responsible_phone), 'NULL') || ', ' ||
  COALESCE(quote_literal(responsible_email), 'NULL') || ', ' ||
  active || ', ' ||
  quote_literal(created_at::text) || ', ' ||
  quote_literal(updated_at::text) || 
  ') ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, address = EXCLUDED.address, phone = EXCLUDED.phone, email = EXCLUDED.email, settings = EXCLUDED.settings, active = EXCLUDED.active, updated_at = EXCLUDED.updated_at;' as sql
FROM barbershops
ORDER BY parent_id NULLS FIRST;

-- ============================================================
-- NÍVEL 2: TABELAS DEPENDENTES DE BARBERSHOPS
-- ============================================================

-- 2.1 service_categories
SELECT 
  'INSERT INTO service_categories (id, barbershop_id, name, description, color, active, created_at, updated_at) VALUES (' ||
  quote_literal(id) || ', ' ||
  quote_literal(barbershop_id) || ', ' ||
  quote_literal(name) || ', ' ||
  COALESCE(quote_literal(description), 'NULL') || ', ' ||
  COALESCE(quote_literal(color), '''#6b7280''') || ', ' ||
  COALESCE(active::text, 'true') || ', ' ||
  quote_literal(created_at::text) || ', ' ||
  quote_literal(updated_at::text) || 
  ') ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, color = EXCLUDED.color, active = EXCLUDED.active;' as sql
FROM service_categories;

-- 2.2 services (sem category_id - apenas category text no banco externo)
SELECT 
  'INSERT INTO services (id, barbershop_id, name, description, category, price, duration, image_url, active, created_at, updated_at) VALUES (' ||
  quote_literal(id) || ', ' ||
  quote_literal(barbershop_id) || ', ' ||
  quote_literal(name) || ', ' ||
  COALESCE(quote_literal(description), 'NULL') || ', ' ||
  quote_literal(category) || ', ' ||
  price || ', ' ||
  duration || ', ' ||
  COALESCE(quote_literal(image_url), 'NULL') || ', ' ||
  COALESCE(active::text, 'true') || ', ' ||
  quote_literal(created_at::text) || ', ' ||
  quote_literal(updated_at::text) || 
  ') ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, price = EXCLUDED.price, duration = EXCLUDED.duration, active = EXCLUDED.active;' as sql
FROM services;

-- 2.3 clients
SELECT 
  'INSERT INTO clients (id, barbershop_id, name, preferred_name, email, phone, birth_date, address, notes, tags, avatar_url, active, notification_enabled, notification_types, reminder_hours, created_at, updated_at) VALUES (' ||
  quote_literal(id) || ', ' ||
  quote_literal(barbershop_id) || ', ' ||
  quote_literal(name) || ', ' ||
  COALESCE(quote_literal(preferred_name), 'NULL') || ', ' ||
  COALESCE(quote_literal(email), 'NULL') || ', ' ||
  COALESCE(quote_literal(phone), 'NULL') || ', ' ||
  COALESCE(quote_literal(birth_date::text), 'NULL') || ', ' ||
  COALESCE(quote_literal(address), 'NULL') || ', ' ||
  COALESCE(quote_literal(notes), 'NULL') || ', ' ||
  quote_literal(COALESCE(tags, '{}')::text) || '::text[], ' ||
  COALESCE(quote_literal(avatar_url), 'NULL') || ', ' ||
  COALESCE(active::text, 'true') || ', ' ||
  COALESCE(notification_enabled::text, 'true') || ', ' ||
  quote_literal(COALESCE(notification_types, '{}')::text) || '::jsonb, ' ||
  COALESCE(reminder_hours::text, '24') || ', ' ||
  quote_literal(created_at::text) || ', ' ||
  quote_literal(updated_at::text) || 
  ') ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, phone = EXCLUDED.phone, email = EXCLUDED.email, active = EXCLUDED.active;' as sql
FROM clients;

-- 2.4 business_hours
SELECT 
  'INSERT INTO business_hours (id, barbershop_id, day_of_week, is_open, open_time, close_time, break_start, break_end, created_at, updated_at) VALUES (' ||
  quote_literal(id) || ', ' ||
  quote_literal(barbershop_id) || ', ' ||
  quote_literal(day_of_week) || ', ' ||
  COALESCE(is_open::text, 'true') || ', ' ||
  quote_literal(open_time) || ', ' ||
  quote_literal(close_time) || ', ' ||
  COALESCE(quote_literal(break_start), 'NULL') || ', ' ||
  COALESCE(quote_literal(break_end), 'NULL') || ', ' ||
  quote_literal(created_at::text) || ', ' ||
  quote_literal(updated_at::text) || 
  ') ON CONFLICT (id) DO UPDATE SET is_open = EXCLUDED.is_open, open_time = EXCLUDED.open_time, close_time = EXCLUDED.close_time;' as sql
FROM business_hours;

-- 2.5 special_hours (com break_start e break_end do banco externo)
SELECT 
  'INSERT INTO special_hours (id, barbershop_id, special_date, is_open, open_time, close_time, break_start, break_end, reason, created_at, updated_at) VALUES (' ||
  quote_literal(id) || ', ' ||
  quote_literal(barbershop_id) || ', ' ||
  quote_literal(special_date::text) || ', ' ||
  COALESCE(is_open::text, 'true') || ', ' ||
  COALESCE(quote_literal(open_time), 'NULL') || ', ' ||
  COALESCE(quote_literal(close_time), 'NULL') || ', ' ||
  COALESCE(quote_literal(break_start), 'NULL') || ', ' ||
  COALESCE(quote_literal(break_end), 'NULL') || ', ' ||
  quote_literal(reason) || ', ' ||
  quote_literal(created_at::text) || ', ' ||
  quote_literal(updated_at::text) || 
  ') ON CONFLICT (id) DO UPDATE SET is_open = EXCLUDED.is_open, reason = EXCLUDED.reason;' as sql
FROM special_hours;

-- 2.6 blocked_dates
SELECT 
  'INSERT INTO blocked_dates (id, barbershop_id, blocked_date, reason, created_at) VALUES (' ||
  quote_literal(id) || ', ' ||
  quote_literal(barbershop_id) || ', ' ||
  quote_literal(blocked_date::text) || ', ' ||
  quote_literal(reason) || ', ' ||
  quote_literal(created_at::text) || 
  ') ON CONFLICT (id) DO NOTHING;' as sql
FROM blocked_dates;

-- 2.7 barbershop_domains
SELECT 
  'INSERT INTO barbershop_domains (id, barbershop_id, subdomain, custom_domain, subdomain_status, custom_domain_status, primary_domain_type, dns_verification_token, dns_verified_at, ssl_status, ssl_provisioned_at, landing_page_enabled, landing_page_config, created_at, updated_at) VALUES (' ||
  quote_literal(id) || ', ' ||
  quote_literal(barbershop_id) || ', ' ||
  COALESCE(quote_literal(subdomain), 'NULL') || ', ' ||
  COALESCE(quote_literal(custom_domain), 'NULL') || ', ' ||
  COALESCE(quote_literal(subdomain_status), '''active''') || ', ' ||
  COALESCE(quote_literal(custom_domain_status), '''pending''') || ', ' ||
  COALESCE(quote_literal(primary_domain_type), '''subdomain''') || ', ' ||
  COALESCE(quote_literal(dns_verification_token), 'NULL') || ', ' ||
  COALESCE(quote_literal(dns_verified_at::text), 'NULL') || ', ' ||
  COALESCE(quote_literal(ssl_status), '''pending''') || ', ' ||
  COALESCE(quote_literal(ssl_provisioned_at::text), 'NULL') || ', ' ||
  COALESCE(landing_page_enabled::text, 'true') || ', ' ||
  COALESCE(quote_literal(landing_page_config::text) || '::jsonb', 'NULL') || ', ' ||
  quote_literal(created_at::text) || ', ' ||
  quote_literal(updated_at::text) || 
  ') ON CONFLICT (id) DO UPDATE SET subdomain = EXCLUDED.subdomain, custom_domain = EXCLUDED.custom_domain, landing_page_config = EXCLUDED.landing_page_config;' as sql
FROM barbershop_domains;

-- 2.8 payment_settings
SELECT 
  'INSERT INTO payment_settings (id, barbershop_id, mercadopago_access_token, mercadopago_public_key, require_deposit, deposit_percentage, allow_online_payment, allow_pay_at_location, created_at, updated_at) VALUES (' ||
  quote_literal(id) || ', ' ||
  quote_literal(barbershop_id) || ', ' ||
  COALESCE(quote_literal(mercadopago_access_token), 'NULL') || ', ' ||
  COALESCE(quote_literal(mercadopago_public_key), 'NULL') || ', ' ||
  COALESCE(require_deposit::text, 'false') || ', ' ||
  COALESCE(deposit_percentage::text, '0') || ', ' ||
  COALESCE(allow_online_payment::text, 'false') || ', ' ||
  COALESCE(allow_pay_at_location::text, 'true') || ', ' ||
  quote_literal(created_at::text) || ', ' ||
  quote_literal(updated_at::text) || 
  ') ON CONFLICT (id) DO UPDATE SET require_deposit = EXCLUDED.require_deposit, allow_online_payment = EXCLUDED.allow_online_payment;' as sql
FROM payment_settings;

-- 2.9 whatsapp_config (chatbot_enabled agora está dentro do config JSONB)
SELECT 
  'INSERT INTO whatsapp_config (id, barbershop_id, provider, config, is_active, health_status, last_health_check, created_at, updated_at) VALUES (' ||
  quote_literal(id) || ', ' ||
  quote_literal(barbershop_id) || ', ' ||
  quote_literal(provider) || ', ' ||
  quote_literal(
    CASE 
      WHEN chatbot_enabled IS NOT NULL AND chatbot_enabled = true 
      THEN jsonb_set(COALESCE(config, '{}'::jsonb), '{chatbot_enabled}', 'true'::jsonb)
      ELSE COALESCE(config, '{}'::jsonb)
    END::text
  ) || '::jsonb, ' ||
  COALESCE(is_active::text, 'false') || ', ' ||
  COALESCE(quote_literal(health_status), '''unknown''') || ', ' ||
  COALESCE(quote_literal(last_health_check::text), 'NULL') || ', ' ||
  quote_literal(created_at::text) || ', ' ||
  quote_literal(updated_at::text) || 
  ') ON CONFLICT (id) DO UPDATE SET config = EXCLUDED.config, is_active = EXCLUDED.is_active;' as sql
FROM whatsapp_config;

-- 2.10 message_templates
SELECT 
  'INSERT INTO message_templates (id, barbershop_id, name, type, content, variables, is_active, created_at, updated_at) VALUES (' ||
  quote_literal(id) || ', ' ||
  quote_literal(barbershop_id) || ', ' ||
  quote_literal(name) || ', ' ||
  quote_literal(type) || ', ' ||
  quote_literal(content) || ', ' ||
  quote_literal(COALESCE(variables, '{}')::text) || '::text[], ' ||
  COALESCE(is_active::text, 'true') || ', ' ||
  quote_literal(created_at::text) || ', ' ||
  quote_literal(updated_at::text) || 
  ') ON CONFLICT (id) DO UPDATE SET content = EXCLUDED.content, is_active = EXCLUDED.is_active;' as sql
FROM message_templates;

-- 2.11 campaigns
SELECT 
  'INSERT INTO campaigns (id, barbershop_id, name, type, status, config, created_at, updated_at) VALUES (' ||
  quote_literal(id) || ', ' ||
  quote_literal(barbershop_id) || ', ' ||
  quote_literal(name) || ', ' ||
  quote_literal(type) || ', ' ||
  COALESCE(quote_literal(status), '''draft''') || ', ' ||
  quote_literal(COALESCE(config, '{}')::text) || '::jsonb, ' ||
  quote_literal(created_at::text) || ', ' ||
  quote_literal(updated_at::text) || 
  ') ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, status = EXCLUDED.status, config = EXCLUDED.config;' as sql
FROM campaigns;

-- 2.12 coupons
SELECT 
  'INSERT INTO coupons (id, barbershop_id, code, description, discount_type, discount_value, min_purchase_value, max_uses, current_uses, valid_from, valid_until, active, created_at, updated_at) VALUES (' ||
  quote_literal(id) || ', ' ||
  quote_literal(barbershop_id) || ', ' ||
  quote_literal(code) || ', ' ||
  COALESCE(quote_literal(description), 'NULL') || ', ' ||
  quote_literal(discount_type) || ', ' ||
  discount_value || ', ' ||
  COALESCE(min_purchase_value::text, '0') || ', ' ||
  COALESCE(max_uses::text, 'NULL') || ', ' ||
  COALESCE(current_uses::text, '0') || ', ' ||
  quote_literal(valid_from::text) || ', ' ||
  quote_literal(valid_until::text) || ', ' ||
  COALESCE(active::text, 'true') || ', ' ||
  quote_literal(created_at::text) || ', ' ||
  quote_literal(updated_at::text) || 
  ') ON CONFLICT (id) DO UPDATE SET active = EXCLUDED.active, current_uses = EXCLUDED.current_uses;' as sql
FROM coupons;

-- 2.13 role_permissions
SELECT 
  'INSERT INTO role_permissions (id, barbershop_id, role, permissions, created_at, updated_at) VALUES (' ||
  quote_literal(id) || ', ' ||
  quote_literal(barbershop_id) || ', ' ||
  quote_literal(role) || ', ' ||
  quote_literal(permissions::text) || '::jsonb, ' ||
  quote_literal(created_at::text) || ', ' ||
  quote_literal(updated_at::text) || 
  ') ON CONFLICT (id) DO UPDATE SET permissions = EXCLUDED.permissions;' as sql
FROM role_permissions;

-- 2.14 subscriptions
SELECT 
  'INSERT INTO subscriptions (id, barbershop_id, plan_id, status, trial_ends_at, current_period_start, current_period_end, cancelled_at, created_at, updated_at) VALUES (' ||
  quote_literal(id) || ', ' ||
  quote_literal(barbershop_id) || ', ' ||
  quote_literal(plan_id) || ', ' ||
  quote_literal(status) || ', ' ||
  COALESCE(quote_literal(trial_ends_at::text), 'NULL') || ', ' ||
  COALESCE(quote_literal(current_period_start::text), 'NULL') || ', ' ||
  COALESCE(quote_literal(current_period_end::text), 'NULL') || ', ' ||
  COALESCE(quote_literal(cancelled_at::text), 'NULL') || ', ' ||
  quote_literal(created_at::text) || ', ' ||
  quote_literal(updated_at::text) || 
  ') ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status, current_period_end = EXCLUDED.current_period_end;' as sql
FROM subscriptions;

-- ============================================================
-- NÍVEL 3: PROFILES E USER_ROLES (DEPENDEM DE AUTH.USERS)
-- IMPORTANTE: Crie os usuários no Auth ANTES de executar esta seção!
-- ============================================================

-- 3.1 Lista de usuários para criar no Auth (EXECUTE PRIMEIRO NO SUPABASE EXTERNO)
SELECT 
  '-- Criar usuário no Auth com ID: ' || au.id || E'\n' ||
  '-- Email: ' || au.email || E'\n' ||
  '-- Nome: ' || COALESCE(au.raw_user_meta_data->>'full_name', p.full_name, 'Sem nome') || E'\n' ||
  '-- Telefone: ' || COALESCE(p.phone, 'N/A') as info
FROM auth.users au
LEFT JOIN profiles p ON p.id = au.id
ORDER BY au.created_at;

-- 3.2 profiles (executar APÓS criar usuários no Auth)
SELECT 
  'INSERT INTO profiles (id, barbershop_id, full_name, preferred_name, phone, avatar_url, created_at, updated_at) VALUES (' ||
  quote_literal(id) || ', ' ||
  COALESCE(quote_literal(barbershop_id), 'NULL') || ', ' ||
  COALESCE(quote_literal(full_name), 'NULL') || ', ' ||
  COALESCE(quote_literal(preferred_name), 'NULL') || ', ' ||
  COALESCE(quote_literal(phone), 'NULL') || ', ' ||
  COALESCE(quote_literal(avatar_url), 'NULL') || ', ' ||
  quote_literal(created_at::text) || ', ' ||
  quote_literal(updated_at::text) || 
  ') ON CONFLICT (id) DO UPDATE SET barbershop_id = EXCLUDED.barbershop_id, full_name = EXCLUDED.full_name, phone = EXCLUDED.phone, avatar_url = EXCLUDED.avatar_url;' as sql
FROM profiles;

-- 3.3 user_roles
SELECT 
  'INSERT INTO user_roles (id, user_id, role, barbershop_id, created_at) VALUES (' ||
  quote_literal(id) || ', ' ||
  quote_literal(user_id) || ', ' ||
  quote_literal(role::text) || ', ' ||
  COALESCE(quote_literal(barbershop_id), 'NULL') || ', ' ||
  quote_literal(created_at::text) || 
  ') ON CONFLICT (id) DO UPDATE SET role = EXCLUDED.role, barbershop_id = EXCLUDED.barbershop_id;' as sql
FROM user_roles;

-- 3.4 user_barbershops
SELECT 
  'INSERT INTO user_barbershops (id, user_id, barbershop_id, is_primary, created_at) VALUES (' ||
  quote_literal(id) || ', ' ||
  quote_literal(user_id) || ', ' ||
  quote_literal(barbershop_id) || ', ' ||
  COALESCE(is_primary::text, 'false') || ', ' ||
  quote_literal(created_at::text) || 
  ') ON CONFLICT (id) DO UPDATE SET is_primary = EXCLUDED.is_primary;' as sql
FROM user_barbershops;

-- 3.5 staff
SELECT 
  'INSERT INTO staff (id, barbershop_id, user_id, specialties, commission_rate, schedule, is_also_barber, active, created_at, updated_at) VALUES (' ||
  quote_literal(id) || ', ' ||
  quote_literal(barbershop_id) || ', ' ||
  quote_literal(user_id) || ', ' ||
  quote_literal(COALESCE(specialties, '{}')::text) || '::text[], ' ||
  COALESCE(commission_rate::text, '0') || ', ' ||
  quote_literal(COALESCE(schedule, '{}')::text) || '::jsonb, ' ||
  COALESCE(is_also_barber::text, 'false') || ', ' ||
  COALESCE(active::text, 'true') || ', ' ||
  quote_literal(created_at::text) || ', ' ||
  quote_literal(updated_at::text) || 
  ') ON CONFLICT (id) DO UPDATE SET specialties = EXCLUDED.specialties, commission_rate = EXCLUDED.commission_rate, schedule = EXCLUDED.schedule, active = EXCLUDED.active;' as sql
FROM staff;

-- ============================================================
-- NÍVEL 4: TABELAS DEPENDENTES DE STAFF
-- ============================================================

-- 4.1 staff_units
SELECT 
  'INSERT INTO staff_units (id, staff_id, barbershop_id, commission_rate, schedule, active, created_at, updated_at) VALUES (' ||
  quote_literal(id) || ', ' ||
  quote_literal(staff_id) || ', ' ||
  quote_literal(barbershop_id) || ', ' ||
  COALESCE(commission_rate::text, '0') || ', ' ||
  COALESCE(quote_literal(schedule::text) || '::jsonb', 'NULL') || ', ' ||
  COALESCE(active::text, 'true') || ', ' ||
  quote_literal(created_at::text) || ', ' ||
  quote_literal(updated_at::text) || 
  ') ON CONFLICT (id) DO UPDATE SET commission_rate = EXCLUDED.commission_rate, schedule = EXCLUDED.schedule, active = EXCLUDED.active;' as sql
FROM staff_units;

-- 4.2 staff_services
SELECT 
  'INSERT INTO staff_services (id, staff_id, service_id, is_active, created_at, updated_at) VALUES (' ||
  quote_literal(id) || ', ' ||
  quote_literal(staff_id) || ', ' ||
  quote_literal(service_id) || ', ' ||
  COALESCE(is_active::text, 'true') || ', ' ||
  quote_literal(created_at::text) || ', ' ||
  quote_literal(updated_at::text) || 
  ') ON CONFLICT (id) DO UPDATE SET is_active = EXCLUDED.is_active;' as sql
FROM staff_services;

-- 4.3 portfolio_photos
SELECT 
  'INSERT INTO portfolio_photos (id, barbershop_id, staff_id, title, description, image_url, category, display_order, is_featured, active, created_at, updated_at) VALUES (' ||
  quote_literal(id) || ', ' ||
  quote_literal(barbershop_id) || ', ' ||
  COALESCE(quote_literal(staff_id), 'NULL') || ', ' ||
  COALESCE(quote_literal(title), 'NULL') || ', ' ||
  COALESCE(quote_literal(description), 'NULL') || ', ' ||
  quote_literal(image_url) || ', ' ||
  COALESCE(quote_literal(category), 'NULL') || ', ' ||
  COALESCE(display_order::text, '0') || ', ' ||
  COALESCE(is_featured::text, 'false') || ', ' ||
  COALESCE(active::text, 'true') || ', ' ||
  quote_literal(created_at::text) || ', ' ||
  quote_literal(updated_at::text) || 
  ') ON CONFLICT (id) DO UPDATE SET image_url = EXCLUDED.image_url, is_featured = EXCLUDED.is_featured, active = EXCLUDED.active;' as sql
FROM portfolio_photos;

-- ============================================================
-- NÍVEL 5: TABELAS DEPENDENTES DE CLIENTS
-- ============================================================

-- 5.1 loyalty_points
SELECT 
  'INSERT INTO loyalty_points (id, barbershop_id, client_id, points, total_earned, total_redeemed, created_at, updated_at) VALUES (' ||
  quote_literal(id) || ', ' ||
  quote_literal(barbershop_id) || ', ' ||
  quote_literal(client_id) || ', ' ||
  COALESCE(points::text, '0') || ', ' ||
  COALESCE(total_earned::text, '0') || ', ' ||
  COALESCE(total_redeemed::text, '0') || ', ' ||
  quote_literal(created_at::text) || ', ' ||
  quote_literal(updated_at::text) || 
  ') ON CONFLICT (id) DO UPDATE SET points = EXCLUDED.points, total_earned = EXCLUDED.total_earned, total_redeemed = EXCLUDED.total_redeemed;' as sql
FROM loyalty_points;

-- 5.2 client_users (vincula clientes a usuários autenticados)
SELECT 
  'INSERT INTO client_users (id, client_id, user_id, created_at, updated_at) VALUES (' ||
  quote_literal(id) || ', ' ||
  quote_literal(client_id) || ', ' ||
  quote_literal(user_id) || ', ' ||
  quote_literal(created_at::text) || ', ' ||
  quote_literal(updated_at::text) || 
  ') ON CONFLICT (id) DO NOTHING;' as sql
FROM client_users;

-- ============================================================
-- NÍVEL 6: APPOINTMENTS
-- ============================================================

SELECT 
  'INSERT INTO appointments (id, barbershop_id, client_id, staff_id, service_id, appointment_date, appointment_time, duration, status, notes, client_name, client_phone, service_name, service_price, payment_status, payment_id, payment_amount, payment_method_chosen, payment_gateway, is_recurring, recurrence_group_id, recurrence_rule, recurrence_index, original_date, is_paused, paused_at, paused_until, pause_reason, reminder_sent, created_at, updated_at) VALUES (' ||
  quote_literal(id) || ', ' ||
  quote_literal(barbershop_id) || ', ' ||
  COALESCE(quote_literal(client_id), 'NULL') || ', ' ||
  COALESCE(quote_literal(staff_id), 'NULL') || ', ' ||
  COALESCE(quote_literal(service_id), 'NULL') || ', ' ||
  quote_literal(appointment_date::text) || ', ' ||
  quote_literal(appointment_time::text) || ', ' ||
  COALESCE(duration::text, '30') || ', ' ||
  quote_literal(COALESCE(status::text, 'pendente')) || ', ' ||
  COALESCE(quote_literal(notes), 'NULL') || ', ' ||
  COALESCE(quote_literal(client_name), 'NULL') || ', ' ||
  COALESCE(quote_literal(client_phone), 'NULL') || ', ' ||
  COALESCE(quote_literal(service_name), 'NULL') || ', ' ||
  COALESCE(service_price::text, 'NULL') || ', ' ||
  COALESCE(quote_literal(payment_status), '''pending''') || ', ' ||
  COALESCE(quote_literal(payment_id), 'NULL') || ', ' ||
  COALESCE(payment_amount::text, 'NULL') || ', ' ||
  COALESCE(quote_literal(payment_method_chosen), 'NULL') || ', ' ||
  COALESCE(quote_literal(payment_gateway), '''mercadopago''') || ', ' ||
  COALESCE(is_recurring::text, 'false') || ', ' ||
  COALESCE(quote_literal(recurrence_group_id), 'NULL') || ', ' ||
  COALESCE(quote_literal(recurrence_rule), 'NULL') || ', ' ||
  COALESCE(recurrence_index::text, '0') || ', ' ||
  COALESCE(quote_literal(original_date::text), 'NULL') || ', ' ||
  COALESCE(is_paused::text, 'false') || ', ' ||
  COALESCE(quote_literal(paused_at::text), 'NULL') || ', ' ||
  COALESCE(quote_literal(paused_until::text), 'NULL') || ', ' ||
  COALESCE(quote_literal(pause_reason), 'NULL') || ', ' ||
  COALESCE(quote_literal(reminder_sent::text), 'NULL') || ', ' ||
  quote_literal(created_at::text) || ', ' ||
  quote_literal(updated_at::text) || 
  ') ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status, notes = EXCLUDED.notes, payment_status = EXCLUDED.payment_status;' as sql
FROM appointments;

-- ============================================================
-- NÍVEL 7: TRANSACTIONS E REVIEWS
-- ============================================================

-- 7.1 transactions
SELECT 
  'INSERT INTO transactions (id, barbershop_id, appointment_id, staff_id, type, amount, category, payment_method, description, transaction_date, commission_rate, commission_amount, created_by, created_at, updated_at) VALUES (' ||
  quote_literal(id) || ', ' ||
  quote_literal(barbershop_id) || ', ' ||
  COALESCE(quote_literal(appointment_id), 'NULL') || ', ' ||
  COALESCE(quote_literal(staff_id), 'NULL') || ', ' ||
  quote_literal(type::text) || ', ' ||
  amount || ', ' ||
  COALESCE(quote_literal(category), 'NULL') || ', ' ||
  COALESCE(quote_literal(payment_method::text), 'NULL') || ', ' ||
  COALESCE(quote_literal(description), 'NULL') || ', ' ||
  quote_literal(transaction_date::text) || ', ' ||
  COALESCE(commission_rate::text, '0') || ', ' ||
  COALESCE(commission_amount::text, '0') || ', ' ||
  COALESCE(quote_literal(created_by), 'NULL') || ', ' ||
  quote_literal(created_at::text) || ', ' ||
  quote_literal(updated_at::text) || 
  ') ON CONFLICT (id) DO UPDATE SET amount = EXCLUDED.amount, category = EXCLUDED.category;' as sql
FROM transactions;

-- 7.2 reviews
SELECT 
  'INSERT INTO reviews (id, barbershop_id, client_id, staff_id, appointment_id, rating, comment, created_at, updated_at) VALUES (' ||
  quote_literal(id) || ', ' ||
  quote_literal(barbershop_id) || ', ' ||
  quote_literal(client_id) || ', ' ||
  COALESCE(quote_literal(staff_id), 'NULL') || ', ' ||
  quote_literal(appointment_id) || ', ' ||
  rating || ', ' ||
  COALESCE(quote_literal(comment), 'NULL') || ', ' ||
  quote_literal(created_at::text) || ', ' ||
  quote_literal(updated_at::text) || 
  ') ON CONFLICT (id) DO UPDATE SET rating = EXCLUDED.rating, comment = EXCLUDED.comment;' as sql
FROM reviews;

-- ============================================================
-- NÍVEL 8: WHATSAPP MESSAGES E LOGS
-- ============================================================

-- 8.1 whatsapp_messages
SELECT 
  'INSERT INTO whatsapp_messages (id, barbershop_id, phone_number, contact_name, message, direction, status, message_type, sent_by_user_id, sent_by_name, metadata, created_at, updated_at) VALUES (' ||
  quote_literal(id) || ', ' ||
  quote_literal(barbershop_id) || ', ' ||
  quote_literal(phone_number) || ', ' ||
  COALESCE(quote_literal(contact_name), 'NULL') || ', ' ||
  quote_literal(message) || ', ' ||
  quote_literal(direction) || ', ' ||
  COALESCE(quote_literal(status), '''sent''') || ', ' ||
  COALESCE(quote_literal(message_type), '''text''') || ', ' ||
  COALESCE(quote_literal(sent_by_user_id), 'NULL') || ', ' ||
  COALESCE(quote_literal(sent_by_name), 'NULL') || ', ' ||
  quote_literal(COALESCE(metadata, '{}')::text) || '::jsonb, ' ||
  quote_literal(created_at::text) || ', ' ||
  quote_literal(updated_at::text) || 
  ') ON CONFLICT (id) DO NOTHING;' as sql
FROM whatsapp_messages;

-- 8.2 whatsapp_logs
SELECT 
  'INSERT INTO whatsapp_logs (id, barbershop_id, recipient_phone, recipient_name, message_type, message_content, status, whatsapp_message_id, error_message, appointment_id, campaign_id, provider, created_by, created_at, updated_at) VALUES (' ||
  quote_literal(id) || ', ' ||
  quote_literal(barbershop_id) || ', ' ||
  quote_literal(recipient_phone) || ', ' ||
  COALESCE(quote_literal(recipient_name), 'NULL') || ', ' ||
  COALESCE(quote_literal(message_type), '''text''') || ', ' ||
  quote_literal(message_content) || ', ' ||
  quote_literal(status) || ', ' ||
  COALESCE(quote_literal(whatsapp_message_id), 'NULL') || ', ' ||
  COALESCE(quote_literal(error_message), 'NULL') || ', ' ||
  COALESCE(quote_literal(appointment_id), 'NULL') || ', ' ||
  COALESCE(quote_literal(campaign_id), 'NULL') || ', ' ||
  COALESCE(quote_literal(provider), '''evolution''') || ', ' ||
  COALESCE(quote_literal(created_by), 'NULL') || ', ' ||
  quote_literal(created_at::text) || ', ' ||
  quote_literal(updated_at::text) || 
  ') ON CONFLICT (id) DO NOTHING;' as sql
FROM whatsapp_logs;

-- 8.3 chatbot_conversations
SELECT 
  'INSERT INTO chatbot_conversations (id, barbershop_id, client_phone, user_message, bot_response, created_at) VALUES (' ||
  quote_literal(id) || ', ' ||
  quote_literal(barbershop_id) || ', ' ||
  quote_literal(client_phone) || ', ' ||
  quote_literal(user_message) || ', ' ||
  quote_literal(bot_response) || ', ' ||
  quote_literal(created_at::text) || 
  ') ON CONFLICT (id) DO NOTHING;' as sql
FROM chatbot_conversations;

-- ============================================================
-- NÍVEL 9: TABELAS AUXILIARES
-- ============================================================

-- 9.1 subscription_addons
SELECT 
  'INSERT INTO subscription_addons (id, subscription_id, addon_id, added_at, active, created_at) VALUES (' ||
  quote_literal(id) || ', ' ||
  quote_literal(subscription_id) || ', ' ||
  quote_literal(addon_id) || ', ' ||
  quote_literal(added_at::text) || ', ' ||
  COALESCE(active::text, 'true') || ', ' ||
  quote_literal(created_at::text) || 
  ') ON CONFLICT (id) DO UPDATE SET active = EXCLUDED.active;' as sql
FROM subscription_addons;

-- 9.2 loyalty_transactions
SELECT 
  'INSERT INTO loyalty_transactions (id, loyalty_points_id, type, points, description, created_at) VALUES (' ||
  quote_literal(id) || ', ' ||
  quote_literal(loyalty_points_id) || ', ' ||
  quote_literal(type) || ', ' ||
  points || ', ' ||
  COALESCE(quote_literal(description), 'NULL') || ', ' ||
  quote_literal(created_at::text) || 
  ') ON CONFLICT (id) DO NOTHING;' as sql
FROM loyalty_transactions;

-- 9.3 waitlist
SELECT 
  'INSERT INTO waitlist (id, barbershop_id, client_id, client_name, client_phone, preferred_date, preferred_time_start, preferred_time_end, service_id, staff_id, status, notified_at, notes, created_at, updated_at) VALUES (' ||
  quote_literal(id) || ', ' ||
  quote_literal(barbershop_id) || ', ' ||
  COALESCE(quote_literal(client_id), 'NULL') || ', ' ||
  quote_literal(client_name) || ', ' ||
  quote_literal(client_phone) || ', ' ||
  quote_literal(preferred_date::text) || ', ' ||
  COALESCE(quote_literal(preferred_time_start::text), 'NULL') || ', ' ||
  COALESCE(quote_literal(preferred_time_end::text), 'NULL') || ', ' ||
  COALESCE(quote_literal(service_id), 'NULL') || ', ' ||
  COALESCE(quote_literal(staff_id), 'NULL') || ', ' ||
  quote_literal(status) || ', ' ||
  COALESCE(quote_literal(notified_at::text), 'NULL') || ', ' ||
  COALESCE(quote_literal(notes), 'NULL') || ', ' ||
  quote_literal(created_at::text) || ', ' ||
  quote_literal(updated_at::text) || 
  ') ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status;' as sql
FROM waitlist;

-- 9.4 usage_metrics
SELECT 
  'INSERT INTO usage_metrics (id, barbershop_id, month, appointments_count, clients_count, staff_count, revenue, messages_sent, storage_used_mb, created_at, updated_at) VALUES (' ||
  quote_literal(id) || ', ' ||
  quote_literal(barbershop_id) || ', ' ||
  quote_literal(month::text) || ', ' ||
  COALESCE(appointments_count::text, '0') || ', ' ||
  COALESCE(clients_count::text, '0') || ', ' ||
  COALESCE(staff_count::text, '0') || ', ' ||
  COALESCE(revenue::text, '0') || ', ' ||
  COALESCE(messages_sent::text, '0') || ', ' ||
  COALESCE(storage_used_mb::text, '0') || ', ' ||
  quote_literal(created_at::text) || ', ' ||
  quote_literal(updated_at::text) || 
  ') ON CONFLICT (id) DO UPDATE SET appointments_count = EXCLUDED.appointments_count, revenue = EXCLUDED.revenue;' as sql
FROM usage_metrics;

-- ============================================================
-- VERIFICAÇÃO FINAL - CONTAGEM DE REGISTROS
-- ============================================================

SELECT 'Tabela' as tabela, 'Quantidade' as qtd
UNION ALL SELECT 'subscription_plans', COUNT(*)::text FROM subscription_plans
UNION ALL SELECT 'addon_modules', COUNT(*)::text FROM addon_modules
UNION ALL SELECT 'global_payment_config', COUNT(*)::text FROM global_payment_config
UNION ALL SELECT 'system_branding', COUNT(*)::text FROM system_branding
UNION ALL SELECT 'system_config', COUNT(*)::text FROM system_config
UNION ALL SELECT 'barbershops', COUNT(*)::text FROM barbershops
UNION ALL SELECT 'service_categories', COUNT(*)::text FROM service_categories
UNION ALL SELECT 'services', COUNT(*)::text FROM services
UNION ALL SELECT 'clients', COUNT(*)::text FROM clients
UNION ALL SELECT 'business_hours', COUNT(*)::text FROM business_hours
UNION ALL SELECT 'special_hours', COUNT(*)::text FROM special_hours
UNION ALL SELECT 'blocked_dates', COUNT(*)::text FROM blocked_dates
UNION ALL SELECT 'barbershop_domains', COUNT(*)::text FROM barbershop_domains
UNION ALL SELECT 'payment_settings', COUNT(*)::text FROM payment_settings
UNION ALL SELECT 'whatsapp_config', COUNT(*)::text FROM whatsapp_config
UNION ALL SELECT 'message_templates', COUNT(*)::text FROM message_templates
UNION ALL SELECT 'campaigns', COUNT(*)::text FROM campaigns
UNION ALL SELECT 'coupons', COUNT(*)::text FROM coupons
UNION ALL SELECT 'role_permissions', COUNT(*)::text FROM role_permissions
UNION ALL SELECT 'subscriptions', COUNT(*)::text FROM subscriptions
UNION ALL SELECT 'profiles', COUNT(*)::text FROM profiles
UNION ALL SELECT 'user_roles', COUNT(*)::text FROM user_roles
UNION ALL SELECT 'user_barbershops', COUNT(*)::text FROM user_barbershops
UNION ALL SELECT 'staff', COUNT(*)::text FROM staff
UNION ALL SELECT 'staff_units', COUNT(*)::text FROM staff_units
UNION ALL SELECT 'staff_services', COUNT(*)::text FROM staff_services
UNION ALL SELECT 'portfolio_photos', COUNT(*)::text FROM portfolio_photos
UNION ALL SELECT 'loyalty_points', COUNT(*)::text FROM loyalty_points
UNION ALL SELECT 'client_users', COUNT(*)::text FROM client_users
UNION ALL SELECT 'appointments', COUNT(*)::text FROM appointments
UNION ALL SELECT 'transactions', COUNT(*)::text FROM transactions
UNION ALL SELECT 'reviews', COUNT(*)::text FROM reviews
UNION ALL SELECT 'whatsapp_messages', COUNT(*)::text FROM whatsapp_messages
UNION ALL SELECT 'whatsapp_logs', COUNT(*)::text FROM whatsapp_logs
UNION ALL SELECT 'chatbot_conversations', COUNT(*)::text FROM chatbot_conversations
UNION ALL SELECT 'subscription_addons', COUNT(*)::text FROM subscription_addons
UNION ALL SELECT 'loyalty_transactions', COUNT(*)::text FROM loyalty_transactions
UNION ALL SELECT 'waitlist', COUNT(*)::text FROM waitlist
UNION ALL SELECT 'usage_metrics', COUNT(*)::text FROM usage_metrics;
