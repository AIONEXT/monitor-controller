# Validation report: app boot and dependency review

## Static review findings

- Fixed Windows brightness targeting to retain and use the exact WMI `InstanceName`; the prior sanitized-ID reconstruction could address a different display or fail.
- Linux discovery now returns an empty monitor list with a diagnostic when `ddcutil` is missing or inaccessible, rather than rejecting the initial renderer load.
- Packaging configuration no longer imports an unused Electron `app` symbol.
- Package scripts regenerate platform icons before package/make/publish so a clean checkout does not rely on stale generated icons.
- The renderer now fails with a direct error if the required `#root` mount node is absent.

## Dependency status

`package-lock.json` is checked in and uses lockfile version 3, but its root package version is `1.0.0` while `package.json` declares `2.0.0`. This should be synchronized by running `npm install --package-lock-only` or `npm install` with the project’s supported npm version, then verifying `npm ci` on a clean checkout. Do not hand-edit package tarball/integrity entries.

## Validation that remains to run

This review used repository source inspection only; it did not execute npm, compile the code, or connect to monitor hardware. Before release, run:

```bash
npm ci
npm run icons
npm run typecheck
npm run lint
npm run package
npm run make
```

Also test display discovery/control on each supported OS. Linux requires ddcutil and usable I²C permissions; Windows behavior depends on WMI brightness support; macOS currently has discovery only.
