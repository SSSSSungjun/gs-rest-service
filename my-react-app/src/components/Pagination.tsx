import { useEffect, useMemo, useState } from 'react'
import { ChevronLeftIcon, ChevronRightIcon } from './Icons'

interface PaginationProps {
  pageCount: number
  currentPage: number
  onPageChange: (page: number) => void
}

const DESKTOP_PAGE_COUNT = 10
const MOBILE_PAGE_COUNT = 5

export function Pagination({ pageCount, currentPage, onPageChange }: PaginationProps) {
  const [visiblePageCount, setVisiblePageCount] = useState(DESKTOP_PAGE_COUNT)

  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 520px)')
    const updateVisiblePageCount = () => {
      setVisiblePageCount(mediaQuery.matches ? MOBILE_PAGE_COUNT : DESKTOP_PAGE_COUNT)
    }

    updateVisiblePageCount()
    mediaQuery.addEventListener('change', updateVisiblePageCount)
    return () => mediaQuery.removeEventListener('change', updateVisiblePageCount)
  }, [])

  const visiblePages = useMemo(() => {
    const halfWindow = Math.floor(visiblePageCount / 2)
    const maxStartPage = Math.max(1, pageCount - visiblePageCount + 1)
    const startPage = Math.min(Math.max(currentPage - halfWindow, 1), maxStartPage)
    const visibleCount = Math.min(visiblePageCount, pageCount)
    return Array.from({ length: visibleCount }, (_, index) => startPage + index)
  }, [currentPage, pageCount, visiblePageCount])

  return (
    <nav className="pagination" aria-label="게시글 페이지">
      <button
        className="pagination-arrow"
        type="button"
        onClick={() => onPageChange(Math.max(1, currentPage - 1))}
        disabled={currentPage === 1}
        aria-label="이전 페이지"
      >
        <ChevronLeftIcon />
      </button>

      <div className="pagination-pages">
        {visiblePages.map((page) => (
          <button
            key={page}
            type="button"
            className={page === currentPage ? 'active' : undefined}
            aria-current={page === currentPage ? 'page' : undefined}
            onClick={() => onPageChange(page)}
          >
            {page}
          </button>
        ))}
      </div>

      <button
        className="pagination-arrow"
        type="button"
        onClick={() => onPageChange(Math.min(pageCount, currentPage + 1))}
        disabled={currentPage === pageCount}
        aria-label="다음 페이지"
      >
        <ChevronRightIcon />
      </button>
    </nav>
  )
}
