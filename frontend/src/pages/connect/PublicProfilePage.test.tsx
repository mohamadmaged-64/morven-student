import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import PublicProfilePage from '@/pages/connect/PublicProfilePage';
import type { Profile, AchievementCounters } from '@/services/profileApi';

vi.mock('@/services/profileApi', () => ({
  getPublicProfile: vi.fn(),
  getPublicAchievements: vi.fn(),
}));

import { getPublicProfile, getPublicAchievements } from '@/services/profileApi';

const mockedGetPublicProfile = vi.mocked(getPublicProfile);
const mockedGetPublicAchievements = vi.mocked(getPublicAchievements);

beforeEach(() => {
  vi.clearAllMocks();
});

const publicProfile: Profile = {
  id: 'p1',
  username: 'ahmed_m',
  displayName: 'أحمد محمد',
  bio: 'طالب',
  avatarUrl: null,
  isPublic: true,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-08-01T00:00:00.000Z',
};

const achievements: AchievementCounters = {
  username: 'ahmed_m',
  completedTasks: 3,
  cardsReviewed: 5,
  completedSessions: 2,
  meaningfulNotes: 4,
  files: 1,
  flashcards: 6,
  quizzesCompleted: 0,
  totalAchievements: 3 + 5 + 2 + 4 + 1 + 6 + 0,
  updatedAt: '2026-08-01T00:00:00.000Z',
};

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/connect/profile/ahmed_m']}>
      <Routes>
        <Route path="/connect/profile/:username" element={<PublicProfilePage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('PublicProfilePage achievements', () => {
  it('renders achievements metrics for a public profile', async () => {
    mockedGetPublicProfile.mockResolvedValue({ profile: publicProfile });
    mockedGetPublicAchievements.mockResolvedValue({ achievements });

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('أحمد محمد')).toBeInTheDocument();
      expect(screen.getByText('مهمة مكتملة')).toBeInTheDocument();
    });
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('بطاقة تمت مراجعتها')).toBeInTheDocument();
  });

  it('does not show the milestone message on a public profile', async () => {
    mockedGetPublicProfile.mockResolvedValue({ profile: publicProfile });
    mockedGetPublicAchievements.mockResolvedValue({ achievements });

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('مهمة مكتملة')).toBeInTheDocument();
    });
    // Cards/counters remain, but the milestone banner must be hidden.
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.queryByText('استمر، فإنجازاتك تزيد يومًا بعد يوم.')).not.toBeInTheDocument();
    expect(screen.queryByText('ممتاز! وصلت إلى 100 إنجاز!')).not.toBeInTheDocument();
  });

  it('renders the achievements card with an empty state when total is zero', async () => {
    mockedGetPublicProfile.mockResolvedValue({ profile: publicProfile });
    mockedGetPublicAchievements.mockResolvedValue({
      achievements: {
        ...achievements,
        completedTasks: 0,
        cardsReviewed: 0,
        completedSessions: 0,
        meaningfulNotes: 0,
        files: 0,
        flashcards: 0,
        quizzesCompleted: 0,
        totalAchievements: 0,
      },
    });

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('أحمد محمد')).toBeInTheDocument();
    });
    // The card must appear even with zero achievements, showing an empty state.
    expect(screen.getByText('إنجازات')).toBeInTheDocument();
    expect(screen.getByText('لا توجد إنجازات بعد')).toBeInTheDocument();
    // Counter tiles should not be rendered when there is nothing to show.
    expect(screen.queryByText('مهمة مكتملة')).not.toBeInTheDocument();
    expect(screen.queryByText('3')).not.toBeInTheDocument();
  });

  it('renders the achievements card with an empty state when the achievements fetch fails', async () => {
    mockedGetPublicProfile.mockResolvedValue({ profile: publicProfile });
    mockedGetPublicAchievements.mockRejectedValue(new Error('network'));

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('أحمد محمد')).toBeInTheDocument();
    });
    // Profile still renders, and the card degrades gracefully to an empty state.
    expect(screen.getByText('إنجازات')).toBeInTheDocument();
    expect(screen.getByText('لا توجد إنجازات بعد')).toBeInTheDocument();
  });

  it('shows a minimal profile card + privacy notice for a private profile, with no achievements or private data', async () => {
    mockedGetPublicProfile.mockResolvedValue({
      profile: { ...publicProfile, isPublic: false },
    });

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('أحمد محمد')).toBeInTheDocument();
    });
    // Basic identity is shown.
    expect(screen.getByText('@ahmed_m')).toBeInTheDocument();
    // Privacy notice is shown.
    expect(screen.getByText('هذا الحساب خاص')).toBeInTheDocument();
    // Private data is NOT exposed: no bio, no achievements.
    expect(screen.queryByText('طالب')).not.toBeInTheDocument();
    expect(screen.queryByText('إنجازات')).not.toBeInTheDocument();
    expect(mockedGetPublicAchievements).not.toHaveBeenCalled();
  });

  it('does not render the achievements section for a private profile', async () => {
    mockedGetPublicProfile.mockResolvedValue({
      profile: { ...publicProfile, isPublic: false },
    });

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('أحمد محمد')).toBeInTheDocument();
    });
    expect(screen.queryByText('إنجازات')).not.toBeInTheDocument();
    expect(mockedGetPublicAchievements).not.toHaveBeenCalled();
  });
});
