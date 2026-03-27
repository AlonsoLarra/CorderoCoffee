-- Ensure 'cancelado' value exists in order_status enum.
-- Previous migration (202603250001) attempted to add it inside a DO $$ block,
-- but ALTER TYPE ... ADD VALUE inside a transaction block may silently fail
-- in some PostgreSQL configurations. This standalone statement guarantees
-- the value is present.
ALTER TYPE public.order_status ADD VALUE IF NOT EXISTS 'cancelado';
