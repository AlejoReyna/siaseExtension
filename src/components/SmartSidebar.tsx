import { useMemo, useState } from 'react';
import {
  BookOpen,
  CalendarDays,
  ChevronLeft,
  ChevronDown,
  ChevronRight,
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
  initialCollapsed?: boolean;
  onQueryChange: (query: string) => void;
  onTogglePinned: (id: string) => void;
  onToggleCollapsed?: (collapsed: boolean) => void;
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
  initialCollapsed = false,
  onQueryChange,
  onTogglePinned,
  onToggleCollapsed
}: SmartSidebarProps): JSX.Element {
  const [localQuery, setLocalQuery] = useState(query);
  const [localPinnedIds, setLocalPinnedIds] = useState(pinnedIds);
  const [activeId, setActiveId] = useState<string>();
  const [isCollapsed, setIsCollapsed] = useState(initialCollapsed);
  const [openGroups, setOpenGroups] = useState<Record<MenuCategory, boolean>>({
    academic: false,
    schedule: false,
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

  function toggleCollapsed(): void {
    setIsCollapsed((current) => {
      const next = !current;
      onToggleCollapsed?.(next);
      return next;
    });
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
    <nav
      className={isCollapsed ? 'siase-v2-sidebar is-collapsed' : 'siase-v2-sidebar'}
      aria-label="Servicios SIASE"
    >
      <div className="siase-v2-sidebar__top">
        <div className="siase-v2-sidebar__top-row">
          <button
            className="siase-v2-sidebar__brand"
            type="button"
            aria-label="Inicio de SIASE"
            title="Inicio de SIASE"
            onClick={handleHome}
          >
            <span className="siase-v2-sidebar__brand-mark" aria-hidden="true">U</span>
            <span className="siase-v2-sidebar__brand-name" aria-hidden="true">
              <strong>UANL</strong>
              <em>SIASE</em>
            </span>
          </button>
          <button
            className="siase-v2-sidebar__collapse-toggle"
            type="button"
            aria-expanded={!isCollapsed}
            aria-controls="siase-v2-sidebar-content"
            aria-label={isCollapsed ? 'Expandir barra lateral' : 'Contraer barra lateral'}
            title={isCollapsed ? 'Expandir barra lateral' : 'Contraer barra lateral'}
            onClick={toggleCollapsed}
          >
            {isCollapsed ? (
              <ChevronRight size={17} aria-hidden="true" />
            ) : (
              <ChevronLeft size={17} aria-hidden="true" />
            )}
          </button>
        </div>
        <label className="siase-v2-search" aria-hidden={isCollapsed}>
          <Search size={16} aria-hidden="true" />
          <span className="siase-v2-sr-only">Buscar servicio</span>
          <input
            type="search"
            value={localQuery}
            placeholder="Buscar"
            tabIndex={isCollapsed ? -1 : undefined}
            onChange={(event) => updateQuery(event.currentTarget.value)}
          />
        </label>
      </div>

      <div className="siase-v2-sidebar__scroll" id="siase-v2-sidebar-content">
        <button
          className="siase-v2-home siase-v2-home--nav"
          type="button"
          onClick={handleHome}
          title="Inicio"
        >
          <Home size={18} aria-hidden="true" />
          <span>Inicio</span>
        </button>

        {pinnedItems.length ? (
          <section className="siase-v2-nav-group siase-v2-nav-group--favorites">
            <h2>Favoritos</h2>
            <ul>{pinnedItems.map(renderItem)}</ul>
          </section>
        ) : null}

        {groups.map(({ category, items: groupItems }) => {
          const meta = categoryMeta[category];
          const CategoryIcon = meta.icon;
          const isOpen = Boolean(localQuery) || (!isCollapsed && openGroups[category]);
          return (
            <section className="siase-v2-nav-group" key={category}>
              <button
                className="siase-v2-nav-group__toggle"
                type="button"
                aria-expanded={isOpen}
                title={meta.label}
                onClick={() =>
                  isCollapsed
                    ? toggleCollapsed()
                    : setOpenGroups((current) => ({ ...current, [category]: !current[category] }))
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
