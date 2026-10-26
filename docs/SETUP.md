# Setup & Deployment Guide

Complete setup framework for development, testing, and commercial deployment of Monitor Controller.

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Development Setup](#development-setup)
3. [Running in Development](#running-in-development)
4. [Building Installers](#building-installers)
5. [Code Signing (Commercial)](#code-signing-commercial)
6. [Release Process](#release-process)
7. [Enterprise Deployment](#enterprise-deployment)
8. [Troubleshooting](#troubleshooting)

---

## Prerequisites

| Requirement | Version | Notes |
|-------------|---------|-------|
| Node.js | 20+ | 22 recommended (CI uses 22) |
| npm | 10+ | Ships with Node.js |
| Git | Any recent | For cloning and releases |

**Platform-specific:**
- **Windows:** Visual Studio 2022 with "Desktop development with C++" workload (native module rebuilds)
- **Linux:** `sudo apt install libsecret-1-dev ddcutil` and add your user to the `i2c` group:
  ```bash
  sudo usermod -a -G i2c $USER
  sudo modprobe i2c-dev
  ```
- **macOS:** Xcode Command Line Tools (`xcode-select --install`). Note: external monitor DDC/CI is limited on macOS.

---

## Development Setup

```bash
# 1. Clone the repository
git clone https://github.com/AIONEXT/monitor-controller.git
cd monitor-controller

# 2. Install dependencies (exact versions from package-lock.json)
npm ci

# 3. Generate platform icons from assets/icon.svg
npm run icons

# 4. Verify your setup
npm run typecheck
```

If `npm ci` fails with a lockfile error, regenerate:
```bash
rm -rf node_modules package-lock.json
npm install
```

---

## Running in Development

```bash
npm run start
```

This launches Electron with webpack hot-reload. If no DDC/CI monitors are found, the app automatically falls back to **demo mode** with two virtual monitors (LG UltraGear 27" and Dell UltraSharp 32") so you can develop and test the full UI without hardware.

---

## Building Installers

```bash
# Package unpacked app (fast local test)
npm run package

# Build platform installers
npm run make
```

Output artifacts:

| Platform | Artifact | Location |
|----------|----------|----------|
| Windows | `MonitorControllerSetup.exe` | `out/make/squirrel.windows/x64/` |
| macOS | `.zip` / `.dmg` | `out/make/zip/darwin/` |
| Linux | `.zip` | `out/make/zip/linux/x64/` |

---

## Code Signing (Commercial)

Unsigned installers trigger SmartScreen/Gatekeeper warnings. For commercial distribution:

1. Obtain an **EV Code Signing Certificate** (PFX format) from a CA (DigiCert, Sectigo, GlobalSign)
2. Place it at `certs/certificate.pfx` (gitignored)
3. Set environment variables:
   ```bash
   export CERT_FILE=./certs/certificate.pfx
   export CERT_PASSWORD=your_password
   export CERT_HASH_ALGO=sha256   # optional, defaults to sha256
   ```
4. Run `npm run make`

For CI, add these GitHub repository secrets:
- `CERT_BASE64` - Base64-encoded PFX (`base64 -w0 certificate.pfx`)
- `CERT_PASSWORD` - Certificate password
- `GH_TOKEN` - GitHub token with release permissions (auto-provided as `GITHUB_TOKEN` in workflows)

---

## Release Process

Releases are fully automated via GitHub Actions (`.github/workflows/build-and-release.yml`):

1. Update `version` in `package.json`
2. Commit and tag:
   ```bash
   git commit -am "chore: bump version to x.y.z"
   git tag vx.y.z
   git push origin main --tags
   ```
3. The workflow builds Windows, macOS, and Linux artifacts in parallel
4. Artifacts are published to the GitHub Release automatically

Manual dispatch is also available from the Actions tab (`workflow_dispatch` with a version input).

---

## Enterprise Deployment

### Silent Installation (Windows)
```powershell
# Squirrel installers support silent flags
.\MonitorControllerSetup.exe -s
```

### Fleet Configuration
Monitor Controller stores all enterprise data under the OS user-data directory:
- Windows: `%APPDATA%\monitor-controller\enterprise\`
- macOS: `~/Library/Application Support/monitor-controller/enterprise/`
- Linux: `~/.config/monitor-controller/enterprise/`

You can pre-provision profiles by copying `profiles.json` files to these locations via MDM/GPO/Ansible.

### Audit & Compliance
Audit logging is enabled by default. Every setting change is written to `audit-log.json` with:
- ISO timestamp
- Monitor ID and setting ID
- Old and new values
- Action type (`set`, `reset`, `profile_apply`, `schedule_apply`)

The log is bounded to the last 1,000 entries per file to prevent unbounded growth.

---

## Troubleshooting

**No monitors detected**
- Enable DDC/CI in your monitor's OSD menu (usually Settings → DDC/CI or System → DDC/CI)
- Use a direct DisplayPort/HDMI/USB-C connection - docks and KVMs frequently block DDC/CI
- Windows: try running as administrator
- Linux: verify `ddcutil detect` works in a terminal

**Settings show but don't change the display**
- Some brands expose VCP codes that are read-only; the capability probe filters these per monitor
- Check the audit log to confirm the command was sent

**Build fails on Windows**
- Confirm Visual Studio 2022 with C++ workload is installed
- Delete `node_modules` and re-run `npm ci`

**Update check fails**
- Auto-update requires a published GitHub Release matching the app version; run from a tagged build or disable the updater during development
