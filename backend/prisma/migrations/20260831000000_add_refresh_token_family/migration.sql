-- Add token-family + reuse-tracking columns to refresh_tokens.
-- `family_id` is added as nullable first so existing rows can be backfilled,
-- then constrained to NOT NULL. Any later replay of a rotated token revokes
-- the whole family (MEDIUM-02).

ALTER TABLE "refresh_tokens" ADD COLUMN "family_id" TEXT;

UPDATE "refresh_tokens" SET "family_id" = gen_random_uuid()::text WHERE "family_id" IS NULL;

ALTER TABLE "refresh_tokens" ALTER COLUMN "family_id" SET NOT NULL;

ALTER TABLE "refresh_tokens" ADD COLUMN "used_at" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "refresh_tokens_family_id_idx" ON "refresh_tokens"("family_id");
