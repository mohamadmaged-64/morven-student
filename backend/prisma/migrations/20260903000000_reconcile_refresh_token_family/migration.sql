-- Reconciliation migration.
-- The `add_refresh_token_family` migration was applied to the database but its
-- changes were later reverted in code (see git revert of "harden auth"): the
-- current ORM schema and auth.service do not use `family_id` / `used_at`.
-- Drop those columns + their index so the database matches the reverted schema
-- and refresh-token inserts (which do not set family_id) work again.

-- DropIndex
DROP INDEX IF EXISTS "refresh_tokens_family_id_idx";

-- AlterTable
ALTER TABLE "refresh_tokens" DROP COLUMN IF EXISTS "family_id";
ALTER TABLE "refresh_tokens" DROP COLUMN IF EXISTS "used_at";