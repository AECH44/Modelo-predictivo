import { useMemo, useState } from 'react'
import { Icon } from './Icon.jsx'

/**
 * Tabla reutilizable con busqueda case-insensitive, paginacion
 * y selector de tamano de pagina.
 *
 * Props:
 *   rows: array de objetos a renderizar
 *   columns: [{ key, label, render?: (row) => ReactNode, className?: string }]
 *   searchFields: nombres de campos en los que buscar (case-insensitive)
 *   searchPlaceholder: placeholder del input
 *   numericSearchField: campo numerico que se busca de forma EXACTA cuando la
 *     consulta es un numero corto (1-2 digitos). Sirve para que escribir
 *     "5" traiga a los estudiantes del semestre 5 y no a todos los que
 *     tienen un 5 en el documento.
 *   extraFilter: nodo React opcional que se renderiza junto al buscador
 *     (por ejemplo, el selector de semestre).
 *   defaultPageSize: tamano inicial de pagina (default 25)
 *   pageSizeOptions: opciones del selector (default [10, 25, 50, 100])
 *   emptyMessage: mensaje cuando no hay resultados
 *   rowClassName: (row) => string para resaltar filas
 *   tableClassName: clase del <table> (default 'cohort-table')
 *   rowKey: (row) => string o number para la key de cada fila (default row.id o indice)
 */
export function DataTable({
  rows = [],
  columns = [],
  searchFields = [],
  searchPlaceholder = 'Buscar...',
  numericSearchField = null,
  extraFilter = null,
  defaultPageSize = 25,
  pageSizeOptions = [10, 25, 50, 100],
  emptyMessage = 'Sin resultados',
  rowClassName,
  tableClassName = 'cohort-table',
  rowKey,
}) {
  const [search, setSearch] = useState('')
  const [pageSize, setPageSize] = useState(defaultPageSize)
  const [page, setPage] = useState(1)

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q || !searchFields.length) return rows
    // Consulta numerica corta (1-2 digitos): filtro EXACTO por el campo
    // numerico (p.ej. el semestre). Sin este caso, escribir "5" tambien
    // traeria a los estudiantes cuyo documento contiene un 5.
    if (numericSearchField && /^\d{1,2}$/.test(q)) {
      const n = Number(q)
      return rows.filter((r) => Number(r[numericSearchField]) === n)
    }
    return rows.filter((r) =>
      searchFields.some((f) => String(r[f] ?? '').toLowerCase().includes(q)),
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, search, searchFields.join('|'), numericSearchField])

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const safePage = Math.min(Math.max(page, 1), totalPages)
  const start = (safePage - 1) * pageSize
  const visible = filtered.slice(start, start + pageSize)

  function handleSearch(e) {
    setSearch(e.target.value)
    setPage(1)
  }
  function handlePageSize(e) {
    setPageSize(Number(e.target.value))
    setPage(1)
  }

  const info =
    filtered.length === 0
      ? 'Sin resultados'
      : `Mostrando ${start + 1}-${Math.min(start + pageSize, filtered.length)} de ${filtered.length}`

  return (
    <div className="data-table-wrap">
      <div className="data-table-toolbar">
        <div className="data-table-toolbar-left">
          <div className="data-table-search">
            <Icon name="search" size={16} />
            <input
              type="search"
              className="auth-input data-table-search-input"
              placeholder={searchPlaceholder}
              value={search}
              onChange={handleSearch}
              aria-label="Buscar"
            />
          </div>
          {extraFilter}
        </div>
        <label className="data-table-page-size">
          <span>Mostrar</span>
          <select
            className="auth-input auth-select"
            value={pageSize}
            onChange={handlePageSize}
            aria-label="Resultados por pagina"
          >
            {pageSizeOptions.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
      </div>

      <table className={tableClassName}>
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c.key} className={c.className || ''}>
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {visible.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="data-table-empty">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            visible.map((row, i) => {
              const key = rowKey ? rowKey(row) : row.id ?? i
              return (
                <tr
                  key={key}
                  className={rowClassName ? rowClassName(row) : ''}
                >
                  {columns.map((c) => (
                    <td key={c.key} className={c.cellClassName || ''}>
                      {c.render ? c.render(row) : row[c.key]}
                    </td>
                  ))}
                </tr>
              )
            })
          )}
        </tbody>
      </table>

      <div className="data-table-pagination">
        <span className="data-table-info">{info}</span>
        <div className="row-actions">
          <button
            className="auth-button-sm secondary"
            type="button"
            disabled={safePage <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Anterior
          </button>
          <span className="data-table-page">
            Pagina {safePage} de {totalPages}
          </span>
          <button
            className="auth-button-sm secondary"
            type="button"
            disabled={safePage >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            Siguiente
          </button>
        </div>
      </div>
    </div>
  )
}
