-- DropForeignKey
ALTER TABLE "app_notifications" DROP CONSTRAINT "app_notifications_target_user_id_fkey";

-- AddForeignKey
ALTER TABLE "app_notifications" ADD CONSTRAINT "app_notifications_target_user_id_fkey" FOREIGN KEY ("target_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
