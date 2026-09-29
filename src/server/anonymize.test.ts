import { describe, expect, it } from 'vitest';
import { toPlayingSong, toPublicPcs, toPublicRoom } from './anonymize';
import type { CorePc, CoreRoomStatus, CoreTrack } from './core-types';

const room: CoreRoomStatus = {
  open: true,
  responsible: [
    {
      memberId: 4242,
      name: 'Alice Responsible',
      isBoard: true,
      isCandidateBoard: false,
      isKeyholder: true,
      photoUrl: 'https://example.org/alice.jpg',
    },
  ],
  beerTime: '17:00',
  lastCall: '22:30',
  closedMessage: 'Internal note',
  coffeeStatus: 3,
};

const tracks: CoreTrack[] = [
  { title: 'Song', artists: ['Artist A', 'Artist B'], startTime: '2026-01-01T12:00:00Z', trackURI: 'spotify:track:1' },
];

describe('toPublicRoom', () => {
  it('keeps only open, beerTime, lastCall and coffeeStatus', () => {
    expect(toPublicRoom(room)).toStrictEqual({ open: true, beerTime: '17:00', lastCall: '22:30', coffeeStatus: 3 });
  });
});

describe('toPublicPcs', () => {
  const pcs: CorePc[] = [
    {
      pcId: '3',
      users: [{ memberId: 1001, name: 'Bob Secret', symbol: '★' }],
      remote: false,
      lockedAt: '2026-01-01T10:00:00Z',
      status: 'locked',
    },
    {
      pcId: 'vdesktop',
      users: [
        { memberId: 1002, name: 'Carol Secret', symbol: '' },
        { memberId: null, name: 'Dave Secret', symbol: '🔑' },
      ],
      remote: true,
      lockedAt: null,
      status: 'remote',
    },
    {
      pcId: '7',
      users: [{ memberId: 1003, name: 'Eve Secret', symbol: '' }],
      remote: false,
      lockedAt: '2026-01-01T09:00:00Z',
      status: 'maintenance',
    },
    { pcId: 'session-42', users: [], remote: true, lockedAt: null, status: 'in-use' },
  ];
  const result = toPublicPcs(pcs);

  it('returns exactly PCs 1-10 and vdesktop, in order, dropping unknown ids', () => {
    expect(result.map((pc) => pc.pcId)).toEqual(['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'vdesktop']);
  });

  it('fills unreported PCs as offline', () => {
    expect(result[0]).toStrictEqual({ pcId: '1', status: 'offline', remote: false, lockedAt: null, users: [] });
    expect(result[9]).toStrictEqual({ pcId: '10', status: 'offline', remote: false, lockedAt: null, users: [] });
  });

  it('reduces users to their symbol', () => {
    expect(result[2]).toStrictEqual({
      pcId: '3',
      status: 'locked',
      remote: false,
      lockedAt: '2026-01-01T10:00:00Z',
      users: [{ symbol: '★' }],
    });
    expect(result[10].users).toStrictEqual([{ symbol: '' }, { symbol: '🔑' }]);

    const serialized = JSON.stringify(result);
    for (const secret of ['Bob Secret', 'Carol Secret', 'Dave Secret', 'Eve Secret', '1001', '1002', '1003']) {
      expect(serialized).not.toContain(secret);
    }
  });

  it('clears users and lock time of a machine in maintenance', () => {
    expect(result[6]).toStrictEqual({ pcId: '7', status: 'maintenance', remote: false, lockedAt: null, users: [] });
  });
});

describe('toPlayingSong', () => {
  it('returns null when nothing is playing', () => {
    expect(toPlayingSong(null, '131.155.71.116')).toBeNull();
    expect(toPlayingSong([], '131.155.71.116')).toBeNull();
  });

  it('shows artist and title to campus visitors, including IPv4-mapped addresses', () => {
    expect(toPlayingSong(tracks, '131.155.71.116')).toBe('Artist A, Artist B - Song');
    expect(toPlayingSong(tracks, '::ffff:131.155.71.116')).toBe('Artist A, Artist B - Song');
  });

  it('only says music is playing to anyone else', () => {
    expect(toPlayingSong(tracks, '8.8.8.8')).toBe('Playing music');
    expect(toPlayingSong(tracks, undefined)).toBe('Playing music');
  });
});
