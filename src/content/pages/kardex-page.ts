import type { KardexSummary } from '@/types/kardex';
import { parseKardexSummary } from '@/utils/parser/kardex';
import { setStorageValue } from '@/utils/storage';

export async function enhanceKardexPage(frameDocument: Document): Promise<KardexSummary> {
  frameDocument.body.classList.add('siase-plus-kardex-page');
  const summary = parseKardexSummary(frameDocument);
  await setStorageValue('kardexSnapshot', summary);
  // Fire-and-forget — igual que grades-page.ts con REFRESH_GRADES
  void chrome.runtime.sendMessage({ type: 'REFRESH_KARDEX', summary });
  return summary;
}
