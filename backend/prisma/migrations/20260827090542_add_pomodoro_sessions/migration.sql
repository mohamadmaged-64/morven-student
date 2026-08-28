-- AlterTable
ALTER TABLE "groups" ADD COLUMN     "image_url" TEXT;

-- CreateTable
CREATE TABLE "pomodoro_sessions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "group_id" TEXT NOT NULL,
    "duration_seconds" INTEGER NOT NULL,
    "completed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "session_id" TEXT NOT NULL,

    CONSTRAINT "pomodoro_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "pomodoro_sessions_session_id_key" ON "pomodoro_sessions"("session_id");

-- CreateIndex
CREATE INDEX "pomodoro_sessions_group_id_idx" ON "pomodoro_sessions"("group_id");

-- CreateIndex
CREATE INDEX "pomodoro_sessions_user_id_group_id_idx" ON "pomodoro_sessions"("user_id", "group_id");

-- AddForeignKey
ALTER TABLE "pomodoro_sessions" ADD CONSTRAINT "pomodoro_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pomodoro_sessions" ADD CONSTRAINT "pomodoro_sessions_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;
