import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { usePomodoroStore } from '@/pages/tools/GeneralTools/Pomodoro/usePomodoroStore';
import { listGroups, submitPomodoroSession } from '@/services/groupApi';
import { emitFocusingState } from '@/services/socketService';
import {
  startCompletionPolling,
  stopCompletionPolling,
} from './connectPomodoro';

vi.mock('@/services/groupApi', () => ({
  listGroups: vi.fn(),
  submitPomodoroSession: vi.fn(),
}));

vi.mock('@/services/socketService', () => ({
  emitFocusingState: vi.fn(),
}));

const mockListGroups = vi.mocked(listGroups);
const mockSubmit = vi.mocked(submitPomodoroSession);
const mockEmit = vi.mocked(emitFocusingState);

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
  mockSubmit.mockResolvedValue({ session: { id: 's', durationSeconds: 0, completedAt: '' }, userTotalSeconds: 0 });
  usePomodoroStore.setState({
    isRunning: false,
    mode: 'focus',
    completedSessions: 0,
    settings: { focusDuration: 25, breakDuration: 5, longBreakDuration: 15, sessionsBeforeLongBreak: 4, autoStart: false },
  } as never);
});

afterEach(() => {
  stopCompletionPolling();
});

describe('connectPomodoro focusing emission', () => {
  it('emits focusing=true when a focus session starts, and false when it stops', () => {
    mockListGroups.mockResolvedValue({ groups: [] });
    startCompletionPolling();

    // Started paused; initial emission should be false.
    expect(mockEmit).toHaveBeenLastCalledWith(false);

    usePomodoroStore.setState({ isRunning: true, mode: 'focus' });
    expect(mockEmit).toHaveBeenLastCalledWith(true);

    usePomodoroStore.setState({ isRunning: false, mode: 'focus' });
    expect(mockEmit).toHaveBeenLastCalledWith(false);
    expect(mockEmit).not.toHaveBeenLastCalledWith(true);
  });

  it('does not emit focusing for break sessions', () => {
    mockListGroups.mockResolvedValue({ groups: [] });
    startCompletionPolling();
    vi.clearAllMocks();

    usePomodoroStore.setState({ isRunning: true, mode: 'break' });
    expect(mockEmit).not.toHaveBeenCalled();
  });
});

describe('connectPomodoro cross-group submission', () => {
  it('submits a completed session to EVERY group the user belongs to', async () => {
    mockListGroups.mockResolvedValue({
      groups: [
        { id: 'g1' } as never,
        { id: 'g2' } as never,
        { id: 'g3' } as never,
      ],
    });
    startCompletionPolling();

    // Let the async group-list refresh (kicked off at startup) settle so the
    // cached member group ids are available before we trigger a completion.
    await new Promise((r) => setTimeout(r, 50));

    // Trigger a completion so the observer credits every group.
    usePomodoroStore.setState({ completedSessions: 1, isRunning: false, mode: 'focus' });

    await vi.waitFor(() => expect(mockSubmit.mock.calls.length).toBeGreaterThanOrEqual(3));

    const groupIds = mockSubmit.mock.calls.map(([data]) => data.groupId);
    expect(groupIds).toContain('g1');
    expect(groupIds).toContain('g2');
    expect(groupIds).toContain('g3');
  });
});
