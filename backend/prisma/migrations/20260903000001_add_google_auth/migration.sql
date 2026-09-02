-- Add Google Sign-In support to users.
-- - `google_id` is the stable Google subject identifier (`sub`) from the
--   verified ID token. Unique (when set) so a given Google account maps to
--   exactly one Morven user. Nullable for password-only accounts.
-- - `email_verified` records Google's verified-email claim.
-- - `password_hash` becomes nullable so Google-only accounts (which have no
--   local password) can exist.

-- AlterTable
ALTER TABLE "users" ALTER COLUMN "password_hash" DROP NOT NULL;

-- AlterTable
ALTER TABLE "users" ADD COLUMN "email_verified" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "users" ADD COLUMN "google_id" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "users_google_id_key" ON "users"("google_id");