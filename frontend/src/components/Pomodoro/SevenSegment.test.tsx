import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { SevenSegmentDigit, SegmentTimeDisplay } from './SevenSegment';

describe('SevenSegmentDigit', () => {
  it('renders a digit box for the given value with segment data', () => {
    const { container } = render(<SevenSegmentDigit value={8} size={40} />);
    const box = container.querySelector('[data-digit]');
    expect(box).not.toBeNull();
    expect(box?.getAttribute('data-digit')).toBe('8');
  });
});

describe('SegmentTimeDisplay', () => {
  it('renders MM:SS as four split-flap digit cards for the given seconds', () => {
    const { container } = render(<SegmentTimeDisplay seconds={25 * 60 + 9} size={40} />);
    // 25:09 -> four cards: minutes tens/ones, seconds tens/ones
    const cards = [...container.querySelectorAll('[data-flipcard]')];
    expect(cards).toHaveLength(4);
    expect(cards.map(c => c.getAttribute('data-flipcard'))).toEqual(['2', '5', '0', '9']);
  });

  it('includes a colon separator between minutes and seconds', () => {
    const { container } = render(<SegmentTimeDisplay seconds={1500} size={40} />);
    expect(container.textContent).toContain(':');
  });

  it('uses a pure white digit color by default', () => {
    const { container } = render(<SegmentTimeDisplay seconds={1500} size={40} />);
    const el = container.firstChild as HTMLElement;
    expect(el.style.getPropertyValue('--mflip-fg')).toBe('#ffffff');
  });

  it('updates the displayed digit cards when seconds change', () => {
    const { container, rerender } = render(<SegmentTimeDisplay seconds={60 + 5} size={40} />);
    const before = [...container.querySelectorAll('[data-flipcard]')].map(c => c.getAttribute('data-flipcard'));
    expect(before).toEqual(['0', '1', '0', '5']);

    rerender(<SegmentTimeDisplay seconds={60 + 6} size={40} />);
    const after = [...container.querySelectorAll('[data-flipcard]')].map(c => c.getAttribute('data-flipcard'));
    expect(after).toEqual(['0', '1', '0', '6']);
  });

  it('reads the same seconds shared by the timer without maintaining its own state', () => {
    const a = render(<SegmentTimeDisplay seconds={1500} size={40} />);
    const aText = a.container.textContent;
    a.unmount();

    const b = render(<SegmentTimeDisplay seconds={1500} size={40} />);
    const bText = b.container.textContent;
    b.unmount();
    expect(aText).toBe(bText);
  });
});
