/**
 * Set de iconos SVG inline minimalistas. Sin dependencias externas.
 *
 * Uso:
 *   <Icon name="crown" size={18} />
 *   <Icon name="search" size={14} className="kpi-icon" />
 *
 * Los iconos se renderizan con stroke="currentColor" para que el color
 * se controle desde CSS (color: ...).
 */

const STROKE = 1.8

function svg(path, viewBox = '0 0 24 24') {
  return (
    <svg
      viewBox={viewBox}
      width="1em"
      height="1em"
      fill="none"
      stroke="currentColor"
      strokeWidth={STROKE}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {path}
    </svg>
  )
}

const ICONS = {
  // Roles
  crown: () =>
    svg(
      <>
        <path d="M3 17h18" />
        <path d="M4 17l1.5-8 4.5 4 2-6 2 6 4.5-4L20 17" />
        <path d="M3 21h18" />
      </>,
    ),
  userTie: () =>
    svg(
      <>
        <circle cx="12" cy="7" r="3.2" />
        <path d="M5.5 21c0-3.6 2.9-6.5 6.5-6.5s6.5 2.9 6.5 6.5" />
        <path d="M9 14l3 7 3-7" />
      </>,
    ),
  teacher: () =>
    svg(
      <>
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <path d="M3 9h18" />
        <path d="M8 13h2M8 16h6" />
      </>,
    ),
  student: () =>
    svg(
      <>
        <path d="M2 9l10-4 10 4-10 4-10-4z" />
        <path d="M6 11v5c0 1.5 2.7 3 6 3s6-1.5 6-3v-5" />
        <path d="M22 9v6" />
      </>,
    ),
  shield: () =>
    svg(
      <>
        <path d="M12 3l8 3v6c0 5-3.5 8.5-8 9-4.5-.5-8-4-8-9V6l8-3z" />
        <path d="M9 12l2 2 4-4" />
      </>,
    ),

  // UI
  search: () =>
    svg(
      <>
        <circle cx="11" cy="11" r="6.5" />
        <path d="M20 20l-4-4" />
      </>,
    ),
  settings: () =>
    svg(
      <>
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 0 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 0 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3h0a1.7 1.7 0 0 0 1-1.5V3a2 2 0 0 1 4 0v.1a1.7 1.7 0 0 0 1 1.5h0a1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8v0a1.7 1.7 0 0 0 1.5 1H21a2 2 0 0 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
      </>,
    ),
  x: () =>
    svg(
      <>
        <path d="M6 6l12 12M18 6L6 18" />
      </>,
    ),
  check: () =>
    svg(<path d="M5 12l4.5 4.5L19 7" />),
  logout: () =>
    svg(
      <>
        <path d="M15 4h4a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-4" />
        <path d="M10 17l-5-5 5-5" />
        <path d="M5 12h12" />
      </>,
    ),
  download: () =>
    svg(
      <>
        <path d="M12 4v12" />
        <path d="M7 11l5 5 5-5" />
        <path d="M5 20h14" />
      </>,
    ),

  // KPIs / datos
  trend: () =>
    svg(
      <>
        <path d="M3 17l6-6 4 4 8-8" />
        <path d="M14 7h7v7" />
      </>,
    ),
  warning: () =>
    svg(
      <>
        <path d="M12 3l10 17H2L12 3z" />
        <path d="M12 10v4" />
        <path d="M12 17.5v.5" />
      </>,
    ),
  trophy: () =>
    svg(
      <>
        <path d="M8 21h8" />
        <path d="M12 17v4" />
        <path d="M7 4h10v5a5 5 0 0 1-10 0V4z" />
        <path d="M17 5h3v2a3 3 0 0 1-3 3" />
        <path d="M7 5H4v2a3 3 0 0 0 3 3" />
      </>,
    ),
  users: () =>
    svg(
      <>
        <circle cx="9" cy="8" r="3.5" />
        <path d="M2 20c0-3.3 3.1-6 7-6s7 2.7 7 6" />
        <circle cx="17" cy="9" r="2.5" />
        <path d="M15 14.5c3.2.4 5 2.4 5 5.5" />
      </>,
    ),
  target: () =>
    svg(
      <>
        <circle cx="12" cy="12" r="9" />
        <circle cx="12" cy="12" r="5" />
        <circle cx="12" cy="12" r="1.5" fill="currentColor" />
      </>,
    ),
  book: () =>
    svg(
      <>
        <path d="M4 5a2 2 0 0 1 2-2h12v16H6a2 2 0 0 0-2 2V5z" />
        <path d="M4 19a2 2 0 0 1 2-2h12" />
      </>,
    ),
  chart: () =>
    svg(
      <>
        <path d="M3 21h18" />
        <rect x="6" y="13" width="3" height="6" />
        <rect x="11" y="9" width="3" height="10" />
        <rect x="16" y="5" width="3" height="14" />
      </>,
    ),
}

export function Icon({ name, size = 18, className = '' }) {
  const render = ICONS[name]
  if (!render) return null
  return (
    <span
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: size,
        height: size,
        fontSize: size,
        lineHeight: 1,
        color: 'currentColor',
        flexShrink: 0,
      }}
    >
      {render()}
    </span>
  )
}

export const ICON_NAMES = Object.keys(ICONS)
