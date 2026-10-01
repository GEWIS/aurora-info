# Aurora Info

The public status page at [info.gewis.nl](https://info.gewis.nl): is GEWIS open, is it beer
time, does the coffee machine work, what's playing and which PCs are free.

It is a single package with two halves:

- **Server** (`src/server/`, Express). Holds an Aurora Core integration API key, reads core,
  strips everything that identifies people, caches the result for 10 seconds and serves it
  as `GET /api/status`. In production it also serves the built dashboard.
- **Client** (`src/client/`, React + Vite + Tailwind). A single-page dashboard that polls
  `/api/status` every 30 seconds. When the server can't reach core, it keeps showing the
  last data and marks the header "Offline · data from …".

`src/shared/status.ts` holds the `/api/status` types that both halves use.

## How it talks to Aurora Core

The server calls these core endpoints with an `x-api-key` header:

| Core endpoint | Integration scope |
|---|---|
| `GET /api/handler/screen/info/room-status` | `getInfoRoomStatus` |
| `GET /api/handler/screen/info/pc-usage` | `getInfoPcUsage` |
| `GET /api/spotify/currently-playing` | `getSpotifyCurrentlyPlaying` |

Core returns full data to this key: names, member ids, responsibles and the closed
message. Treat the key as a secret. `src/server/anonymize.ts` is the only place where that
data is reduced to the public shape:

- **Room:** only `open`, `beerTime`, `lastCall` and `coffeeStatus` are kept.
- **PCs:**
  - always exactly PCs `1`–`10` and `vdesktop`;
  - PCs that aren't reported show as offline;
  - users are reduced to their role symbol;
  - offline and maintenance PCs have no users and no lock time.
- **Music:**
  - `"Artist - Title"` for visitors from the TU/e network (`131.155.*`);
  - `"Playing music"` for everyone else;
  - `null` when nothing is playing.
  - Spotify being off or unavailable also counts as nothing playing.

If room status or PC usage can't be fetched, `/api/status` returns `502` instead of stale
data.

### Creating the key

In the Aurora backoffice, or through `POST /api/user/integration` as an admin, create an
integration user with the three scopes above. Then read its key with
`GET /api/user/integration/{id}/key`.

## Configuration

Set these as environment variables, or in a `.env` file in the working directory (see
`.env.example`):

| Variable | Required | Description |
|---|---|---|
| `CORE_URL` | yes | Base URL of Aurora Core, e.g. `http://localhost:3000` |
| `API_KEY` | yes | Integration key with the three scopes above |
| `TRUST_PROXY` | no | Express `trust proxy` value (hop count, `loopback`, IPs/CIDRs). Set this behind a reverse proxy, otherwise every visitor looks like the proxy and the TU/e check fails. Leave it empty when the server is exposed directly. |
| `PORT` | no | Listen port, default `8082` |

## Development

Requires Node 22+ and pnpm. The umbrella `nix develop` shell provides both.

```bash
pnpm install
cp .env.example .env   # fill in CORE_URL and API_KEY
pnpm dev               # Express API on :3001, Vite on http://localhost:8082 (proxies /api)
```

Checks:

```bash
pnpm typecheck
pnpm lint
pnpm test              # vitest: anonymization, caching, 502 handling, proxy trust
pnpm build             # dist/client (SPA) + dist/node (server)
```

## Production

```bash
pnpm build
pnpm start             # node dist/node/server/index.js
```

Or with Docker:

```bash
docker build -t aurora-info .
docker run -p 8082:8082 -e CORE_URL=https://aurora.example -e API_KEY=... aurora-info
```

The server doesn't handle `SIGTERM` itself, so add `--init` to `docker run` if you want
fast stops.

## Releases

Merging to `main` runs `.github/workflows/semantic-release.yaml`, which uses the shared
[GEWIS/actions](https://github.com/GEWIS/actions) workflows:

- **Version:** semantic-release picks the version from Conventional Commit messages
  (`fix:` → patch, `feat:` → minor, `BREAKING CHANGE` → major). It tags the release and
  creates a GitHub release; `release.config.mjs` configures it.
- **Images:** the Docker image is built and pushed as `<version>` and `latest` to:
  - `abc.docker-registry.gewis.nl/nc/aurora/info`
  - `ghcr.io/gewis/aurora/info`
