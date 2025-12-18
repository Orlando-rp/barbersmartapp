-- ============================================
-- UPDATE FEATURE FLAGS FOR ALL SUBSCRIPTION PLANS
-- ============================================
-- Execute this SQL in the Supabase SQL Editor to update
-- the feature_flags column for all subscription plans.
-- ============================================

-- Update Enterprise plan with all features enabled (includes white_label)
UPDATE subscription_plans 
SET feature_flags = '{
  "appointments": true,
  "clients": true,
  "services": true,
  "staff_basic": true,
  "finance_basic": true,
  "waitlist": true,
  "public_booking": true,
  "business_hours": true,
  "staff_advanced": true,
  "staff_earnings": true,
  "staff_multi_unit": true,
  "finance_advanced": true,
  "commissions": true,
  "export_data": true,
  "basic_reports": true,
  "advanced_reports": true,
  "predictive_analytics": true,
  "whatsapp_notifications": true,
  "whatsapp_chat": true,
  "whatsapp_chatbot": true,
  "marketing_campaigns": true,
  "marketing_coupons": true,
  "loyalty_program": true,
  "reviews": true,
  "client_history": true,
  "multi_unit": true,
  "multi_unit_reports": true,
  "white_label": true,
  "custom_domain": true,
  "audit_logs": true,
  "priority_support": true,
  "api_access": true
}'::jsonb
WHERE slug = 'enterprise';

-- Update Premium/Business plan (most features, no white_label)
UPDATE subscription_plans 
SET feature_flags = '{
  "appointments": true,
  "clients": true,
  "services": true,
  "staff_basic": true,
  "finance_basic": true,
  "waitlist": true,
  "public_booking": true,
  "business_hours": true,
  "staff_advanced": true,
  "staff_earnings": true,
  "staff_multi_unit": true,
  "finance_advanced": true,
  "commissions": true,
  "export_data": true,
  "basic_reports": true,
  "advanced_reports": true,
  "predictive_analytics": true,
  "whatsapp_notifications": true,
  "whatsapp_chat": true,
  "whatsapp_chatbot": true,
  "marketing_campaigns": true,
  "marketing_coupons": true,
  "loyalty_program": true,
  "reviews": true,
  "client_history": true,
  "multi_unit": true,
  "multi_unit_reports": true,
  "white_label": false,
  "custom_domain": false,
  "audit_logs": true,
  "priority_support": false,
  "api_access": false
}'::jsonb
WHERE slug IN ('premium', 'business');

-- Update Professional plan
UPDATE subscription_plans 
SET feature_flags = '{
  "appointments": true,
  "clients": true,
  "services": true,
  "staff_basic": true,
  "finance_basic": true,
  "waitlist": true,
  "public_booking": true,
  "business_hours": true,
  "staff_advanced": true,
  "staff_earnings": true,
  "staff_multi_unit": false,
  "finance_advanced": true,
  "commissions": true,
  "export_data": true,
  "basic_reports": true,
  "advanced_reports": true,
  "predictive_analytics": false,
  "whatsapp_notifications": true,
  "whatsapp_chat": true,
  "whatsapp_chatbot": false,
  "marketing_campaigns": true,
  "marketing_coupons": true,
  "loyalty_program": true,
  "reviews": true,
  "client_history": true,
  "multi_unit": false,
  "multi_unit_reports": false,
  "white_label": false,
  "custom_domain": false,
  "audit_logs": false,
  "priority_support": false,
  "api_access": false
}'::jsonb
WHERE slug = 'professional';

-- Update Starter plan
UPDATE subscription_plans 
SET feature_flags = '{
  "appointments": true,
  "clients": true,
  "services": true,
  "staff_basic": true,
  "finance_basic": true,
  "waitlist": true,
  "public_booking": true,
  "business_hours": true,
  "staff_advanced": false,
  "staff_earnings": false,
  "staff_multi_unit": false,
  "finance_advanced": false,
  "commissions": false,
  "export_data": false,
  "basic_reports": true,
  "advanced_reports": false,
  "predictive_analytics": false,
  "whatsapp_notifications": true,
  "whatsapp_chat": false,
  "whatsapp_chatbot": false,
  "marketing_campaigns": false,
  "marketing_coupons": false,
  "loyalty_program": false,
  "reviews": true,
  "client_history": true,
  "multi_unit": false,
  "multi_unit_reports": false,
  "white_label": false,
  "custom_domain": false,
  "audit_logs": false,
  "priority_support": false,
  "api_access": false
}'::jsonb
WHERE slug = 'starter';

-- Update Free plan
UPDATE subscription_plans 
SET feature_flags = '{
  "appointments": true,
  "clients": true,
  "services": true,
  "staff_basic": true,
  "finance_basic": true,
  "waitlist": false,
  "public_booking": true,
  "business_hours": true,
  "staff_advanced": false,
  "staff_earnings": false,
  "staff_multi_unit": false,
  "finance_advanced": false,
  "commissions": false,
  "export_data": false,
  "basic_reports": false,
  "advanced_reports": false,
  "predictive_analytics": false,
  "whatsapp_notifications": false,
  "whatsapp_chat": false,
  "whatsapp_chatbot": false,
  "marketing_campaigns": false,
  "marketing_coupons": false,
  "loyalty_program": false,
  "reviews": false,
  "client_history": false,
  "multi_unit": false,
  "multi_unit_reports": false,
  "white_label": false,
  "custom_domain": false,
  "audit_logs": false,
  "priority_support": false,
  "api_access": false
}'::jsonb
WHERE slug = 'free';

-- Verify the updates
SELECT slug, name, feature_flags->>'white_label' as white_label_enabled
FROM subscription_plans
ORDER BY price DESC;
