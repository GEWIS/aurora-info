import type { PublicPc, PublicRoomStatus } from '../shared/status';
import type { CorePc, CoreRoomStatus, CoreTrack } from './core-types';

// The only place where identities are dropped: everything the public page gets
// passes through these functions.

/** The PCs the page always lists, in display order. */
const PC_IDS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'vdesktop'];

/** Visitors from the TU/e network see the song title; everyone else only that music is playing. */
const CAMPUS_PREFIX = '131.155.';

/** Room status without the responsibles or the closed message. */
export function toPublicRoom(room: CoreRoomStatus): PublicRoomStatus {
  return {
    open: room.open,
    beerTime: room.beerTime,
    lastCall: room.lastCall,
    coffeeStatus: room.coffeeStatus,
  };
}

/** Exactly the known PCs, in order; unreported ones are offline and users are reduced to their role symbol. */
export function toPublicPcs(pcs: CorePc[]): PublicPc[] {
  const byId = new Map(pcs.map((pc) => [pc.pcId, pc]));
  return PC_IDS.map((pcId): PublicPc => {
    const pc = byId.get(pcId);
    if (!pc) return { pcId, status: 'offline', remote: false, lockedAt: null, users: [] };
    const dead = pc.status === 'offline' || pc.status === 'maintenance';
    return {
      pcId,
      status: pc.status,
      remote: pc.remote,
      lockedAt: dead ? null : pc.lockedAt,
      users: dead ? [] : pc.users.map((user) => ({ symbol: user.symbol })),
    };
  });
}

/** Display text for the current song, gated on the visitor being on campus. */
export function toPlayingSong(tracks: CoreTrack[] | null, visitorIp: string | undefined): string | null {
  if (!tracks || tracks.length === 0) return null;
  const track = tracks[0];
  const ip = visitorIp?.replace(/^::ffff:/, '');
  if (ip?.startsWith(CAMPUS_PREFIX)) return `${track.artists.join(', ')} - ${track.title}`;
  return 'Playing music';
}
