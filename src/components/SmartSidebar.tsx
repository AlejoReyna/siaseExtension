import { useMemo, useState } from 'react';
import {
  BookOpen,
  CalendarDays,
  ChevronDown,
  CircleDollarSign,
  FileCheck2,
  GraduationCap,
  Home,
  LogOut,
  Pin,
  Search,
  Sparkles,
  UserRound
} from 'lucide-react';
import type { MenuCategory, MenuItem } from '@/types/menu';

export interface SmartSidebarProps {
  items: MenuItem[];
  query: string;
  pinnedIds: string[];
  onQueryChange: (query: string) => void;
  onTogglePinned: (id: string) => void;
}

const categoryOrder: MenuCategory[] = [
  'academic',
  'schedule',
  'payments',
  'services',
  'profile',
  'other'
];

const categoryMeta = {
  academic: { label: 'Académico', icon: GraduationCap },
  schedule: { label: 'Horario', icon: CalendarDays },
  payments: { label: 'Finanzas', icon: CircleDollarSign },
  services: { label: 'Trámites', icon: FileCheck2 },
  profile: { label: 'Perfil', icon: UserRound },
  other: { label: 'Otros servicios', icon: Sparkles }
} satisfies Record<MenuCategory, { label: string; icon: typeof BookOpen }>;

export function SmartSidebar({
  items,
  query,
  pinnedIds,
  onQueryChange,
  onTogglePinned
}: SmartSidebarProps): JSX.Element {
  const [localQuery, setLocalQuery] = useState(query);
  const [localPinnedIds, setLocalPinnedIds] = useState(pinnedIds);
  const [activeId, setActiveId] = useState<string>();
  const [openGroups, setOpenGroups] = useState<Record<MenuCategory, boolean>>({
    academic: true,
    schedule: true,
    payments: false,
    services: false,
    profile: false,
    other: false
  });

  const filteredItems = useMemo(() => {
    const normalized = localQuery.trim().toLocaleLowerCase('es-MX');
    if (!normalized) return items;
    return items.filter((item) => item.label.toLocaleLowerCase('es-MX').includes(normalized));
  }, [items, localQuery]);

  const groups = useMemo(
    () =>
      categoryOrder
        .map((category) => ({
          category,
          items: filteredItems.filter((item) => item.category === category)
        }))
        .filter((group) => group.items.length),
    [filteredItems]
  );

  const pinnedItems = filteredItems.filter((item) => localPinnedIds.includes(item.id));

  function updateQuery(value: string): void {
    setLocalQuery(value);
    onQueryChange(value);
  }

  function togglePinned(id: string): void {
    setLocalPinnedIds((current) =>
      current.includes(id) ? current.filter((currentId) => currentId !== id) : [...current, id]
    );
    onTogglePinned(id);
  }

  function handleHome(): void {
    window.top?.location.reload();
  }

  function handleLogout(): void {
    const logout = Array.from(
      document.querySelectorAll<HTMLAnchorElement | HTMLButtonElement | HTMLInputElement>(
        'a, button, input[type="button"], input[type="submit"]'
      )
    ).find((element) => {
      const label = element instanceof HTMLInputElement ? element.value : element.textContent;
      return /salir|cerrar\s+sesi[oó]n|logout/i.test(label ?? '');
    });

    if (logout instanceof HTMLAnchorElement && logout.href) {
      window.top?.location.assign(logout.href);
    } else if (logout) {
      logout.click();
    }
  }

  function renderItem(item: MenuItem): JSX.Element {
    const pinned = localPinnedIds.includes(item.id);
    const opensNewContext = item.target === '_blank' || item.target === '_new';
    return (
      <li className="siase-v2-nav-item" key={item.id}>
        <a
          className={activeId === item.id ? 'is-active' : ''}
          href={item.href}
          target={item.target}
          rel={opensNewContext ? 'noopener noreferrer' : undefined}
          onClick={() => setActiveId(item.id)}
          title={item.label}
        >
          <span>{item.label}</span>
          {item.target !== 'center' ? <em>{item.target === '_top' ? '↗' : '＋'}</em> : null}
        </a>
        <button
          className={pinned ? 'siase-v2-pin is-pinned' : 'siase-v2-pin'}
          type="button"
          aria-label={pinned ? `Quitar ${item.label} de favoritos` : `Fijar ${item.label}`}
          onClick={() => togglePinned(item.id)}
        >
          <Pin size={14} aria-hidden="true" />
        </button>
      </li>
    );
  }

  return (
    <nav className="siase-v2-sidebar" aria-label="Servicios SIASE">
      <div className="siase-v2-sidebar__top">
        <button className="siase-v2-home" type="button" onClick={handleHome}>
          <Home size={18} aria-hidden="true" />
          <span>Inicio</span>
        </button>
        <label className="siase-v2-search">
          <Search size={16} aria-hidden="true" />
          <span className="siase-v2-sr-only">Buscar servicio</span>
          <input
            type="search"
            value={localQuery}
            placeholder="Buscar servicio"
            onChange={(event) => updateQuery(event.currentTarget.value)}
          />
        </label>
      </div>

      <div className="siase-v2-sidebar__scroll">
        {pinnedItems.length ? (
          <section className="siase-v2-nav-group siase-v2-nav-group--favorites">
            <h2>Favoritos</h2>
            <ul>{pinnedItems.map(renderItem)}</ul>
          </section>
        ) : null}

        {groups.map(({ category, items: groupItems }) => {
          const meta = categoryMeta[category];
          const CategoryIcon = meta.icon;
          const isOpen = Boolean(localQuery) || openGroups[category];
          return (
            <section className="siase-v2-nav-group" key={category}>
              <button
                className="siase-v2-nav-group__toggle"
                type="button"
                aria-expanded={isOpen}
                onClick={() =>
                  setOpenGroups((current) => ({ ...current, [category]: !current[category] }))
                }
              >
                <span>
                  <CategoryIcon size={17} aria-hidden="true" />
                  {meta.label}
                </span>
                <span className="siase-v2-nav-group__count">{groupItems.length}</span>
                <ChevronDown size={15} aria-hidden="true" />
              </button>
              {isOpen ? <ul>{groupItems.map(renderItem)}</ul> : null}
            </section>
          );
        })}

        {!filteredItems.length ? (
          <p className="siase-v2-no-results">No encontramos un servicio con ese nombre.</p>
        ) : null}
      </div>

      <footer className="siase-v2-sidebar__footer">
        <button type="button" onClick={handleLogout}>
          <LogOut size={17} aria-hidden="true" />
          <span>Cerrar sesión</span>
        </button>
      </footer>
    </nav>
  );
}
