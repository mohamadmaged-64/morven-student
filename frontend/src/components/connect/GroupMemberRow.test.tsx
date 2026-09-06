import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { GroupMemberRow } from './GroupMemberRow';

const baseMember = {
  id: 'u1',
  username: 'ahmed_m',
  displayName: ' محمد',
  avatarUrl: null,
  role: 'MEMBER',
};

function renderRow(props: Partial<Parameters<typeof GroupMemberRow>[0]> = {}) {
  return render(
    <MemoryRouter>
      <GroupMemberRow
        member={baseMember}
        totalSeconds={0}
        focusing={false}
        isSelf={false}
        canRemove={false}
        {...props}
      />
    </MemoryRouter>,
  );
}

describe('GroupMemberRow', () => {
  it('always shows the Pomodoro hours badge, including 0 ساعة', () => {
    renderRow({ totalSeconds: 0 });
    expect(screen.getByText('0 ساعة')).toBeInTheDocument();
  });

  it('shows non-zero hours always with the fixed word ساعة', () => {
    renderRow({ totalSeconds: 5400 }); // 1.5h
    expect(screen.getByText('1.5 ساعة')).toBeInTheDocument();
    renderRow({ totalSeconds: 14400 }); // 4h
    expect(screen.getByText('4 ساعة')).toBeInTheDocument();
  });

  it('shows the Focusing ICON only when the member is focusing', () => {
    const { unmount } = renderRow({ focusing: false });
    expect(screen.queryByLabelText('يركّز الآن')).not.toBeInTheDocument();
    unmount();

    renderRow({ focusing: true });
    expect(screen.getByLabelText('يركّز الآن')).toBeInTheDocument();
    // The word "يركّز" must NOT be rendered as text — only the icon remains.
    expect(screen.queryByText('يركّز')).not.toBeInTheDocument();
  });

  it('places the Focusing ICON to the RIGHT of (before) the hours badge in RTL', () => {
    renderRow({ focusing: true, totalSeconds: 10800 }); // 3h
    const hours = screen.getByText('3 ساعة');
    const focusing = screen.getByLabelText('يركّز الآن');
    // In an RTL flex row the first DOM child renders rightmost, so the focusing
    // icon must precede the hours badge in document order.
    expect(focusing.compareDocumentPosition(hours) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('places the Remove action on the right side next to the avatar (before the badges)', () => {
    renderRow({ focusing: true, totalSeconds: 10800, canRemove: true, onRemove: () => {} });
    const removeBtn = screen.getByRole('button', { name: 'إزالة العضو' });
    const hours = screen.getByText('3 ساعة');
    // The remove button belongs to the avatar/name cluster (right side in RTL),
    // so it must come BEFORE the hours badge in document order — i.e. NOT at the
    // far-left edge of the row.
    expect(removeBtn.compareDocumentPosition(hours) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('renders NO standalone online/offline indicator for a non-focusing member', () => {
    renderRow({ focusing: false });
    // The hours badge is present, but there must be no separate online badge.
    expect(screen.getByText('0 ساعة')).toBeInTheDocument();
    // No "متصل" (online) badge anywhere.
    expect(screen.queryByText('متصل')).not.toBeInTheDocument();
    expect(screen.queryByText('غير متصل')).not.toBeInTheDocument();
  });

  it('shows the crown only for the OWNER', () => {
    const { unmount } = renderRow({ member: { ...baseMember, role: 'OWNER' } });
    expect(screen.getByLabelText('المنشئ')).toBeInTheDocument();
    unmount();

    renderRow({ member: { ...baseMember, role: 'MEMBER' } });
    expect(screen.queryByLabelText('المنشئ')).not.toBeInTheDocument();
  });

  it('shows the remove action only when authorized', async () => {
    const user = userEvent.setup();
    const onRemove = vi.fn();
    const { unmount } = renderRow({ canRemove: true, onRemove });

    const removeBtn = screen.getByRole('button', { name: 'إزالة العضو' });
    expect(removeBtn).toBeInTheDocument();
    await user.click(removeBtn);
    expect(onRemove).toHaveBeenCalledTimes(1);
    unmount();

    renderRow({ canRemove: false });
    expect(screen.queryByRole('button', { name: 'إزالة العضو' })).not.toBeInTheDocument();
  });
});
