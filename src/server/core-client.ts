import type { CorePc, CoreRoomStatus, CoreTrack } from './core-types';

const TIMEOUT_MS = 5000;

export interface CoreClient {
  roomStatus(): Promise<CoreRoomStatus>;
  pcUsage(): Promise<CorePc[]>;
  /** Never rejects: Spotify being off (500) or nothing playing (204/empty) is normal and means null. */
  currentlyPlaying(): Promise<CoreTrack[] | null>;
}

/** Reads the three aurora-core endpoints with an integration key. */
export function createCoreClient(coreUrl: string, apiKey: string, fetchImpl: typeof fetch = fetch): CoreClient {
  const base = coreUrl.replace(/\/$/, '');

  const get = (path: string) =>
    fetchImpl(`${base}${path}`, {
      headers: { 'x-api-key': apiKey },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });

  const getJson = async <T>(path: string): Promise<T> => {
    const res = await get(path);
    if (!res.ok) throw new Error(`core ${path} responded ${res.status}`);
    return (await res.json()) as T;
  };

  return {
    roomStatus: () => getJson<CoreRoomStatus>('/api/handler/screen/info/room-status'),
    pcUsage: () => getJson<CorePc[]>('/api/handler/screen/info/pc-usage'),
    currentlyPlaying: async () => {
      try {
        const res = await get('/api/spotify/currently-playing');
        if (!res.ok || res.status === 204) return null;
        const text = await res.text();
        if (!text) return null;
        return JSON.parse(text) as CoreTrack[] | null;
      } catch {
        return null;
      }
    },
  };
}
