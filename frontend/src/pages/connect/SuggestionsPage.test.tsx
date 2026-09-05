import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import SuggestionsPage from '@/pages/connect/SuggestionsPage';

vi.mock('@/services/suggestionApi', () => ({
  submitSuggestion: vi.fn(),
}));

const addNotification = vi.fn();
vi.mock('@/store/useAppStore', () => ({
  useAppStore: (selector: (state: { addNotification: typeof addNotification }) => unknown) =>
    selector({ addNotification }),
}));

import { submitSuggestion } from '@/services/suggestionApi';
const mockedSubmitSuggestion = vi.mocked(submitSuggestion);

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/connect/suggestions']}>
      <Routes>
        <Route path="/connect/suggestions" element={<SuggestionsPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('SuggestionsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the suggestions form', () => {
    renderPage();
    expect(screen.getByText('الاقتراحات')).toBeInTheDocument();
    expect(
      screen.getByLabelText(/اسم الاقتراح/),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/الموضوع/)).toBeInTheDocument();
    expect(
      screen.getByRole('checkbox', { name: /إرسال بشكل متخفٍ/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /إرسال الاقتراح/ }),
    ).toBeInTheDocument();
  });

  it('shows a validation notification when the title is empty', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole('button', { name: /إرسال الاقتراح/ }));
    expect(addNotification).toHaveBeenCalledWith(
      'يرجى إدخال اسم الاقتراح',
      'warning',
    );
    expect(mockedSubmitSuggestion).not.toHaveBeenCalled();
  });

  it('shows a validation notification when the content is empty', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.type(screen.getByLabelText(/اسم الاقتراح/), 'اقتراح جيد');
    await user.click(screen.getByRole('button', { name: /إرسال الاقتراح/ }));
    expect(addNotification).toHaveBeenCalledWith(
      'يرجى إدخال الموضوع',
      'warning',
    );
    expect(mockedSubmitSuggestion).not.toHaveBeenCalled();
  });

  it('submits a valid suggestion, clears the form, and shows a success toast', async () => {
    const user = userEvent.setup();
    mockedSubmitSuggestion.mockResolvedValue({
      id: 's1',
      title: 'اقتراح جيد',
      content: 'تفاصيل كثيرة',
      createdAt: '2026-09-05T00:00:00.000Z',
      updatedAt: '2026-09-05T00:00:00.000Z',
    });

    renderPage();
    await user.type(screen.getByLabelText(/اسم الاقتراح/), 'اقتراح جيد');
    await user.type(screen.getByLabelText(/الموضوع/), 'تفاصيل كثيرة');
    await user.click(screen.getByRole('button', { name: /إرسال الاقتراح/ }));

    await waitFor(() => {
      expect(mockedSubmitSuggestion).toHaveBeenCalledWith({
        title: 'اقتراح جيد',
        content: 'تفاصيل كثيرة',
      });
    });
    expect(addNotification).toHaveBeenCalledWith(
      'تم إرسال الاقتراح بنجاح',
      'success',
    );
    expect(
      (screen.getByLabelText(/اسم الاقتراح/) as HTMLInputElement).value,
    ).toBe('');
    expect(
      (screen.getByLabelText(/الموضوع/) as HTMLTextAreaElement).value,
    ).toBe('');
  });

  it('shows an error toast when the submission fails', async () => {
    const user = userEvent.setup();
    mockedSubmitSuggestion.mockRejectedValue(new Error('حدث خطأ في الخادم'));

    renderPage();
    await user.type(screen.getByLabelText(/اسم الاقتراح/), 'اقتراح جيد');
    await user.type(screen.getByLabelText(/الموضوع/), 'تفاصيل كثيرة');
    await user.click(screen.getByRole('button', { name: /إرسال الاقتراح/ }));

    await waitFor(() => {
      expect(addNotification).toHaveBeenCalledWith(
        'حدث خطأ في الخادم',
        'error',
      );
    });
  });

  it('toggles the anonymous checkbox without hiding the user association', async () => {
    const user = userEvent.setup();
    mockedSubmitSuggestion.mockResolvedValue({
      id: 's2',
      title: 'عناوين',
      content: 'محتوى',
      createdAt: '2026-09-05T00:00:00.000Z',
      updatedAt: '2026-09-05T00:00:00.000Z',
    });

    renderPage();
    const checkbox = screen.getByRole('checkbox', {
      name: /إرسال بشكل متخفٍ/,
    });
    await user.click(checkbox);
    expect(checkbox).toBeChecked();

    await user.type(screen.getByLabelText(/اسم الاقتراح/), 'عناوين');
    await user.type(screen.getByLabelText(/الموضوع/), 'محتوى');
    await user.click(screen.getByRole('button', { name: /إرسال الاقتراح/ }));

    await waitFor(() => {
      expect(mockedSubmitSuggestion).toHaveBeenCalledWith({
        title: 'عناوين',
        content: 'محتوى',
      });
    });
    // The UI-only anonymous option is not sent to the API.
    expect(mockedSubmitSuggestion).not.toHaveBeenCalledWith(
      expect.objectContaining({ anonymous: true }),
    );
  });
});
