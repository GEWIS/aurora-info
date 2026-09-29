export type PcState = 'free' | 'in-use' | 'locked' | 'remote' | 'offline' | 'maintenance';

export interface PublicRoomStatus {
  open: boolean;
  beerTime: string | null;
  lastCall: string | null;
  coffeeStatus: number;
}

export interface PublicPc {
  pcId: string;
  status: PcState;
  remote: boolean;
  lockedAt: string | null;
  users: { symbol: string }[];
}

/** Body of GET /api/status. playingSong is display text without the ♫ prefix: "Artist - Title", "Playing music", or null. */
export interface PublicStatus {
  room: PublicRoomStatus;
  pcs: PublicPc[];
  playingSong: string | null;
}
