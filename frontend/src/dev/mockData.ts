/**
 * DEV-ONLY: Mock data for UI Preview Mode.
 * All data is realistic and covers all Connect features.
 */

export const MOCK_USER = {
  id: 'preview-user-001',
  email: 'preview@morven.dev',
  username: 'preview_user',
  displayName: 'معاينة المستخدم',
  role: 'USER',
  avatarUrl: null,
  createdAt: '2026-01-15T10:00:00.000Z',
};

export const MOCK_PROFILE = {
  id: 'profile-001',
  userId: 'preview-user-001',
  username: 'preview_user',
  email: 'preview@morven.dev',
  displayName: 'معاينة المستخدم',
  bio: 'حساب معاينة لاختبار واجهة مورفن كونكت. هذا النص تم إنشاؤه لأغراض التطوير فقط.',
  avatarUrl: null,
  isPublic: true,
  createdAt: '2026-01-15T10:00:00.000Z',
  updatedAt: '2026-08-20T14:30:00.000Z',
};

export const MOCK_ACHIEVEMENTS = {
  username: 'preview_user',
  completedTasks: 12,
  cardsReviewed: 48,
  completedSessions: 15,
  meaningfulNotes: 23,
  files: 7,
  flashcards: 30,
  quizzesCompleted: 5,
  totalAchievements: 12 + 48 + 15 + 23 + 7 + 30 + 5,
  updatedAt: '2026-08-20T14:30:00.000Z',
};

export const MOCK_GROUPS = [
  {
    id: 'group-001',
    name: 'مجموعة الرياضيات',
    description: 'مجموعة لمناقشة مسائل الرياضيات وال_dp',
    joinCode: '123456',
    creatorId: 'preview-user-001',
    createdAt: '2026-03-10T08:00:00.000Z',
    updatedAt: '2026-08-15T12:00:00.000Z',
    role: 'OWNER',
    memberCount: 5,
  },
  {
    id: 'group-002',
    name: '펄재 physicist فيزياء',
    description: '펄재 فيزياء عامة - مراجعة وحل الامتحانات',
    joinCode: '654321',
    creatorId: 'user-002',
    createdAt: '2026-04-05T14:00:00.000Z',
    updatedAt: '2026-08-10T09:00:00.000Z',
    role: 'MEMBER',
    memberCount: 12,
  },
  {
    id: 'group-003',
    name: '펄재 프로그래밍 برمجة',
    description: '펄재 تعلم البرمجة والمشاريع',
    joinCode: '999888',
    creatorId: 'user-003',
    createdAt: '2026-06-01T10:00:00.000Z',
    updatedAt: '2026-08-20T16:00:00.000Z',
    role: 'ADMIN',
    memberCount: 8,
  },
];

export const MOCK_GROUP_DETAILS: Record<string, {
  id: string;
  name: string;
  description: string | null;
  joinCode: string;
  creatorId: string;
  createdAt: string;
  updatedAt: string;
  role: string;
  members: Array<{ id: string; username: string; displayName: string; avatarUrl: string | null; role: string; joinedAt: string }>;
}> = {
  'group-001': {
    id: 'group-001',
    name: 'مجموعة الرياضيات',
    description: 'مجموعة لمناقشة مسائل الرياضيات',
    joinCode: '123456',
    creatorId: 'preview-user-001',
    createdAt: '2026-03-10T08:00:00.000Z',
    updatedAt: '2026-08-15T12:00:00.000Z',
    role: 'OWNER',
    members: [
      { id: 'preview-user-001', username: 'preview_user', displayName: 'معاينة المستخدم', avatarUrl: null, role: 'OWNER', joinedAt: '2026-03-10T08:00:00.000Z' },
      { id: 'user-002', username: 'ahmed_m', displayName: 'أحمد محمد', avatarUrl: null, role: 'ADMIN', joinedAt: '2026-03-12T10:00:00.000Z' },
      { id: 'user-004', username: 'sara_k', displayName: 'سارة خالد', avatarUrl: null, role: 'MEMBER', joinedAt: '2026-04-01T09:00:00.000Z' },
      { id: 'user-005', username: 'omar_h', displayName: 'عمر حسن', avatarUrl: null, role: 'MEMBER', joinedAt: '2026-05-20T14:00:00.000Z' },
      { id: 'user-006', username: 'fatima_a', displayName: 'فاطمة العلي', avatarUrl: null, role: 'MEMBER', joinedAt: '2026-06-15T11:00:00.000Z' },
    ],
  },
  'group-002': {
    id: 'group-002',
    name: ' physics فيزياء',
    description: ' physics فيزياء عامة - مراجعة وحل الامتحانات',
    joinCode: '654321',
    creatorId: 'user-002',
    createdAt: '2026-04-05T14:00:00.000Z',
    updatedAt: '2026-08-10T09:00:00.000Z',
    role: 'MEMBER',
    members: [
      { id: 'user-002', username: 'ahmed_m', displayName: 'أحمد محمد', avatarUrl: null, role: 'OWNER', joinedAt: '2026-04-05T14:00:00.000Z' },
      { id: 'preview-user-001', username: 'preview_user', displayName: 'معاينة المستخدم', avatarUrl: null, role: 'MEMBER', joinedAt: '2026-04-10T08:00:00.000Z' },
      { id: 'user-003', username: 'ali_dev', displayName: 'علي المطور', avatarUrl: null, role: 'ADMIN', joinedAt: '2026-04-12T10:00:00.000Z' },
      { id: 'user-007', username: 'nora_s', displayName: 'نورة السعيد', avatarUrl: null, role: 'MEMBER', joinedAt: '2026-05-01T09:00:00.000Z' },
      { id: 'user-008', username: 'yusuf_b', displayName: 'يوسف البكري', avatarUrl: null, role: 'MEMBER', joinedAt: '2026-06-20T14:00:00.000Z' },
    ],
  },
  'group-003': {
    id: 'group-003',
    name: ' programming برمجة',
    description: ' تعلم البرمجة والمشاريع',
    joinCode: '999888',
    creatorId: 'user-003',
    createdAt: '2026-06-01T10:00:00.000Z',
    updatedAt: '2026-08-20T16:00:00.000Z',
    role: 'ADMIN',
    members: [
      { id: 'user-003', username: 'ali_dev', displayName: 'علي المطور', avatarUrl: null, role: 'OWNER', joinedAt: '2026-06-01T10:00:00.000Z' },
      { id: 'preview-user-001', username: 'preview_user', displayName: 'معاينة المستخدم', avatarUrl: null, role: 'ADMIN', joinedAt: '2026-06-05T12:00:00.000Z' },
      { id: 'user-004', username: 'sara_k', displayName: 'سارة خالد', avatarUrl: null, role: 'MEMBER', joinedAt: '2026-06-10T08:00:00.000Z' },
      { id: 'user-009', username: 'khalid_r', displayName: 'خالد الرشيد', avatarUrl: null, role: 'MEMBER', joinedAt: '2026-07-01T14:00:00.000Z' },
    ],
  },
};

/** Returns a delayed promise, simulating network latency. */
export function mockDelay<T>(data: T, ms = 200): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(structuredClone(data)), ms));
}

// ---------------------------------------------------------------------------
// Pomodoro leaderboard mocks
// ---------------------------------------------------------------------------

export const MOCK_LEADERBOARDS: Record<string, Array<{
  userId: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  totalSeconds: number;
}>> = {
  // Each group includes a user with non-zero hours AND a user with 0 hours.
  // preview-user-001 belongs to all three groups (cross-group focusing demo).
  'group-001': [
    { userId: 'user-002', username: 'ahmed_m', displayName: 'أحمد محمد', avatarUrl: null, totalSeconds: 10800 },
    { userId: 'preview-user-001', username: 'preview_user', displayName: 'معاينة المستخدم', avatarUrl: null, totalSeconds: 5400 },
    { userId: 'user-004', username: 'sara_k', displayName: 'سارة خالد', avatarUrl: null, totalSeconds: 3600 },
    { userId: 'user-005', username: 'omar_h', displayName: 'عمر حسن', avatarUrl: null, totalSeconds: 0 },
    { userId: 'user-006', username: 'fatima_a', displayName: 'فاطمة العلي', avatarUrl: null, totalSeconds: 0 },
  ],
  'group-002': [
    { userId: 'preview-user-001', username: 'preview_user', displayName: 'معاينة المستخدم', avatarUrl: null, totalSeconds: 9000 },
    { userId: 'user-003', username: 'ali_dev', displayName: 'علي المطور', avatarUrl: null, totalSeconds: 4500 },
    { userId: 'user-002', username: 'ahmed_m', displayName: 'أحمد محمد', avatarUrl: null, totalSeconds: 0 },
    { userId: 'user-007', username: 'nora_s', displayName: 'نورة السعيد', avatarUrl: null, totalSeconds: 1200 },
    { userId: 'user-008', username: 'yusuf_b', displayName: 'يوسف البكري', avatarUrl: null, totalSeconds: 0 },
  ],
  'group-003': [
    { userId: 'user-004', username: 'sara_k', displayName: 'سارة خالد', avatarUrl: null, totalSeconds: 5400 },
    { userId: 'preview-user-001', username: 'preview_user', displayName: 'معاينة المستخدم', avatarUrl: null, totalSeconds: 3600 },
    { userId: 'user-003', username: 'ali_dev', displayName: 'علي المطور', avatarUrl: null, totalSeconds: 1800 },
    { userId: 'user-009', username: 'khalid_r', displayName: 'خالد الرشيد', avatarUrl: null, totalSeconds: 0 },
  ],
};
