import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { GroupMemberRow } from './GroupMemberRow';

const baseMember = {
  id: 'u1',
  username: 'ahmed_m',
  displayName: 'محمد',
  avatarUrl: null,
  role: 'MEMBER',
};

function renderRow(props: Partial<Parameters<typeof GroupMemberRow>[0]> = {}) {
  return render(
    <MemoryRouter>
      <GroupMemberRow
        member={baseMember}
        rank={1}
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

  it('places the Remove action on the right side next to the name (before the badges)', () => {
    renderRow({ focusing: true, totalSeconds: 10800, canRemove: true, onRemove: () => {} });
    const removeBtn = screen.getByRole('button', { name: 'إزالة العضو' });
    const hours = screen.getByText('3 ساعة');
    // The remove button belongs to the name cluster (right side in RTL),
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

  it('shows a unified GOLD trophy/cup icon (no circular badge) for 1st place', () => {
    renderRow({ rank: 1 });
    const badge = screen.getByLabelText('المركز الأول');
    expect(badge).toBeInTheDocument();
    expect(screen.queryByLabelText('المركز الثاني')).not.toBeInTheDocument();
    // The icon must NOT be framed inside a circle or any container background.
    expect(badge.className).not.toMatch(/rounded-full/);
    expect(badge.className).not.toMatch(/\bbg-/);
  });

  it('shows a SILVER trophy/cup icon for 2nd place', () => {
    renderRow({ rank: 2 });
    const badge = screen.getByLabelText('المركز الثاني');
    expect(badge).toBeInTheDocument();
    expect(badge.className).not.toMatch(/rounded-full/);
    expect(badge.className).not.toMatch(/\bbg-/);
  });

  it('shows a BRONZE trophy/cup icon for 3rd place', () => {
    renderRow({ rank: 3 });
    const badge = screen.getByLabelText('المركز الثالث');
    expect(badge).toBeInTheDocument();
    expect(badge.className).not.toMatch(/rounded-full/);
    expect(badge.className).not.toMatch(/\bbg-/);
  });

  it('shows a plain number badge from 4th place onward', () => {
    const { unmount } = renderRow({ rank: 4 });
    expect(screen.getByText('4')).toBeInTheDocument();
    expect(screen.queryByLabelText('المركز الأول')).not.toBeInTheDocument();
    unmount();

    renderRow({ rank: 8 });
    expect(screen.getByText('8')).toBeInTheDocument();
  });

  it('places the rank badge on the RIGHT side of the picture, picture on the RIGHT of the name', () => {
    renderRow({ rank: 3, member: { ...baseMember, avatarUrl: 'avatar.png' } });
    const avatar = screen.getByAltText('محمد');
    const rankBadge = screen.getByLabelText('المركز الثالث');
    const name = screen.getByText('محمد');
    // In an RTL flex row the first DOM child renders rightmost. So the rank
    // badge must precede the avatar, and the avatar must precede the name, in
    // document order (rank is right of the picture, picture is right of the
    // name).
    expect(rankBadge.compareDocumentPosition(avatar) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(avatar.compareDocumentPosition(name) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});