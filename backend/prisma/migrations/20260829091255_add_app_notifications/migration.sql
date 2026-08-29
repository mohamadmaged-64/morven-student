-- CreateEnum
CREATE TYPE "AppNotificationType" AS ENUM ('info', 'announcement', 'update');

-- CreateTable
CREATE TABLE "app_notifications" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "type" "AppNotificationType" NOT NULL DEFAULT 'info',
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "app_notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "app_notifications_created_at_idx" ON "app_notifications"("created_at");
