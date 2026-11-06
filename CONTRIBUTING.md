# Contributing

Start with the [README](README.md) and [architecture](docs/ARCHITECTURE.md). Keep changes focused and distinguish implemented behavior from proposals.

## Local checks

Use Node 24 and the committed npm lockfile:

```bash
npm ci
npm test
npm run typecheck
npm run build
```

Follow the README to initialize local D1 before browser testing. Add meaningful tests for changes to authorization, match transitions, GPS uncertainty, retention, tagging and zone logic. Append migrations; never edit a migration already applied to a deployed database.

## Project rules

- Clients send intent. The server decides roles, clocks, cooldowns and outcomes.
- Never expose precise opponent coordinates through responses, subscriptions or logs.
- No fabricated GPS, fake players or simulated persistence in production.
- Keep test/simulation data isolated and explicitly labeled.
- GPS is uncertain and spoofable. A location anomaly is not proof of cheating.
- Do not introduce physical-contact tagging or incentives for unsafe movement.
- Document unsupported devices, incomplete verification and operational limitations honestly.

Use small pull requests with a clear problem statement and test results. Do not commit secrets, runtime databases, generated builds or location histories. The repository has not selected a project-wide redistribution license; do not assume that public visibility grants unrestricted reuse. Third-party licenses remain applicable.
