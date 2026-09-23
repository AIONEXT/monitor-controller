# Monitor Controller

[![Version](https://img.shields.io/github/v/release/AIONEXT/monitor-controller)](https://github.com/AIONEXT/monitor-controller/releases)
[![License](https://img.shields.io/github/license/AIONEXT/monitor-controller)](LICENSE)
[![Build Status](https://github.com/AIONEXT/monitor-controller/actions/workflows/build-and-release.yml/badge.svg)](https://github.com/AIONEXT/monitor-controller/actions)
[![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-lightgrey)]()

Universal monitor discovery and hardware control via DDC/CI protocol. Adjust brightness, contrast, color temperature, and more on any monitor - no manufacturer-specific software required.

## ✨ Features

- **Universal Compatibility** - Works with any DDC/CI compatible monitor (LG, Dell, Samsung, ASUS, BenQ, Acer, ViewSonic, etc.)
- **Real-time Hardware Control** - Direct communication via DDC/CI protocol over HDMI/DisplayPort/USB-C
- **Auto-Detection** - Automatically discovers connected monitors and reads EDID information
- **Preset Profiles** - Gaming, Movie, Reading, Standard modes with one click
- **Auto-Updates** - Built-in update mechanism via GitHub Releases
- **Cross-Platform** - Windows, macOS, and Linux support
- **Code Signed** - EV certificate signed installers (no SmartScreen warnings)
- **Accessible** - Full keyboard navigation and screen reader support

## 📥 Download

### Latest Release
| Platform | Download |
|----------|----------|
| **Windows** | [MonitorControllerSetup.exe](https://github.com/AIONEXT/monitor-controller/releases/latest/download/MonitorControllerSetup.exe) |
| **macOS** | [MonitorController.dmg](https://github.com/AIONEXT/monitor-controller/releases/latest/download/MonitorController.dmg) |
| **Linux (Deb)** | [monitor-controller.deb](https://github.com/AIONEXT/monitor-controller/releases/latest/download/monitor-controller.deb) |
| **Linux (RPM)** | [monitor-controller.rpm](https://github.com/AIONEXT/monitor-controller/releases/latest/download/monitor-controller.rpm) |

## 🖥️ Requirements

### Windows
- Windows 10/11 (64-bit)
- DDC/CI enabled in monitor OSD
- Direct DisplayPort/HDMI/USB-C connection (no KVM/docks)

### macOS
- macOS 11+ (Apple Silicon or Intel)
- **Limited support** - Only built-in display controls available
- External monitors require manufacturer software

### Linux
- Ubuntu 20.04+, Fedora 35+, Arch, or compatible
- `ddcutil` installed (`sudo apt install ddcutil` / `sudo dnf install ddcutil`)
- User in `i2c` group: `sudo usermod -a -G i2c $USER`
- Kernel module: `sudo modprobe i2c-dev`

## 🔧 Supported Settings

| Setting | VCP Code | Description |
|---------|----------|-------------|
| Brightness | 0x10 | Backlight intensity |
| Contrast | 0x12 | Contrast ratio |
| Sharpness | 0x8D | Edge enhancement |
| Color Temperature | 0x14 | 4000K - 9300K |
| Gamma | 0x72 | 1.8 - 2.6 |
| Hue | 0x16 | Color hue shift |
| Saturation | 0x18 | Color saturation |
| Blue Light Filter | 0xE0 | Low blue light mode |
| Auto Brightness | 0xD0 | Ambient light sensor |
| Power Mode | 0xD6 | Power saving modes |
| Input Source | 0x60 | HDMI/DP/USB-C selection |

*Availability depends on monitor capabilities*

## 🚀 Quick Start

1. **Enable DDC/CI** on your monitor via OSD menu
2. **Connect directly** via DisplayPort, HDMI, or USB-C (no docks/KVMs)
3. **Download & install** the appropriate package for your OS
4. **Launch** Monitor Controller - it auto-detects your monitors
5. **Adjust settings** using sliders or apply presets

## 🛠️ Development

### Prerequisites
- Node.js 20+
- npm 10+
- Windows: Visual Studio 2022 with "Desktop development with C++" workload
- Linux: `sudo apt install libsecret-1-dev`

### Setup
```bash
# Clone repository
git clone https://github.com/AIONEXT/monitor-controller.git
cd monitor-controller

# Install dependencies
npm ci

# Start development server
npm run start
```

### Build Commands
```bash
# Development
npm run start

# Package (unpacked)
npm run package

# Build signed installers
npm run make

# Publish to GitHub Releases
npm run publish

# Linting
npm run lint

# Type checking
npm run typecheck
```

## 🔐 Code Signing

For commercial distribution, configure code signing:

1. Obtain EV Code Signing Certificate (PFX format)
2. Place in `certs/certificate.pfx`
3. Set environment variables:
   ```bash
   export CERT_FILE=./certs/certificate.pfx
   export CERT_PASSWORD=your_password
   ```
4. Add secrets to GitHub Actions:
   - `CERT_BASE64` - Base64 encoded PFX
   - `CERT_PASSWORD` - Certificate password
   - `GH_TOKEN` - GitHub token for releases

## 📁 Project Structure

```
monitor-controller/
├── src/
│   ├── index.ts              # Main process entry
│   ├── preload.ts            # Secure IPC bridge
│   ├── renderer.tsx          # Renderer entry
│   ├── App.tsx               # Main React component
│   ├── monitor-manager.ts    # Monitor orchestration
│   ├── monitor-types.ts      # TypeScript interfaces
│   ├── auto-updater.ts       # Update handling
│   ├── hardware/
│   │   ├── platform-detector.ts
│   │   ├── factory.ts        # Backend factory
│   │   ├── windows-backend.ts   # WMI + Windows APIs
│   │   ├── linux-backend.ts     # ddcutil CLI
│   │   └── macos-backend.ts     # Limited support
│   └── components/
│       ├── Header.tsx
│       ├── MonitorSelector.tsx
│       ├── SettingsPanel.tsx
│       ├── SettingSlider.tsx
│       ├── SettingSelect.tsx
│       ├── PresetsPanel.tsx
│       ├── UpdateBanner.tsx
│       ├── Toast.tsx
│       └── Icon.tsx
├── assets/
│   ├── icon.svg              # Source icon
│   ├── icon.ico              # Windows icon (generated)
│   ├── icon.icns             # macOS icon (generated)
│   ├── icon.png              # Linux icon (generated)
│   └── installer-loading.gif # Windows installer animation
├── certs/                    # Code signing certificates (gitignored)
├── .github/workflows/        # CI/CD pipelines
├── forge.config.ts           # Electron Forge config
├── webpack.*.ts              # Webpack configs
└── tsconfig.json             # TypeScript config
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

### Code Style
- TypeScript strict mode
- ESLint + Prettier
- React functional components with hooks
- CSS custom properties for theming

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

## ⚠️ Disclaimer

This software communicates directly with monitor hardware via DDC/CI. While extensively tested, use at your own risk. Incorrect settings may cause display issues (recoverable via monitor OSD reset).

## 🙏 Acknowledgments

- [ddcutil](https://github.com/rockowitz/ddcutil) - Linux DDC/CI implementation
- [WMI Monitor Classes](https://learn.microsoft.com/en-us/windows/win32/wmi/monitor-classes) - Windows monitor APIs
- [Electron](https://www.electronjs.org/) - Cross-platform desktop framework
- [Electron Forge](https://www.electronforge.io/) - Build tooling