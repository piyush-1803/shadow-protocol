# Security policy

Shadow Protocol is an alpha field build. It has not undergone an independent security audit and must not be presented as production-hardened.

## Reporting

Do not disclose exploitable vulnerabilities, exact player coordinates, invite codes, session cookies or credentials in public issues. Use GitHub's private vulnerability reporting facility if the repository offers **Security → Report a vulnerability**. If that facility is unavailable, ask the maintainer through an existing private contact channel to arrange a secure report before sharing details. No private reporting feature or response-time commitment is implied by this document.

Include affected versions, a minimal reproduction using isolated test data, expected/actual authorization behavior, and a potential fix if available. Avoid testing on real participants or third-party services without permission.

## Current boundaries

The API uses HttpOnly guest cookies, same-origin POST checks, bound SQL parameters, membership/host authorization and separate precise-location storage. Exact opponent coordinates must never enter client snapshots. These controls reduce risk; they do not make browser GPS spoof-proof or replace an audit.

Read [privacy and safety](docs/PRIVACY_SAFETY.md) and [GPS limitations](docs/GPS.md). Physical deletion in the hosted build is request-driven; provider backups have independent retention.
