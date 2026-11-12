import { app } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import { MakerDeb } from '@electron-forge/maker-deb';
import { MakerRPM } from '@electron-forge/maker-rpm';
import { MakerSquirrel } from '@electron-forge/maker-squirrel';
import { MakerZIP } from '@electron-forge/maker-zip';
import { AutoUnpackNativesPlugin } from '@electron-forge/plugin-auto-unpack-natives';
import { WebpackPlugin } from '@electron-forge/plugin-webpack';
import { FusesPlugin } from '@electron-forge/plugin-fuses';
import { FuseV1Options, FuseVersion } from '@electron/fuses';
import type { ForgeConfig } from '@electron-forge/shared-types';
import { mainConfig } from './webpack.main.config';
import { rendererConfig } from './webpack.renderer.config';

const certFile = process.env.CERT_FILE ?? path.join('certs', 'certificate.pfx');
const certificateFile = fs.existsSync(certFile) ? certFile : undefined;
const certPassword = process.env.CERT_PASSWORD;
const certHashAlgorithm = process.env.CERT_HASH_ALGO ?? 'sha256';

const config: ForgeConfig = {
  packagerConfig: {
    asar: true,
    executableName: 'MonitorController',
    appBundleId: 'com.aionext.monitor-controller',
    // Omitting the extension lets Electron Packager select .ico/.icns per OS.
    icon: './assets/icon',
    win32metadata: {
      CompanyName: 'AIONEXT',
      FileDescription: 'AIONEXT Universal Monitor Controller',
      ProductName: 'AIONEXT Monitor Controller',
      InternalName: 'AIONEXTMonitorController',
      OriginalFilename: 'MonitorController.exe',
    },
  },
  rebuildConfig: {},
  makers: [
    new MakerSquirrel({
      ...(certificateFile ? { certificateFile } : {}),
      ...(certPassword ? { certificatePassword: certPassword } : {}),
      signingHashAlgorithms: [certHashAlgorithm],
      setupExe: 'AIONEXTMonitorControllerSetup.exe',
      setupIcon: './assets/icon.ico',
      noMsi: true,
    }),
    new MakerZIP({}, ['darwin', 'linux']),
    new MakerDeb({ options: { icon: path.resolve('assets/icon.png'), maintainer: 'AIONEXT', homepage: 'https://github.com/AIONEXT/monitor-controller' } }),
    new MakerRPM({ options: { icon: path.resolve('assets/icon.png'), homepage: 'https://github.com/AIONEXT/monitor-controller' } }),
  ],
  plugins: [
    new AutoUnpackNativesPlugin({}),
    new WebpackPlugin({
      port: 4120,
      mainConfig,
      renderer: {
        config: rendererConfig,
        entryPoints: [{ html: './src/index.html', js: './src/renderer.tsx', name: 'main_window', preload: { js: './src/preload.ts' } }],
      },
    }),
    new FusesPlugin({
      version: FuseVersion.V1,
      [FuseV1Options.RunAsNode]: false,
      [FuseV1Options.EnableCookieEncryption]: true,
      [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
      [FuseV1Options.EnableNodeCliInspectArguments]: false,
      [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
      [FuseV1Options.OnlyLoadAppFromAsar]: true,
    }),
  ],
  publishers: [{
    name: '@electron-forge/publisher-github',
    config: { repository: { owner: 'AIONEXT', name: 'monitor-controller' }, prerelease: false, draft: true },
  }],
};

export default config;
