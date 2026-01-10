import React from 'react'

function range(start, end) {
  const res = []
  for (let i = start; i <= end; i++) res.push(i)
  return res
}

// Generate a compact page list with optional ellipses when there are many pages
function getPageList(current, total, maxButtons = 7) {
  if (total <= maxButtons) return range(1, total)
  const sideButtons = Math.floor((maxButtons - 3) / 2) // reserve for first,last and current block
  let left = Math.max(2, current - sideButtons)
  let right = Math.min(total - 1, current + sideButtons)

  // Shift window when near edges
  if (current - 1 <= sideButtons) {
    left = 2
    right = maxButtons - 2
  }
  if (total - current <= sideButtons) {
    left = total - (maxButtons - 3)
    right = total - 1
  }

  const pages = [1]
  if (left > 2) pages.push('start-ellipsis')
  pages.push(...range(left, right))
  if (right < total - 1) pages.push('end-ellipsis')
  pages.push(total)
  return pages
}

export default function Pagination({ page, setPage, total = 0, pageSize = 10, maxButtons = 7, totalPages: totalPagesProp = null }) {
  const totalPages = totalPagesProp ? Math.max(1, Number(totalPagesProp)) : Math.max(1, Math.ceil((total || 0) / pageSize))

  const pageList = getPageList(page, totalPages, maxButtons)

  const btnBase = 'px-3 py-1 border rounded-md text-sm'

  return (
    <nav className="flex items-center justify-between sm:justify-end gap-2">
      <div className="hidden sm:flex items-center text-sm text-gray-600">{total} visits</div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => setPage(p => Math.max(1, p - 1))}
          disabled={page <= 1}
            className={`${btnBase} bg-white ${page <= 1 ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-gray-50'}`}
        >Prev</button>

        <div className="flex items-center gap-1">
          {pageList.map((p, idx) => {
            if (p === 'start-ellipsis' || p === 'end-ellipsis') {
              return <span key={String(p) + idx} className="px-2 text-gray-400">...</span>
            }
            const isActive = p === page
            return (
              <button
                key={p}
                onClick={() => setPage(Number(p))}
                aria-current={isActive ? 'page' : undefined}
                className={`${btnBase} ${isActive ? 'bg-blue-600 text-white border-blue-600' : 'bg-white hover:bg-gray-50 cursor-pointer'}`}
              >{p}</button>
            )
          })}
        </div>

        <button
          onClick={() => setPage(p => Math.min(totalPages, p + 1))}
          disabled={page >= totalPages}
            className={`${btnBase} bg-white ${page >= totalPages ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-gray-50'}`}
        >Next</button>
      </div>
      <div className="sm:hidden text-sm text-gray-600">{page} / {totalPages}</div>
    </nav>
  )
}
