# AIONEXT Monitor Controller

**One clear place to manage the displays on your desk.** AIONEXT Monitor Controller discovers connected displays, exposes controls that each display actually reports, and helps you reuse your preferred setup across sessions.

[![Build](https://github.com/AIONEXT/monitor-controller/actions/workflows/build-and-release.yml/badge.svg)](https://github.com/AIONEXT/monitor-controller/actions/workflows/build-and-release.yml)
[![Latest release](https://img.shields.io/github/v/release/AIONEXT/monitor-controller?display_name=tag)](https://github.com/AIONEXT/monitor-controller/releases)
[![License](https://img.shields.io/github/license/AIONEXT/monitor-controller)](LICENSE)

> AIONEXT Monitor Controller is an independent utility, not an official product of the monitor manufacturers listed below. Controls depend on the display, connection, operating system, and DDC/CI implementation; a brand match does not guarantee feature support.

## At a glance

- **Discover displays** and identify manufacturer/model information when available.
- **Adjust detected controls** such as brightness, contrast, color, input, and audio where hardware and OS support them.
- **Use quick presets** for common viewing tasks; only controls positively reported as writable are applied.
- **Save calibration profiles** for reuse, with JSON import/export for backup or sharing.
- **See capability coverage** based on real probe results rather than guessed brand support.
- **Use one desktop app** across Windows, macOS, and Linux, with platform-specific control availability.

### Brand-aware, not brand-locked

Brand identification recognizes common display makers and product families (including Acer, AOC, Apple, ASUS, BenQ, Dell, EIZO, Gigabyte, HP, Huawei, Lenovo, LG, MSI, Philips, Samsung, Sharp, and ViewSonic). It is used for labeling and profile organization only. DDC/CI VCP probing determines which hardware controls are exposed.

## Download

Visit [GitHub Releases](https://github.com/AIONEXT/monitor-controller/releases) and choose an artifact for your operating system. Release asset names can vary by version and architecture; check the release notes for the exact file and install instructions. If no release is published yet, build from source below.

## Platform support and limitations

| Platform | Discovery | Hardware controls |
|---|---|---|
| Windows 10/11 | Active WMI monitor discovery where the OS exposes display metadata | Built-in brightness control where WMI brightness methods are available; external DDC/CI VCP support is not currently claimed by this backend |
| Linux | `ddcutil` display discovery and VCP probing | Supported VCP controls through `ddcutil`; requires working DDC/CI access and appropriate I²C permissions |
| macOS 11+ | Display metadata discovery through `system_profiler` when available | This backend currently reports no writable DDC/CI controls |

**Before troubleshooting:** enable DDC/CI in the monitor OSD, try a direct HDMI/DisplayPort/USB-C connection, and check whether a dock, KVM, adapter, or GPU driver blocks DDC/CI. Results vary by monitor firmware and cable path. Do not rely on software to change controls that are not shown as supported.

### Linux setup

Install `ddcutil` using your distribution’s package manager and follow its current documentation for I²C permissions. On many systems that means loading `i2c-dev` and granting the logged-in user access to the relevant I²C device. Re-login after changing group membership. Avoid running the desktop app as root unless your distribution’s security guidance specifically requires it.

## Build and run from source

**Prerequisites:** Node.js 20+ and npm 10+. Native packaging dependencies vary by OS; Linux may require GTK, NSS, libsecret, and build tools.

```bash
git clone https://github.com/AIONEXT/monitor-controller.git
cd monitor-controller
npm ci
npm run icons
npm run typecheck
npm run lint
npm start
```

Build local distributables with:

```bash
npm run package  # unpacked application
npm run make     # platform makers configured in Electron Forge
```

Use a matching operating system/architecture for reliable native packaging. Code signing and notarization require platform credentials and are not implied by a successful local build.

## Profiles, privacy, and data

Monitor profiles and schedules, enterprise configuration, and bounded audit history are stored locally under Electron’s `userData/enterprise` directory. Calibration profiles are stored in the renderer’s local storage; use the calibration panel’s JSON export to back them up or move them between installations. Profile transfer can include monitor setting values, so review exported files before sharing.

The app communicates with connected display hardware only through its local platform backend. Linux `ddcutil` and Windows system management commands are invoked with argument arrays or fixed scripts; the app does not need a vendor cloud account for basic controls.

## Contributing and support

- Report a bug or request a feature in [GitHub Issues](https://github.com/AIONEXT/monitor-controller/issues). Include OS/version, monitor model, connection path, and which controls the app detected; remove serial numbers and other personal data from logs/screenshots.
- See [CONTRIBUTING.md](CONTRIBUTING.md) for development and pull request guidance.

## License

MIT. See [LICENSE](LICENSE).
