import { io, Socket } from 'socket.io-client';
import { getAccessToken } from './authApi';
import { isPreviewMode } from '@/dev/previewMode';
import { API_BASE } from './apiBase';

export interface PresenceUser {
  userId: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  focusing: boolean;
  lastHeartbeat: number;
  socketCount: number;
}

export interface LeaderboardEntry {
  userId: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  totalSeconds: number;
}

let socket: Socket | null = null;
let currentGroupId: string | null = null;
let heartbeatInterval: ReturnType<typeof setInterval> | null = null;

type PresenceCallback = (users: PresenceUser[]) => void;
type UserEventCallback = (data: { groupId: string; user: { userId: string; username: string; displayName: string } }) => void;
type LeaderboardCallback = (data: { groupId: string; leaderboard: LeaderboardEntry[] }) => void;
type FocusingCallback = (data: { groupId: string; userId: string; focusing: boolean }) => void;

let onPresenceUpdate: PresenceCallback | null = null;
let onUserJoined: UserEventCallback | null = null;
let onUserLeft: UserEventCallback | null = null;
let onLeaderboardUpdate: LeaderboardCallback | null = null;
let onFocusingUpdate: FocusingCallback | null = null;

// DEV-ONLY: Mock presence simulation for preview mode
let previewPresenceInterval: ReturnType<typeof setInterval> | null = null;

// Preview users demonstrate the feature:
// - preview-user-001 : online + focusing (covers "online + pomodoro running")
// - user-002 (أحمد محمد): online + NOT focusing
// - user-004 (سارة خالد): online + NOT focusing (non-zero hours elsewhere)
// (offline users simply are absent from this list — no standalone indicator)
const MOCK_PRESENCE_USERS: PresenceUser[] = [
  { userId: 'preview-user-001', username: 'preview_user', displayName: 'معاينة المستخدم', avatarUrl: null, focusing: true, lastHeartbeat: Date.now(), socketCount: 1 },
  { userId: 'user-002', username: 'ahmed_m', displayName: 'أحمد محمد', avatarUrl: null, focusing: false, lastHeartbeat: Date.now(), socketCount: 1 },
  { userId: 'user-004', username: 'sara_k', displayName: 'سارة خالد', avatarUrl: null, focusing: false, lastHeartbeat: Date.now(), socketCount: 2 },
];

function simulatePreviewPresence() {
  setTimeout(() => {
    onPresenceUpdate?.([...MOCK_PRESENCE_USERS]);
  }, 300);

  previewPresenceInterval = setInterval(() => {
    const updated = MOCK_PRESENCE_USERS.map((u) => ({
      ...u,
      lastHeartbeat: Date.now(),
    }));
    onPresenceUpdate?.([...updated]);
  }, 15_000);
}

export function connectSocket(): Socket {
  if (isPreviewMode()) {
    return { connected: true, id: 'preview-socket' } as Socket;
  }

  if (socket?.connected) return socket;

  const token = getAccessToken();
  if (!token) throw new Error('No access token');

  socket = io(`${API_BASE}/connect`, {
    auth: { token },
    transports: ['websocket', 'polling'],
  });

  socket.on('connect', () => {
    if (currentGroupId) {
      socket?.emit('join-group', { groupId: currentGroupId });
    }
  });

  socket.on('group-presence-update', (data: { groupId: string; users: PresenceUser[] }) => {
    if (data.groupId === currentGroupId) {
      onPresenceUpdate?.(data.users);
    }
  });

  socket.on('group-user-joined', (data: { groupId: string; user: { userId: string; username: string; displayName: string } }) => {
    if (data.groupId === currentGroupId) {
      onUserJoined?.(data);
    }
  });

  socket.on('group-user-left', (data: { groupId: string; user: { userId: string; username: string; displayName: string } }) => {
    if (data.groupId === currentGroupId) {
      onUserLeft?.(data);
    }
  });

  socket.on('group-leaderboard-update', (data: { groupId: string; leaderboard: LeaderboardEntry[] }) => {
    if (data.groupId === currentGroupId) {
      onLeaderboardUpdate?.(data);
    }
  });

  socket.on('user-focusing-update', (data: { groupId: string; userId: string; focusing: boolean }) => {
    if (data.groupId === currentGroupId) {
      onFocusingUpdate?.(data);
    }
  });

  socket.on('disconnect', () => {
    stopHeartbeat();
  });

  return socket;
}

/** Emit the current user's live focusing (Pomodoro running) state to the server,
 *  which broadcasts it to every group the user belongs to (cross-group). */
export function emitFocusingState(focusing: boolean) {
  if (isPreviewMode()) return;
  if (!socket?.connected) {
    try { connectSocket(); } catch { return; }
    if (!socket?.connected) return;
  }
  socket?.emit('focusing-state', { focusing });
}

export function joinGroup(groupId: string) {
  if (isPreviewMode()) {
    if (currentGroupId && currentGroupId !== groupId) {
      leaveGroup(currentGroupId);
    }
    currentGroupId = groupId;
    simulatePreviewPresence();
    return;
  }

  if (!socket?.connected) {
    connectSocket();
  }

  if (currentGroupId && currentGroupId !== groupId) {
    leaveGroup(currentGroupId);
  }

  currentGroupId = groupId;
  socket?.emit('join-group', { groupId });
  startHeartbeat(groupId);
}

export function leaveGroup(groupId: string) {
  if (isPreviewMode()) {
    if (previewPresenceInterval) {
      clearInterval(previewPresenceInterval);
      previewPresenceInterval = null;
    }
    if (currentGroupId === groupId) {
      currentGroupId = null;
    }
    return;
  }

  socket?.emit('leave-group', { groupId });
  if (currentGroupId === groupId) {
    currentGroupId = null;
    stopHeartbeat();
  }
}

export function disconnectSocket() {
  if (isPreviewMode()) {
    if (previewPresenceInterval) {
      clearInterval(previewPresenceInterval);
      previewPresenceInterval = null;
    }
    currentGroupId = null;
    return;
  }

  stopHeartbeat();
  currentGroupId = null;
  socket?.disconnect();
  socket = null;
}

export function onPresence(callback: PresenceCallback) {
  onPresenceUpdate = callback;
}

export function onJoined(callback: UserEventCallback) {
  onUserJoined = callback;
}

export function onLeft(callback: UserEventCallback) {
  onUserLeft = callback;
}

export function onLeaderboard(callback: LeaderboardCallback) {
  onLeaderboardUpdate = callback;
}

export function onFocusing(callback: FocusingCallback) {
  onFocusingUpdate = callback;
}

function startHeartbeat(groupId: string) {
  stopHeartbeat();
  heartbeatInterval = setInterval(() => {
    socket?.emit('heartbeat', { groupId });
  }, 15_000);
}

function stopHeartbeat() {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
  }
}
