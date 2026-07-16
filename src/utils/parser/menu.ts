import type { CategorizedMenu, MenuCategory, MenuItem } from '@/types/menu';
import { textContent } from './dom';

function inferCategory(label: string): MenuCategory {
  const normalized = label.toLowerCase();
  if (/kardex|calif|materia|acad|promedio|avance/.test(normalized)) return 'academic';
  if (/horario|clase|agenda/.test(normalized)) return 'schedule';
  if (/pago|cuota|recibo|adeudo|finanza|beca/.test(normalized)) return 'payments';
  if (/dato|personal|situaci|estatus|perfil|foto/.test(normalized)) return 'profile';
  if (/tramite|solicitud|constancia|servicio|voluntariado/.test(normalized)) return 'services';
  if (/programa|curso|taller|actividad/.test(normalized)) return 'other';
  return 'other';
}

export function parseMenuItems(document: Document): MenuItem[] {
  return Array.from(
    document.querySelectorAll<HTMLAnchorElement>('ul.menu.collapsible li a[href]')
  )
    .map((anchor, index) => {
      const label = textContent(anchor).replace(/\s+/g, ' ').trim();
      return {
        id: `${index}-${label}`,
        label,
        href: anchor.href,
        target: anchor.target || 'center',
        category: inferCategory(label),
        pinned: false
      };
    })
    .filter((item) => item.label && item.href);
}

export function categorizeMenuItems(items: MenuItem[]): CategorizedMenu[] {
  const categories = new Map<MenuCategory, MenuItem[]>();
  items.forEach((item) =>
    categories.set(item.category, [...(categories.get(item.category) ?? []), item])
  );
  return Array.from(categories.entries()).map(([category, categoryItems]) => ({
    category,
    items: categoryItems
  }));
}
