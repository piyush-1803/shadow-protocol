# Verification

Run `npm test` and `npm run typecheck` with Node 24+. Tests use Node's test runner and `node --import tsx`; no browser automation is bundled.

- 27 rule tests: Turf distances/boundaries/exclusions, confidence, stale/future/repeated samples, GPS jumps, smoothing, readiness, host permissions, role assignment, head start, private radar/expiry, Ghost mode, nested zone interpolation, stale-GPS grace, tag plausibility/confirmation/spam/disputes, pauses, clock expiry, abilities, serializer privacy and departures.
- 4 request/response integration tests backed by real, isolated in-memory SQLite using the actual migrations: full guest/room/start/tag/result flow, replay suppression and exact-location isolation; emergency revocation and CSRF; concurrent joins/capacity and concurrent readiness preservation; relational expiry deletion.

The SQLite adapter is test-only; it is not a mocked production persistence layer. D1 production wiring is separate and must be checked after deployment. Local browser QA successfully created a persistent room using the real D1 binding, confirmed room recovery after refresh and readiness/start remain disabled without GPS, and verified the real raster-map fallback in a browser without WebGL2. Synthetic locations exist only in tests, clearly labeled DEV TEST, and are not seeded into hosted gameplay.

The shell in the managed environment cannot connect to the browser's loopback preview port. An attempted direct HTTP integration run failed with ECONNREFUSED. API coverage therefore runs against the actual handler + real SQLite, while browser QA exercises local D1. No outdoor multiplayer or cellular-network test has been performed; no load-test claim is made.

## Development-only GPS simulation

`npm run simulate` runs a deterministic offline engine scenario and prints a clearly labeled trace. It imports the same game engine, uses no network, never creates a real room and is absent from application routes. The production browser always uses native geolocation. Do not add a hidden production GPS override.

## Field acceptance checklist

1. Give only the trusted participants site access; keep the room code private.
2. In an independently checked open area, create/join from at least two distinct devices or browser profiles. Same-profile tabs intentionally share one identity.
3. Confirm no GPS transmission before consent, and both players see each other's readiness but not exact coordinates.
4. Start; confirm random roles and head-start restrictions. Compare countdowns.
5. Confirm radar uses circles, then disappears; test Ghost and cooldowns.
6. Confirm a near tag succeeds only with Shadow consent; a disputed/distant/stale tag cannot eliminate.
7. Approve a shrink only after reviewing access. Verify nested animation and safety pause/resume.
8. Lock screen, disconnect, revoke GPS and return. Verify stale status and explicit GPS resumption.
9. Stop sharing; inspect server storage and stale eligibility. End; verify result recovery after refresh and no subsequent uploads.
10. Repeat under large text, reduced motion, bright sunlight and battery saver. Measure bandwidth/battery before production rollout.
