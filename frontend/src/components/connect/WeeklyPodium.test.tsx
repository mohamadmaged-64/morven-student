import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { WeeklyPodium } from './WeeklyPodium';

function entry(rank: number, uid: string, seconds: number) {
  return {
    rank,
    userId: `u_${uid}`,
    username: `user_${uid}`,
    displayName: `الطالب ${uid}`,
    avatarUrl: null,
    weeklySeconds: seconds,
  };
}

function renderPodium(ranking = [entry(1, 'a', 7200), entry(2, 'b', 5400), entry(3, 'c', 3600)]) {
  return render(
    <MemoryRouter>
      <WeeklyPodium ranking={ranking} />
    </MemoryRouter>,
  );
}

describe('WeeklyPodium', () => {
  it('renders the three places physically as [2nd, 1st, 3rd] left-to-right', () => {
    // In this RTL container the DOM order is [3rd, 1st, 2nd] so that the visual
    // left-to-right order is 2nd, 1st, 3rd.
    renderPodium();
    const places = Array.from(document.querySelectorAll('[data-place]')).map((el) => el.getAttribute('data-place'));
    expect(places).toEqual(['3', '1', '2']);
  });

  it('labels every place as المركز الأول/الثاني/الثالث', () => {
    renderPodium();
    expect(screen.getByLabelText('المركز الأول')).toBeInTheDocument();
    expect(screen.getByLabelText('المركز الثاني')).toBeInTheDocument();
    expect(screen.getByLabelText('المركز الثالث')).toBeInTheDocument();
  });

  it('shows the top-3 weekly hours with the fixed word ساعة', () => {
    renderPodium();
    expect(screen.getByText('2 ساعة')).toBeInTheDocument();
    expect(screen.getByText('1.5 ساعة')).toBeInTheDocument();
    expect(screen.getByText('1 ساعة')).toBeInTheDocument();
  });

  it('links every podium member to their public profile', () => {
    renderPodium();
    for (const uid of ['a', 'b', 'c']) {
      expect(screen.getByText(`الطالب ${uid}`).closest('a')).toHaveAttribute('href', `/connect/profile/user_${uid}`);
    }
  });

  it('keeps a full podium shape when there are fewer than 3 ranked members', () => {
    renderPodium([entry(1, 'a', 7200)]);
    expect(screen.getByText('الطالب a')).toBeInTheDocument();
    const places = Array.from(document.querySelectorAll('[data-place]')).map((el) => el.getAttribute('data-place'));
    expect(places).toEqual(['3', '1', '2']);
    expect(document.querySelectorAll('[data-empty="true"]')).toHaveLength(2);
    expect(screen.getAllByText('—')).toHaveLength(2);
  });

  it('never shows more than the top 3 entries', () => {
    renderPodium([
      entry(1, 'a', 7200),
      entry(2, 'b', 5400),
      entry(3, 'c', 3600),
      entry(4, 'd', 1800),
    ]);
    expect(screen.queryByText('الطالب d')).not.toBeInTheDocument();
  });
});