import type { PcState } from '../shared/status';

// Hand-written mirrors of the aurora-core responses this server reads. Sources:
// aurora-core/src/modules/handlers/screen/info/{info-status-service,pc-usage-service}.ts
// and aurora-core/src/modules/events/music-emitter-events.ts.

/** GET /api/handler/screen/info/room-status */
export interface CoreRoomStatus {
  open: boolean;
  responsible: {
    memberId: number | null;
    name: string;
    isBoard: boolean;
    isCandidateBoard: boolean;
    isKeyholder: boolean;
    photoUrl: string | null;
  }[];
  beerTime: string | null;
  lastCall: string | null;
  closedMessage: string | null;
  coffeeStatus: number;
}

/** One element of GET /api/handler/screen/info/pc-usage */
export interface CorePc {
  pcId: string;
  users: { memberId: number | null; name: string; symbol: string }[];
  remote: boolean;
  lockedAt: string | null;
  status: PcState;
}

/** One element of GET /api/spotify/currently-playing */
export interface CoreTrack {
  title: string;
  artists: string[];
  startTime: string;
  cover?: string;
  trackURI: string;
}
