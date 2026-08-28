-- CreateTable
CREATE TABLE "user_achievements" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "completed_tasks" INTEGER NOT NULL DEFAULT 0,
    "cards_reviewed" INTEGER NOT NULL DEFAULT 0,
    "completed_sessions" INTEGER NOT NULL DEFAULT 0,
    "meaningful_notes" INTEGER NOT NULL DEFAULT 0,
    "files" INTEGER NOT NULL DEFAULT 0,
    "flashcards" INTEGER NOT NULL DEFAULT 0,
    "quizzes_completed" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_achievements_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_achievements_user_id_key" ON "user_achievements"("user_id");

-- AddForeignKey
ALTER TABLE "user_achievements" ADD CONSTRAINT "user_achievements_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
