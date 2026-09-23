import type { ForgeConfig } from '@electron-forge/shared-types';
import { MakerSquirrel } from '@electron-forge/maker-squirrel';
import { MakerZIP } from '@electron-forge/maker-zip';
import { MakerDeb } from '@electron-forge/maker-deb';
import { MakerRpm } from '@electron-forge/maker-rpm';
import { AutoUnpackNativesPlugin } from '@electron-forge/plugin-auto-unpack-natives';
import { WebpackPlugin } from '@electron-forge/plugin-webpack';
import { FusesPlugin } from '@electron-forge/plugin-fuses';
import { FuseV1Options, FuseVersion } from '@electron/fuses';

import { mainConfig } from './webpack.main.config';
import { rendererConfig } from './webpack.renderer.config';

const certFile = process.env.CERT_FILE ?? './certs/certificate.pfx';
const certPassword = process.env.CERT_PASSWORD;
const certHashAlgorithm = process.env.CERT_HASH_ALGO ?? 'sha256';

const config: ForgeConfig = {
  packagerConfig: {
    asar: true,
    executableName: 'MonitorController',
    appBundleId: 'com.aionext.monitor-controller',
    icon: './assets/icon.ico',
    win32metadata: {
      CompanyName: 'AIONEXT',
      FileDescription: 'Universal monitor discovery and hardware control via DDC/CI',
      ProductName: 'Monitor Controller',
      InternalName: 'MonitorControl',
      OriginalFilename: 'MonitorController.exe',
    },
  },
  rebuildConfig: {},
  makers: [
    new MakerSquirrel({
      certificateFile: certFile,
      certificatePassword: certPassword,
      signingHashAlgorithms: [certHashAlgorithm],
      setupExe: 'MonitorControllerSetup.exe',
      setupIcon: './assets/icon.ico',
       noMsi: true,
    }),
    new MakerZIP({}, ['darwin']),
    new MakerRpm({
      options: {
        name: 'monitor-controller',
        productName: 'Monitor Controller',
        description: 'Universal monitor discovery and hardware control via DDC/CI',
        icon: './assets/icon.png',
        categories: ['Utility'],
      },
    }),
    new MakerDeb({
      options: {
        name: 'monitor-controller',
        productName: 'Monitor Controller',
        description: 'Universal monitor discovery and hardware control via DDC/CI',
        icon: './assets/icon.png',
        categories: ['Utility'],
      },
    }),
  ],
  plugins: [
    new AutoUnpackNativesPlugin({}),
    new WebpackPlugin({
      mainConfig,
      renderer: {
        config: rendererConfig,
        entryPoints: [
          {
            html: './src/index.html',
            js: './src/renderer.tsx',
            name: 'main_window',
            preload: {
              js: './src/preload.ts',
            },
          },
        ],
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
  publishers: [
    {
      name: '@electron-forge/publisher-github',
      config: {
        repository: {
          owner: 'AIONEXT',
          name: 'monitor-controller',
        },
        prerelease: false,
        draft: true,
      },
    },
  ],
};

export default config;