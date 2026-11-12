# AIONEXT brand and release checklist

## Product identity
- Product display name: **AIONEXT Monitor Controller**.
- Publisher/maintainer identity: **AIONEXT**.
- Keep all monitor-manufacturer names descriptive; do not imply endorsement or official affiliation.
- Use the repository icon source (`assets/icon.svg`) as the source of truth for platform icons.

## Before a release
1. Run `npm ci`, `npm run icons`, `npm run typecheck`, and `npm run lint` on the intended release revision.
2. Test `npm run make` on each target OS/architecture; do not assume artifacts are identical across runners.
3. Test on hardware: one confirmed DDC/CI display, one unsupported/no-DDC display, multiple monitors, and disconnect/reconnect.
4. Verify the app labels unsupported controls accurately and never treats demo/sample hardware data as a real device.
5. Attach checksums and concise platform-specific installation notes to the GitHub release.
6. Configure signing/notarization only with protected CI secrets. Never commit certificates, passwords, or personal monitor identifiers.
7. Verify release asset names against the actual artifacts; do not promise a DMG or package unless the workflow produced one.

## Known platform scope
- Linux backend: ddcutil discovery and per-feature probe/control.
- Windows backend: WMI discovery and built-in brightness when the system exposes WMI brightness methods; not general external-monitor DDC/CI.
- macOS backend: system_profiler discovery; no writable DDC/CI controls in this backend yet.

Do not advertise support beyond what has been tested on the corresponding platform and hardware.
