# Architecture and decisions

## Implemented architecture

React 19 + TypeScript, Vite/Vinext, Tailwind CSS, Motion, Zustand → same-origin JSON API in a Cloudflare Worker → D1 (SQLite).

MapLibre GL JS renders OpenFreeMap vector tiles; when WebGL2 initialization fails, Leaflet renders genuine OpenStreetMap raster tiles. Turf performs geodesic distance, polygons, self-intersection checks, containment and circles on both sides. There is no invented GPS data in the application.

This is a deliberate departure from the proposed Supabase/PostGIS/Realtime stack: the available hosting provisions Workers and D1 directly, making persistent rooms possible without user-supplied service credentials. D1 is **not** PostgreSQL, has no PostGIS or RLS, and is never exposed to browsers. All access is mediated by the server. Vinext integrates React with Vite and the Worker runtime; deployment on Vercel is not supported by this D1 implementation without an adapter.

## Trust boundary

Clients send intent, not state. `/api/game` accepts create/join, readiness, start, pause/resume, zone approval, tag request/response, ability, leave, share and stop operations. Roles, timestamps, cooldowns, results and zones are server-authoritative. The server checks membership and host privileges each time. SQL uses bound parameters. Room codes use 40 bits of random entropy. Guest session tokens contain two random UUIDs, are SHA-256 hashed at rest and stored client-side only in HttpOnly, SameSite=Strict cookies (Secure on HTTPS). POST requests require same-origin Origin and JSON content type.

Site-level access is a separate outer boundary. The original hosted Site starts owner-private; this public source export does not contain its Site project ID. Room codes cannot grant access through that boundary. Arrange trusted site viewers before a multi-person field test, or deploy the source to your own HTTPS origin with appropriate group access. Do not turn on public player discovery.

## Persistence model

- `sessions`: identity, token hash, expiry, per-session rate counter.
- `rooms`: room identifier, invite code, host FK, versioned authoritative game aggregate, expiry.
- `room_members`: relational membership/presence/sharing permission, composite primary key.
- `player_locations`: only the latest precise sample per room/member, expiry index, separate from game state.
- `rate_limits`: hashed-IP guest creation budget (no raw IP).

The game aggregate contains players, settings, arena polygons, zone interpolation state, pending tags, ability state, recent event summaries, results and a bounded deduplication window. These are not individually normalized tables in this build. Atomic room revision compare-and-swap prevents conflicting ready/start/join/tag updates from silently overwriting each other; retries reload state and re-evaluate permissions. Room join membership is recoverable on the next authorized request if the second write fails. Location inserts atomically recheck sharing and active-player status. Stop sets sharing off and deletes that player's fix in a D1 transaction, preventing delayed uploads from recreating it.

## Synchronization and timers

Clients poll at 2.5 seconds while visible; offline polling slows, hidden polling pauses. Moving samples transmit at most every 3 seconds, slowing to 6 seconds when a reported speed is under 0.5 m/s and 8 seconds when reported accuracy exceeds 50 m (server rejects intervals under 2.5 seconds). Requests have a 15-second timeout. State recovery uses the room ID persisted locally and the guest cookie; no coordinates are stored in browser persistence. Zustand rejects older revisions arriving out of order.

Server time is returned with every snapshot. UI countdowns estimate offset using request midpoint. Match transitions are evaluated on the next request, not a continuously running process. Expiry is determined from stored absolute server deadlines, so a disconnected client cannot extend a match. There are no guaranteed exact-time push notifications. This trades subsecond synchronization for simple bounded private-room operation (2–20 players). Real load, battery and poor-network measurements remain necessary.

## Location privacy

`publicSnapshot` is the sole serializer. It returns one caller-owned fix and no dictionary of other players' precise locations. Presence reveals fresh/stale/unavailable, never another player's accuracy value. Radar samples are server-generated offset circles with radius covering offset plus reported uncertainty (minimum base uncertainty 30 m), randomized again on each pulse, lasting 12 seconds. Signal IDs do not identify targets. Both roles receive the same pulse; this is intentional. Repeated noisy observations can still reveal approximate movement patterns; randomization is not differential privacy.

## Safety and zones

The complete initial circle must be inside the optional permitted polygon and must not intersect any manually excluded polygon. Rejecting intersecting arenas is intentionally more conservative than clipping holes or inventing routes around hazards. The host must independently inspect the entire circle in the real world. Future zones are concentric, shrink by 28% to a minimum of 40 m, and interpolate over 60 seconds. Each step requires host approval; the next outline is visible to the host in cyan. With no approval the zone stays where it is. No OSM routing service, hazard classification, or automated safe-route guarantee exists. Any active player can pause; only the host can resume. Outside-zone exposure is informational and never automatically eliminates someone.

## Remaining engineering risks

1. Browser GPS is spoofable. Jump detection is a signal, not proof. A rooted device or developer tools can forge samples.
2. Public deployments need stronger abuse controls, session/device policies, abuse reporting and age-appropriate operational processes. Rate limits here are basic.
3. D1 concurrency is checked with SQLite integration tests and local D1 browser creation, not a fleet-level load test.
4. No independent security audit, outdoor Android/iOS matrix, or accessibility audit has occurred.
5. Cleanup is opportunistic in the hosted build. An expired fix is excluded from all reads, but physical deletion needs a subsequent request. Provider backups are outside the app's deletion guarantee.
6. The aggregate approach is appropriate for small rooms; larger scale calls for durable room actors/WebSockets and more normalized event storage.

Sources used for design: [MDN geolocation](https://developer.mozilla.org/en-US/docs/Web/API/Geolocation/watchPosition), [Turf geometry](https://turfjs.org/docs/api/booleanWithin), [OpenFreeMap](https://openfreemap.org/quick_start/), [OSM tile policy](https://operations.osmfoundation.org/policies/tiles/).
