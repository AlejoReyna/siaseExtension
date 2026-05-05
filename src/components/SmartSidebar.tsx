import { type CSSProperties, useMemo, useState } from 'react';
import type { MenuItem } from '@/types/menu';
import { PinButton } from './PinButton';

export interface SmartSidebarProps {
  items: MenuItem[];
  query: string;
  pinnedIds: string[];
  onQueryChange: (query: string) => void;
  onTogglePinned: (id: string) => void;
}

const categoryLabels: Record<MenuItem['category'], string> = {
  academic: 'Académico',
  schedule: 'Horario',
  payments: 'Finanzas',
  services: 'Trámites',
  profile: 'Perfil',
  other: 'Programas'
};

const categoryOrder: MenuItem['category'][] = [
  'academic',
  'schedule',
  'payments',
  'services',
  'profile',
  'other'
];

const iconByCategory: Record<MenuItem['category'], string> = {
  academic: 'book-open',
  schedule: 'calendar-days',
  payments: 'receipt',
  services: 'file-check',
  profile: 'user-round',
  other: 'sparkles'
};

function serviceIcon(label: string, category: MenuItem['category']): string {
  const normalized = label.toLowerCase();
  if (/foto/.test(normalized)) return 'camera';
  if (/horario|clase/.test(normalized)) return 'calendar-days';
  if (/calif|kardex|materia|acad/.test(normalized)) return 'graduation-cap';
  if (/recibo|cuota|pago|adeudo/.test(normalized)) return 'receipt';
  if (/beca|finan/.test(normalized)) return 'wallet';
  if (/dato|personal|perfil/.test(normalized)) return 'user-round';
  if (/situaci|estatus/.test(normalized)) return 'badge-check';
  if (/voluntariado/.test(normalized)) return 'heart-handshake';
  if (/inscrip|tramite|solicitud|constancia/.test(normalized)) return 'file-check';
  return iconByCategory[category];
}

function Icon({ name }: { name: string }): JSX.Element {
  const paths: Record<string, JSX.Element> = {
    'arrow-left': (
      <>
        <path d="M19 12H5" />
        <path d="m12 19-7-7 7-7" />
      </>
    ),
    'badge-check': (
      <>
        <path d="M8.6 14.2 11 16.6l4.8-5.2" />
        <path d="m12 2 2.4 2.1 3.2-.3.7 3.1 2.7 1.7-1.3 2.9 1.3 2.9-2.7 1.7-.7 3.1-3.2-.3L12 22l-2.4-2.1-3.2.3-.7-3.1L3 15.4l1.3-2.9L3 9.6l2.7-1.7.7-3.1 3.2.3L12 2Z" />
      </>
    ),
    'book-open': (
      <>
        <path d="M12 7v14" />
        <path d="M3 5.5A2.5 2.5 0 0 1 5.5 3H12v18H5.5A2.5 2.5 0 0 0 3 23V5.5Z" />
        <path d="M21 5.5A2.5 2.5 0 0 0 18.5 3H12v18h6.5A2.5 2.5 0 0 1 21 23V5.5Z" />
      </>
    ),
    camera: (
      <>
        <path d="M4 8h3l1.5-2h7L17 8h3v11H4V8Z" />
        <circle cx="12" cy="13.5" r="3" />
      </>
    ),
    'calendar-days': (
      <>
        <path d="M7 3v4M17 3v4M4 9h16" />
        <rect x="4" y="5" width="16" height="16" rx="2" />
        <path d="M8 13h.01M12 13h.01M16 13h.01M8 17h.01M12 17h.01" />
      </>
    ),
    'file-check': (
      <>
        <path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9l-6-6Z" />
        <path d="M14 3v6h6M9 15l2 2 4-5" />
      </>
    ),
    'graduation-cap': (
      <>
        <path d="M22 9 12 4 2 9l10 5 10-5Z" />
        <path d="M6 11.5V16c0 1.7 2.7 3 6 3s6-1.3 6-3v-4.5" />
      </>
    ),
    'heart-handshake': (
      <>
        <path d="M12 21s-7-4.4-9.2-8.7C1.4 9.5 3 6 6.2 6c1.8 0 3.1 1 3.8 2.1C10.7 7 12 6 13.8 6c3.2 0 4.8 3.5 3.4 6.3C15 16.6 12 21 12 21Z" />
        <path d="M8.5 12.5 11 15l4.5-4.5" />
      </>
    ),
    'log-out': (
      <>
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
        <path d="M16 17l5-5-5-5M21 12H9" />
      </>
    ),
    receipt: (
      <>
        <path d="M6 3h12v18l-2-1-2 1-2-1-2 1-2-1-2 1V3Z" />
        <path d="M9 8h6M9 12h6M9 16h4" />
      </>
    ),
    sparkles: (
      <>
        <path d="m12 3 1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3Z" />
        <path d="m19 14 .8 2.2L22 17l-2.2.8L19 20l-.8-2.2L16 17l2.2-.8L19 14Z" />
      </>
    ),
    'user-round': (
      <>
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21a8 8 0 0 1 16 0" />
      </>
    ),
    wallet: (
      <>
        <path d="M4 7h15a2 2 0 0 1 2 2v10H4a2 2 0 0 1-2-2V5a2 2 0 0 0 2 2Z" />
        <path d="M16 13h.01" />
      </>
    )
  };

  return (
    <svg className="sidebar-icon" viewBox="0 0 24 24" aria-hidden="true">
      {paths[name] ?? paths.sparkles}
    </svg>
  );
}

export function SmartSidebar({
  items,
  pinnedIds,
  onTogglePinned
}: SmartSidebarProps): JSX.Element {
  const [localPinnedIds, setLocalPinnedIds] = useState<string[]>(pinnedIds);
  const [openCategories, setOpenCategories] = useState<Record<MenuItem['category'], boolean>>({
    academic: false,
    schedule: false,
    payments: false,
    services: false,
    profile: false,
    other: false
  });

  const pinnedItems = items.filter((item) => localPinnedIds.includes(item.id));
  const categorizedItems = useMemo(
    () =>
      categoryOrder
        .map((category) => ({
          category,
          items: items.filter(
            (item) => item.category === category && !localPinnedIds.includes(item.id)
          )
        }))
        .filter((group) => group.items.length),
    [items, localPinnedIds]
  );

  function handleTogglePinned(id: string): void {
    setLocalPinnedIds((current) =>
      current.includes(id) ? current.filter((currentId) => currentId !== id) : [...current, id]
    );
    onTogglePinned(id);
  }

  function toggleCategory(category: MenuItem['category']): void {
    setOpenCategories((current) => ({ ...current, [category]: !current[category] }));
  }

  function handleLogout(): void {
    const logoutControl = Array.from(
      document.querySelectorAll<HTMLAnchorElement | HTMLButtonElement | HTMLInputElement>(
        'a, button, input[type="button"], input[type="submit"]'
      )
    ).find((element) => {
      const label = element instanceof HTMLInputElement ? element.value : element.textContent;
      return /salir|cerrar\s+sesi[oó]n|logout/i.test(label ?? '');
    });

    if (logoutControl instanceof HTMLAnchorElement && logoutControl.href) {
      window.top?.location.assign(logoutControl.href);
      return;
    }

    if (logoutControl) {
      logoutControl.click();
      return;
    }

    window.top?.location.assign('/');
  }

  function handleGoBack(): void {
    window.top?.history.back();
  }

  const renderItem = (item: MenuItem) => (
    <li key={item.id} className={`quest-card quest-card--${item.category}`}>
      <a href={item.href} target={item.target} rel="noreferrer" className="quest-link">
        <Icon name={serviceIcon(item.label, item.category)} />
        <span className="quest-copy">
          <span className="quest-kicker">{categoryLabels[item.category]}</span>
          <span className="quest-title">{item.label}</span>
        </span>
      </a>
      <PinButton
        pinned={localPinnedIds.includes(item.id)}
        onToggle={() => handleTogglePinned(item.id)}
      />
    </li>
  );

  return (
    <nav className="siase-game-panel" aria-label="SIASE Plus navigation">
      <header className="game-panel-header">
        <button type="button" className="sidebar-back-button" onClick={handleGoBack}>
          <Icon name="arrow-left" />
          <span>Go back</span>
        </button>
        <div className="sidebar-brand">
          <span className="sidebar-brand-mark">U</span>
          <span>
            <p className="eyebrow">SIASE Plus</p>
            <h1>Servicios UANL</h1>
          </span>
        </div>
      </header>

      {/*
      <section className="sidebar-summary" aria-label="Servicios disponibles">
        <strong>{filteredItems.length}</strong>
        <span>{localQuery ? 'resultados encontrados' : 'servicios disponibles'}</span>
      </section>

      */}
      {pinnedItems.length ? (
        <section className="quest-section">
          <h2>Favoritas</h2>
          <ul>{pinnedItems.map(renderItem)}</ul>
        </section>
      ) : null}

      <div className="quest-category-list">
        {categorizedItems.map(({ category, items: categoryItems }, index) => (
          <section
            className={
              openCategories[category] ? 'quest-section quest-section--open' : 'quest-section'
            }
            key={category}
            style={{ '--entry-delay': `${120 + index * 70}ms` } as CSSProperties}
          >
            <button
              type="button"
              className="quest-section-toggle"
              aria-expanded={openCategories[category]}
              onClick={() => toggleCategory(category)}
            >
              <span className="quest-section-title">
                <Icon name={iconByCategory[category]} />
                <span>{categoryLabels[category]}</span>
              </span>
              <span className="quest-section-meta">{categoryItems.length}</span>
            </button>
            {openCategories[category] ? <ul>{categoryItems.map(renderItem)}</ul> : null}
          </section>
        ))}
      </div>

      <footer className="sidebar-logout">
        <button type="button" className="sidebar-logout-button" onClick={handleLogout}>
          <Icon name="log-out" />
          <span>Cerrar sesión</span>
        </button>
      </footer>
    </nav>
  );
}
