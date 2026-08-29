-- Seed initial global notifications (mirrors the original client-side welcome messages).

INSERT INTO "app_notifications" ("id", "title", "body", "type", "created_by", "created_at", "updated_at") VALUES
  ('seed-n1', 'مرحباً بك في الملتقى', 'تم إطلاق الملتقى ! انضم لمجموعتك الدراسية وابدأ التعاون مع زملائك.', 'announcement', NULL, NOW() - INTERVAL '2 hours', NOW()),
  ('seed-n2', 'تحديث جديد', 'تم إضافة غرفة الدراسة المباشرة. يمكنك الآن الانضمام لغرف دراسية مع زملائك.', 'update', NULL, NOW() - INTERVAL '1 day', NOW()),
  ('seed-n3', 'معلومة', 'يمكنك إنشاء حتى 3 مجموعات دراسية. انضم لمجموعات زملائك باستخدام رمز الانضمام.', 'info', NULL, NOW() - INTERVAL '3 days', NOW())
ON CONFLICT ("id") DO NOTHING;