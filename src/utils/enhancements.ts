import { getStorageValue, setStorageValue } from './storage';

export async function enhancementsEnabled(): Promise<boolean> {
  if (typeof chrome === 'undefined' || !chrome.storage?.local) return true;
  return (await getStorageValue('siaseEnhancementsEnabled')) !== false;
}

export async function setEnhancementsEnabled(enabled: boolean): Promise<void> {
  if (typeof chrome === 'undefined' || !chrome.storage?.local) return;
  await setStorageValue('siaseEnhancementsEnabled', enabled);
}
