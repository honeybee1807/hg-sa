-- Fixes the self-service "edit your listing" flow (app/edit/), which has
-- been unable to read or write business_edit_requests since the table was
-- created: unlike the tables in admin-security-hardening.sql, its original
-- setup SQL was only run ad hoc (never committed here) and never granted
-- service_role access, so every server action touching it — requestEditLink,
-- getEditableBusiness, submitEditRequest — has been failing with
-- "permission denied for table business_edit_requests" (Postgres 42501).
-- Run this once, manually, in the Supabase SQL Editor.

grant select, insert, update on public.business_edit_requests to service_role;
