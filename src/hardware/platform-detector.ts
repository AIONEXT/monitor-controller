export type Platform = 'win32' | 'darwin' | 'linux';

export function getPlatform(): Platform {
  const platform = process.platform;
  if (platform === 'win32') return 'win32';
  if (platform === 'darwin') return 'darwin';
  return 'linux';
}

export function isWindows(): boolean {
  return getPlatform() === 'win32';
}

export function isMacOS(): boolean {
  return getPlatform() === 'darwin';
}

export function isLinux(): boolean {
  return getPlatform() === 'linux';
}

export async function checkCommandExists(command: string): Promise<boolean> {
  try {
    const { execFile } = await import('child_process');
    const { promisify } = await import('util');
    const execFileAsync = promisify(execFile);
    
    const checkCmd = isWindows() ? 'where' : 'which';
    await execFileAsync(checkCmd, [command]);
    return true;
  } catch {
    return false;
  }
}