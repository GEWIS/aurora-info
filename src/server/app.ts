import path from 'node:path';
import express, { static as serveStatic } from 'express';
import type { PublicStatus } from '../shared/status';
import { toPlayingSong, toPublicPcs, toPublicRoom } from './anonymize';
import type { CoreClient } from './core-client';
import type { CorePc, CoreRoomStatus, CoreTrack } from './core-types';

const CACHE_TTL_MS = 10_000;

interface CoreSnapshot {
  at: number;
  room: CoreRoomStatus;
  pcs: CorePc[];
  tracks: CoreTrack[] | null;
}

export interface AppOptions {
  core: CoreClient;
  /** Express "trust proxy" setting; decides which address req.ip reports. */
  trustProxy: boolean | number | string;
  /** Built SPA to serve; omitted in dev, where vite serves the client. */
  staticDir?: string;
  now?: () => number;
}

export function createApp(options: AppOptions) {
  const { core, now = Date.now } = options;
  const app = express();
  app.set('trust proxy', options.trustProxy);

  // Raw core data, cached for all visitors; anonymized per request (the song depends on req.ip).
  let cache: CoreSnapshot | null = null;
  let inFlight: Promise<CoreSnapshot> | null = null;

  const refresh = (): Promise<CoreSnapshot> => {
    inFlight ??= (async () => {
      try {
        // currentlyPlaying never rejects, so only room/pcs can fail the refresh.
        const [room, pcs, tracks] = await Promise.all([core.roomStatus(), core.pcUsage(), core.currentlyPlaying()]);
        cache = { at: now(), room, pcs, tracks };
        return cache;
      } finally {
        inFlight = null;
      }
    })();
    return inFlight;
  };

  app.get('/api/status', async (req, res) => {
    let snapshot: CoreSnapshot;
    try {
      snapshot = cache && now() - cache.at < CACHE_TTL_MS ? cache : await refresh();
    } catch (err) {
      console.warn('aurora core unavailable:', (err as Error).message);
      res.status(502).json({ error: 'Aurora core unavailable' });
      return;
    }
    const body: PublicStatus = {
      room: toPublicRoom(snapshot.room),
      pcs: toPublicPcs(snapshot.pcs),
      playingSong: toPlayingSong(snapshot.tracks, req.ip),
    };
    res.set('Cache-Control', 'no-store').json(body);
  });

  app.use('/api', (_req, res) => {
    res.status(404).json({ error: 'Not found' });
  });

  if (options.staticDir) {
    const indexHtml = path.join(options.staticDir, 'index.html');
    app.use(serveStatic(options.staticDir));
    app.get('/{*path}', (_req, res) => {
      res.sendFile(indexHtml);
    });
  }

  return app;
}
