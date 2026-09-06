import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import LoginPage from '@/pages/auth/LoginPage';

function renderPage() {
  return render(
    <MemoryRouter>
      <LoginPage />
    </MemoryRouter>,
  );
}

describe('LoginPage password reset link', () => {
  it('provides a link to the forgot-password page', () => {
    renderPage();
    const link = screen.getByRole('link', { name: /نسيت كلمة المرور/ });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', '/forgot-password');
  });

  it('still links to registration', () => {
    renderPage();
    const link = screen.getByRole('link', { name: /إنشاء حساب/ });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', '/register');
  });
});
