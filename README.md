# AIONEXT Monitor Controller

**Every display. One control room.**

Discover connected displays, adjust the controls your hardware actually exposes, and save a setup you can reuse. AIONEXT Monitor Controller brings monitor discovery, supported controls, useful presets, and calibration profiles into one focused desktop app.

![AIONEXT Monitor Controller concept preview](assets/aionext-product-preview.svg)

*Concept visualization; not a screenshot of the current application. Display names, values, and compatibility indicators are illustrative.*

[![Build](https://github.com/AIONEXT/monitor-controller/actions/workflows/build-and-release.yml/badge.svg)](https://github.com/AIONEXT/monitor-controller/actions/workflows/build-and-release.yml)
[![Latest release](https://img.shields.io/github/v/release/AIONEXT/monitor-controller?display_name=tag)](https://github.com/AIONEXT/monitor-controller/releases)
[![License](https://img.shields.io/github/license/AIONEXT/monitor-controller)](LICENSE)

[**Get the latest release →**](https://github.com/AIONEXT/monitor-controller/releases) · [View source](https://github.com/AIONEXT/monitor-controller)

> AIONEXT Monitor Controller is an independent utility, not affiliated with or endorsed by monitor manufacturers. Brand identification helps organize displays; it does not guarantee feature support.

## Your display setup, made simpler

**Discover.** See connected displays and the manufacturer/model details your system provides.

**Adjust.** Work with controls the monitor and platform positively report as supported—such as brightness, contrast, color, input, or audio where available.

**Save.** Reuse practical presets and local calibration profiles; export JSON backups when you need them.

**Understand.** Capability summaries reflect probe results instead of assumptions based on a brand name.

## Platform support

| Platform | Discovery | Controls in the current backend |
|---|---|---|
| Windows 10/11 | WMI discovery where metadata is exposed | Built-in brightness where Windows WMI brightness methods are available; general external-monitor DDC/CI is not claimed |
| Linux | `ddcutil` display discovery and VCP probing | Positively probed VCP controls through `ddcutil`, subject to DDC/CI and I²C permissions |
| macOS 11+ | Display metadata through `system_profiler` when available | No writable DDC/CI controls in the current backend |

Controls vary by monitor model, firmware, connection path, and operating system. Enable DDC/CI in your monitor’s on-screen menu and try a direct HDMI/DisplayPort/USB-C connection if controls are unavailable. Docks, KVMs, adapters, and graphics drivers can block access.

## Download

Choose an artifact for your operating system and architecture from [GitHub Releases](https://github.com/AIONEXT/monitor-controller/releases). Asset formats and names may vary by release; follow that release’s notes for exact download and installation details. No published release yet? Build from source below.

## Build and run

Prerequisites: Node.js 20+ and npm 10+. Native packaging dependencies vary by operating system; Linux may require GTK, NSS, libsecret, and build tools.

```bash
git clone https://github.com/AIONEXT/monitor-controller.git
cd monitor-controller
npm ci
npm run icons
npm run typecheck
npm run lint
npm start
```

Create local distributables with `npm run package` (unpacked application) or `npm run make` (configured Electron Forge makers for the current platform). Build on the target OS/architecture for reliable native packaging. A successful build does not imply code signing or notarization.

## Local data and privacy

Monitor profiles, schedules, enterprise configuration, and bounded audit history are stored under Electron’s `userData/enterprise` directory. Calibration profiles are stored in renderer local storage. Exported profiles can contain setting values; review them before sharing. Basic display communication uses local platform backends and does not require a vendor cloud account.

## Contribute

Report bugs or request features in [GitHub Issues](https://github.com/AIONEXT/monitor-controller/issues). Include OS/version, monitor model, connection path, and detected controls; redact serial numbers and personal information. See [CONTRIBUTING.md](CONTRIBUTING.md) and the [release checklist](docs/RELEASE-CHECKLIST.md).

MIT licensed. See [LICENSE](LICENSE).
