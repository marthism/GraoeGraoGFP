import { isTauri } from './env';

type AutostartStatus =
  | { ok: true; enabled: boolean }
  | { ok: false; enabled: boolean; error: string };

type AutostartResult = { ok: true } | { ok: false; error: string };

async function invokePlugin<T>(command: string, payload?: Record<string, unknown>): Promise<T> {
  const { invoke } = await import('@tauri-apps/api/tauri');
  return invoke<T>(command, payload);
}

export async function getAutostartStatus(): Promise<AutostartStatus> {
  if (!isTauri()) return { ok: false, enabled: false, error: 'not-tauri' };
  try {
    const enabled = await invokePlugin<boolean>('plugin:autostart|is_enabled');
    return { ok: true, enabled };
  } catch (error) {
    return { ok: false, enabled: false, error: error instanceof Error ? error.message : String(error) };
  }
}

export async function enableAutostart(): Promise<AutostartResult> {
  if (!isTauri()) return { ok: false, error: 'not-tauri' };
  try {
    await invokePlugin<void>('plugin:autostart|enable');
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}

export async function disableAutostart(): Promise<AutostartResult> {
  if (!isTauri()) return { ok: false, error: 'not-tauri' };
  try {
    await invokePlugin<void>('plugin:autostart|disable');
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}
