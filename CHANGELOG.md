# Changelog

## [0.1.0-alpha.1] — 2026-11-06

First public source release of the Shadow Protocol field build.

### Added

- Real private rooms, secure guest sessions, invitations and persistent readiness/presence.
- Browser GPS consent, accuracy display, freshness checks and movement-anomaly signals.
- MapLibre vector map and Leaflet raster compatibility fallback with manual arena/exclusion drawing.
- Server-authoritative roles, match phases, timers, radar, tag confirmation, abilities and results.
- Host-approved concentric zone shrinking and safety pause/emergency location stop.
- 31 automated tests, database migrations, offline simulation and technical documentation.
- GitHub verification workflow, versioned source ZIP releases and SHA-256 checksums.

### Known limits

This alpha has no outdoor multi-phone validation or independent security audit. It uses Workers/D1 with polling, not Supabase/PostGIS/Realtime. Automated safe-route validation and unattended cleanup in the existing hosted deployment remain incomplete. Advanced abilities beyond Ghost and Hunter Scan are not implemented.

[0.1.0-alpha.1]: https://github.com/piyush-1803/shadow-protocol/releases/tag/v0.1.0-alpha.1
