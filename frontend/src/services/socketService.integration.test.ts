// @vitest-environment node
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createServer } from 'node:http';
import type { Server as HttpServer } from 'node:http';
import { Server, type Socket } from 'socket.io';
import { io as ioc } from 'socket.io-client';
import type { Socket as ClientSocket } from 'socket.io-client';
import type { PresenceUser } from './socketService';

const state = vi.hoisted(() => ({ base: '', token: 'user-B' }));

vi.mock('./apiBase', () => ({
  get API_BASE() {
    return state.base;
  },
}));
vi.mock('./authApi', () => ({
  getAccessToken: () => state.token,
}));
vi.mock('@/dev/previewMode', () => ({
  isPreviewMode: () => false,
}));

/**
 * Minimal in-process replica of the backend's `/connect` namespace presence +
 * focusing protocol (mirrors presence.service.ts): users join groups, focusing
 * state is tracked per user, and presence + `user-focusing-update` are
 * broadcast to the rooms the focusing user belongs to.
 */
async function startReplica(): Promise<string> {
  const fakeUsers = new Map<string, { socket: Socket; focusing: boolean; groups: Set<string> }>();

  const httpServer: HttpServer = createServer((_req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('ok');
  });
  const ioServer = new Server(httpServer, { cors: { origin: '*' } });
  const nsp = ioServer.of('/connect');

  nsp.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (typeof token !== 'string' || !token) {
      next(new Error('missing token'));
      return;
    }
    socket.data.userId = token;
    next();
  });

  const pushPresence = (groupId: string) => {
    const users: PresenceUser[] = [];
    for (const [userId, u] of fakeUsers) {
      if (u.groups.has(groupId)) {
        users.push({
          userId,
          username: `user_${userId}`,
          displayName: `User ${userId}`,
          avatarUrl: null,
          focusing: u.focusing,
          lastHeartbeat: Date.now(),
          socketCount: 1,
        });
      }
    }
    nsp.to(`group:${groupId}`).emit('group-presence-update', { groupId, users });
  };

  nsp.on('connection', (socket) => {
    const userId = socket.data.userId as string;
    let user = fakeUsers.get(userId);
    if (!user) {
      user = { socket, focusing: false, groups: new Set() };
      fakeUsers.set(userId, user);
    }
    user.socket = socket;

    socket.on('join-group', ({ groupId }: { groupId: string }) => {
      user!.groups.add(groupId);
      socket.join(`group:${groupId}`);
      pushPresence(groupId);
    });

    socket.on('focusing-state', ({ focusing }: { focusing: boolean }) => {
      user!.focusing = focusing === true;
      for (const gid of user!.groups) {
        nsp
          .to(`group:${gid}`)
          .emit('user-focusing-update', { groupId: gid, userId, focusing: user!.focusing });
        pushPresence(gid);
      }
    });

    socket.on('disconnect', () => {
      fakeUsers.delete(userId);
    });
  });

  await new Promise<void>((resolve) => httpServer.listen(0, '127.0.0.1', resolve));
  const port = (httpServer.address() as { port: number }).port;
  appRef.server = ioServer;
  appRef.httpServer = httpServer;
  appRef.nspRef = nsp;
  return `http://127.0.0.1:${port}`;
}

const appRef = {
  server: null as Server | null,
  httpServer: null as HttpServer | null,
  nspRef: null as ReturnType<Server['of']> | null,
};

async function waitUntil(cond: () => boolean, ms = 5000) {
  const t0 = Date.now();
  while (!cond()) {
    if (Date.now() - t0 > ms) {
      throw new Error('waitUntil() timed out');
    }
    await new Promise((r) => setTimeout(r, 25));
  }
}

let socketService: typeof import('./socketService') | null = null;
const rawClients: ClientSocket[] = [];
let baseUrl = '';

beforeAll(async () => {
  baseUrl = await startReplica();
  state.base = baseUrl;
  socketService = await import('./socketService');
});

afterEach(() => {
  socketService?.disconnectSocket();
  for (const c of rawClients) c.disconnect();
  rawClients.length = 0;
});

afterAll(async () => {
  socketService?.disconnectSocket();
  for (const c of rawClients) c.disconnect();
  appRef.server?.close();
  appRef.httpServer?.close();
  await new Promise((r) => setTimeout(r, 100));
});

describe('socketService realtime presence + focusing (real socket.io server)', () => {
  it('spreads presence snapshots of online group members', async () => {
    const svc = socketService!;
    state.token = 'user-B';
    const presenceEvents: PresenceUser[][] = [];
    svc.onPresence((users) => presenceEvents.push(users));

    svc.connectSocket();
    svc.joinGroup('grp-b-presence');

    await waitUntil(() =>
      presenceEvents.some((ev) => ev.some((u) => u.userId === 'user-B')),
    );
    expect(presenceEvents.at(-1)!.some((u) => u.userId === 'user-B')).toBe(true);
  }, 20000);

  it('lets member A be seen as focusing (pomodoro running) by member B in the same group', async () => {
    const svc = socketService!;
    state.token = 'user-B';
    const focusingEvents: { groupId: string; userId: string; focusing: boolean }[] = [];
    const presenceEvents: PresenceUser[][] = [];
    svc.onFocusing((d) => focusingEvents.push(d));
    svc.onPresence((users) => presenceEvents.push(users));

    svc.connectSocket();
    svc.joinGroup('grp-focus-ab');

    const clientA = ioc(`${baseUrl}/connect`, {
      transports: ['websocket', 'polling'],
      auth: { token: 'user-A' },
    });
    rawClients.push(clientA);
    await new Promise<void>((res, rej) => {
      clientA.on('connect', () => res());
      clientA.on('connect_error', (err) => rej(new Error(err.message)));
    });
    clientA.emit('join-group', { groupId: 'grp-focus-ab' });

    // B sees A online in the group presence before any focus starts
    await waitUntil(() =>
      presenceEvents.some((ev) => ev.some((u) => u.userId === 'user-A')),
    );
    expect(
      presenceEvents.at(-1)!.some((u) => u.userId === 'user-A' && u.focusing === false),
    ).toBe(true);

    // A starts a focus session (what emitFocusingState(true) sends)
    clientA.emit('focusing-state', { focusing: true });
    await waitUntil(() =>
      focusingEvents.some((d) => d.userId === 'user-A' && d.focusing === true),
    );
    await waitUntil(() =>
      presenceEvents.some((ev) => ev.some((u) => u.userId === 'user-A' && u.focusing === true)),
    );

    // A stops focusing
    clientA.emit('focusing-state', { focusing: false });
    await waitUntil(() =>
      focusingEvents.some((d) => d.userId === 'user-A' && d.focusing === false),
    );
    await waitUntil(() =>
      presenceEvents.some((ev) => ev.some((u) => u.userId === 'user-A' && u.focusing === false)),
    );

    // B's own pomodoro start (emitFocusingState) is broadcast to A
    const aSeen: { userId: string; focusing: boolean }[] = [];
    clientA.on('user-focusing-update', (d: { userId: string; focusing: boolean }) =>
      aSeen.push(d),
    );
    svc.emitFocusingState(true);
    await waitUntil(() => aSeen.some((d) => d.userId === 'user-B' && d.focusing === true));
    svc.emitFocusingState(false);
    await waitUntil(() => aSeen.some((d) => d.userId === 'user-B' && d.focusing === false));
  }, 20000);
});