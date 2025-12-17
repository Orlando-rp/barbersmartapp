-- Migration: Add profile fields to barbershops table for company data
-- Run this in Supabase SQL Editor

-- Add profile fields to barbershops table
ALTER TABLE barbershops 
ADD COLUMN IF NOT EXISTS cnpj TEXT,
ADD COLUMN IF NOT EXISTS responsible_name TEXT,
ADD COLUMN IF NOT EXISTS responsible_phone TEXT,
ADD COLUMN IF NOT EXISTS responsible_email TEXT;

-- Add comments for documentation
COMMENT ON COLUMN barbershops.cnpj IS 'CNPJ da empresa (apenas para matriz)';
COMMENT ON COLUMN barbershops.responsible_name IS 'Nome do responsável legal';
COMMENT ON COLUMN barbershops.responsible_phone IS 'Telefone do responsável';
COMMENT ON COLUMN barbershops.responsible_email IS 'Email do responsável';
