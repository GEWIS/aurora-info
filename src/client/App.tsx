import './index.css';
import { useEffect, useState, type ReactNode } from 'react';
import type { PublicStatus } from '../shared/status';
import StatusBanner from './components/StatusBanner';
import InfoTiles from './components/InfoTiles';
import PcList from './components/PcList';

const POLL_MS = 30_000;

interface Snapshot {
  status: PublicStatus;
  at: Date;
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

function Notice({ children }: { children: ReactNode }) {
  return <section className="rounded-2xl bg-card p-6 text-center text-muted shadow-sm">{children}</section>;
}

/**
 * The public info page (info.gewis.nl): one screen with the room status and
 * beer countdown up top, coffee and music tiles, then the computers. Polls the
 * aurora-info server's anonymized /api/status every 30 s; a failed poll keeps
 * the last data on screen and says how old it is.
 */
export default function App() {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const poll = async () => {
      try {
        const res = await fetch('/api/status');
        if (!res.ok) throw new Error(`status responded ${res.status}`);
        const status = (await res.json()) as PublicStatus;
        if (!cancelled) {
          setSnapshot({ status, at: new Date() });
          setFailed(false);
        }
      } catch {
        // Core down, network blip, ...: keep showing the last known state.
        if (!cancelled) setFailed(true);
      }
    };

    void poll();
    const interval = setInterval(() => {
      void poll();
    }, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  let body;
  if (snapshot) {
    body = (
      <>
        <StatusBanner status={snapshot.status.room} />
        <InfoTiles room={snapshot.status.room} playingSong={snapshot.status.playingSong} />
        <PcList pcs={snapshot.status.pcs} />
      </>
    );
  } else if (failed) {
    body = <Notice>The status of GEWIS is unavailable right now.</Notice>;
  } else {
    body = <Notice>Loading…</Notice>;
  }

  return (
    <div className="min-h-screen bg-page font-sans text-ink antialiased">
      <main className="mx-auto flex max-w-md flex-col gap-3 px-4 pt-6 pb-10">
        <header className="flex items-baseline justify-between px-1">
          <h1 className="text-lg font-bold">GEWIS Status</h1>
          {snapshot && (
            <span className={`text-xs ${failed ? 'text-busy' : 'text-muted'}`}>
              {failed ? `Offline · data from ${formatTime(snapshot.at)}` : `Updated ${formatTime(snapshot.at)}`}
            </span>
          )}
        </header>
        {body}
      </main>
    </div>
  );
}
