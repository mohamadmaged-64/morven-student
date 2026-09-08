-- CreateIndex
CREATE INDEX "pomodoro_sessions_group_id_completed_at_idx" ON "pomodoro_sessions"("group_id", "completed_at");
