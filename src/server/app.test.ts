import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import type { PublicStatus } from '../shared/status';
import { createApp } from './app';
import type { CoreClient } from './core-client';
import type { CorePc, CoreRoomStatus, CoreTrack } from './core-types';

const room: CoreRoomStatus = {
  open: false,
  responsible: [
    {
      memberId: 4242,
      name: 'Alice Responsible',
      isBoard: true,
      isCandidateBoard: false,
      isKeyholder: false,
      photoUrl: null,
    },
  ],
  beerTime: null,
  lastCall: null,
  closedMessage: 'Closed for Secret Party',
  coffeeStatus: 0,
};

const pcs: CorePc[] = [
  {
    pcId: '1',
    users: [{ memberId: 1001, name: 'Bob Secret', symbol: '' }],
    remote: false,
    lockedAt: null,
    status: 'in-use',
  },
];

const tracks: CoreTrack[] = [
  { title: 'Song', artists: ['Artist'], startTime: '2026-01-01T12:00:00Z', trackURI: 'spotify:track:1' },
];

function fakeCore(overrides: Partial<CoreClient> = {}) {
  return {
    roomStatus: vi.fn(() => Promise.resolve(room)),
    pcUsage: vi.fn(() => Promise.resolve(pcs)),
    currentlyPlaying: vi.fn(() => Promise.resolve(tracks)),
    ...overrides,
  };
}

describe('GET /api/status', () => {
  it('returns the anonymized status without names', async () => {
    const app = createApp({ core: fakeCore(), trustProxy: false });

    const res = await request(app).get('/api/status');

    const body = res.body as PublicStatus;
    expect(res.status).toBe(200);
    expect(res.headers['cache-control']).toBe('no-store');
    expect(body.room).toStrictEqual({ open: false, beerTime: null, lastCall: null, coffeeStatus: 0 });
    expect(body.pcs).toHaveLength(11);
    expect(body.pcs[0]).toStrictEqual({
      pcId: '1',
      status: 'in-use',
      remote: false,
      lockedAt: null,
      users: [{ symbol: '' }],
    });
    expect(body.playingSong).toBe('Playing music');
    for (const secret of ['Alice Responsible', 'Bob Secret', 'Secret Party', '4242', '1001']) {
      expect(res.text).not.toContain(secret);
    }
  });

  it('serves repeat requests within 10 s from the cache and refreshes after', async () => {
    const core = fakeCore();
    let time = 1_000_000;
    const app = createApp({ core, trustProxy: false, now: () => time });

    await request(app).get('/api/status').expect(200);
    time += 9_999;
    await request(app).get('/api/status').expect(200);
    expect(core.roomStatus).toHaveBeenCalledTimes(1);
    expect(core.pcUsage).toHaveBeenCalledTimes(1);
    expect(core.currentlyPlaying).toHaveBeenCalledTimes(1);

    time += 1;
    await request(app).get('/api/status').expect(200);
    expect(core.roomStatus).toHaveBeenCalledTimes(2);
  });

  it('shares one core refresh between concurrent requests', async () => {
    const core = fakeCore();
    const app = createApp({ core, trustProxy: false });

    await Promise.all([request(app).get('/api/status').expect(200), request(app).get('/api/status').expect(200)]);

    expect(core.roomStatus).toHaveBeenCalledTimes(1);
  });

  it('responds 502 when core fails', async () => {
    const core = fakeCore({ roomStatus: vi.fn(() => Promise.reject(new Error('core down'))) });
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const app = createApp({ core, trustProxy: false });

    const res = await request(app).get('/api/status');

    expect(res.status).toBe(502);
    expect(res.body).toStrictEqual({ error: 'Aurora core unavailable' });
    warn.mockRestore();
  });

  it('ignores X-Forwarded-For when no proxy is trusted', async () => {
    const app = createApp({ core: fakeCore(), trustProxy: false });

    const res = await request(app).get('/api/status').set('X-Forwarded-For', '131.155.70.9');

    expect((res.body as PublicStatus).playingSong).toBe('Playing music');
  });

  it('uses X-Forwarded-For from a trusted proxy for the campus check', async () => {
    const app = createApp({ core: fakeCore(), trustProxy: 'loopback' });

    const res = await request(app).get('/api/status').set('X-Forwarded-For', '131.155.70.9');

    expect((res.body as PublicStatus).playingSong).toBe('Artist - Song');
  });
});

describe('other /api routes', () => {
  it('respond 404', async () => {
    const app = createApp({ core: fakeCore(), trustProxy: false });

    const res = await request(app).get('/api/anything');

    expect(res.status).toBe(404);
    expect(res.body).toStrictEqual({ error: 'Not found' });
  });
});
