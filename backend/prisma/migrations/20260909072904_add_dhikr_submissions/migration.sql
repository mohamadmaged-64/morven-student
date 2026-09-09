-- CreateEnum
CREATE TYPE "DhikrSubmissionStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterTable
ALTER TABLE "app_notifications" ADD COLUMN     "target_user_id" TEXT;

-- CreateTable
CREATE TABLE "dhikr_submissions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "category_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT '',
    "status" "DhikrSubmissionStatus" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dhikr_submissions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "dhikr_submissions_user_id_idx" ON "dhikr_submissions"("user_id");

-- CreateIndex
CREATE INDEX "dhikr_submissions_status_created_at_idx" ON "dhikr_submissions"("status", "created_at");

-- CreateIndex
CREATE INDEX "app_notifications_target_user_id_idx" ON "app_notifications"("target_user_id");

-- AddForeignKey
ALTER TABLE "app_notifications" ADD CONSTRAINT "app_notifications_target_user_id_fkey" FOREIGN KEY ("target_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dhikr_submissions" ADD CONSTRAINT "dhikr_submissions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
