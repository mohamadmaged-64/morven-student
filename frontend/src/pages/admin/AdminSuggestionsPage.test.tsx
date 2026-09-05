import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import AdminSuggestionsPage from '@/pages/admin/AdminSuggestionsPage';
import type { AdminSuggestion } from '@/services/suggestionApi';

vi.mock('@/services/suggestionApi', () => ({
  listSuggestions: vi.fn(),
}));

import { listSuggestions } from '@/services/suggestionApi';
const mockedListSuggestions = vi.mocked(listSuggestions);

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/admin/suggestions']}>
      <Routes>
        <Route path="/admin/suggestions" element={<AdminSuggestionsPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('AdminSuggestionsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const suggestion: AdminSuggestion = {
    id: 's1',
    title: 'إضافة وضع ليلي',
    content: 'أقترح إضافة وضع ليلي سهل التفعيل',
    userId: 'u1',
    createdAt: '2026-09-05T00:00:00.000Z',
    updatedAt: '2026-09-05T00:00:00.000Z',
    user: {
      id: 'u1',
      email: 'ahmed@example.com',
      username: 'ahmed_m',
      displayName: 'أحمد محمد',
      avatarUrl: null,
    },
  };

  it('shows the loading spinner while fetching', () => {
    mockedListSuggestions.mockReturnValue(new Promise(() => {}));
    renderPage();
    expect(screen.getByText('الاقتراحات')).toBeInTheDocument();
  });

  it('renders submitted suggestions with user info', async () => {
    mockedListSuggestions.mockResolvedValue([suggestion]);
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('أحمد محمد')).toBeInTheDocument();
    });
    expect(screen.getByText('ahmed@example.com')).toBeInTheDocument();
    expect(screen.getByText('إضافة وضع ليلي')).toBeInTheDocument();
    expect(screen.getByText('أقترح إضافة وضع ليلي سهل التفعيل')).toBeInTheDocument();
    expect(screen.getByText(/تاريخ الإرسال/)).toBeInTheDocument();
  });

  it('renders an empty state when there are no suggestions', async () => {
    mockedListSuggestions.mockResolvedValue([]);
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('لا توجد اقتراحات بعد')).toBeInTheDocument();
    });
  });

  it('shows an error banner when the fetch fails', async () => {
    mockedListSuggestions.mockRejectedValue(new Error('حدث خطأ في الخادم'));
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('حدث خطأ في الخادم')).toBeInTheDocument();
    });
  });
});