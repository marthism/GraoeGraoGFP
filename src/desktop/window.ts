import { DisplayMode, ResolutionOption } from '@/types/app-settings';
import { isTauri } from './env';

type DesktopResult = { ok: true } | { ok: false; error: string };

export function parseResolution(resolution: ResolutionOption): { width: number; height: number } | null {
  if (resolution === 'auto') return null;
  const [width, height] = resolution.split('x').map(Number);
  if (!width || !height) return null;
  return { width, height };
}

export async function setWindowSize(resolution: ResolutionOption): Promise<DesktopResult> {
  if (!isTauri()) return { ok: false, error: 'not-tauri' };
  if (resolution === 'auto') return { ok: true };
  try {
    const size = parseResolution(resolution);
    if (!size) return { ok: false, error: 'invalid-resolution' };
    const { appWindow, LogicalSize } = await import('@tauri-apps/api/window');
    await appWindow.setSize(new LogicalSize(size.width, size.height));
    await appWindow.center();
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}

export async function setFullscreen(enabled: boolean): Promise<DesktopResult> {
  if (!isTauri()) return { ok: false, error: 'not-tauri' };
  try {
    const { appWindow } = await import('@tauri-apps/api/window');
    await appWindow.setFullscreen(enabled);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}

export async function applyDesktopDisplay(
  displayMode: DisplayMode,
  resolution: ResolutionOption
): Promise<DesktopResult> {
  if (!isTauri()) return { ok: false, error: 'not-tauri' };
  if (displayMode === 'fullscreen') {
    return setFullscreen(true);
  }
  const fullscreenResult = await setFullscreen(false);
  if (!fullscreenResult.ok) return fullscreenResult;
  return setWindowSize(resolution);
}
