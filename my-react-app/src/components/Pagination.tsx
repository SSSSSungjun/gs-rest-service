import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'

interface PaginationProps {
  pageCount: number
  currentPage: number
  onPageChange: (page: number) => void
}

const VISIBLE_PAGE_COUNT = 5

export function Pagination({ pageCount, currentPage, onPageChange }: PaginationProps) {
  const [pageInput, setPageInput] = useState(String(currentPage))

  useEffect(() => {
    setPageInput(String(currentPage))
  }, [currentPage])

  const visiblePages = useMemo(() => {
    const halfWindow = Math.floor(VISIBLE_PAGE_COUNT / 2)
    const maxStartPage = Math.max(1, pageCount - VISIBLE_PAGE_COUNT + 1)
    const startPage = Math.min(Math.max(currentPage - halfWindow, 1), maxStartPage)
    const visibleCount = Math.min(VISIBLE_PAGE_COUNT, pageCount)
    return Array.from({ length: visibleCount }, (_, index) => startPage + index)
  }, [currentPage, pageCount])

  const handlePageJump = (event: FormEvent) => {
    event.preventDefault()
    const requestedPage = Number(pageInput)
    if (!Number.isInteger(requestedPage)) {
      setPageInput(String(currentPage))
      return
    }

    const nextPage = Math.min(Math.max(requestedPage, 1), pageCount)
    onPageChange(nextPage)
    setPageInput(String(nextPage))
  }

  return (
    <nav className="pagination" aria-label="게시글 페이지">
      <div className="pagination-pages">
        <button type="button" onClick={() => onPageChange(1)} disabled={currentPage === 1} aria-label="첫 페이지">
          처음
        </button>
        <button type="button" onClick={() => onPageChange(Math.max(1, currentPage - 1))} disabled={currentPage === 1} aria-label="이전 페이지">
          이전
        </button>
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
        <button type="button" onClick={() => onPageChange(Math.min(pageCount, currentPage + 1))} disabled={currentPage === pageCount} aria-label="다음 페이지">
          다음
        </button>
        <button type="button" onClick={() => onPageChange(pageCount)} disabled={currentPage === pageCount} aria-label="마지막 페이지">
          끝
        </button>
      </div>

      <form className="pagination-jump" onSubmit={handlePageJump}>
        <label>
          <span>이동</span>
          <input
            type="number"
            min="1"
            max={pageCount}
            inputMode="numeric"
            value={pageInput}
            onChange={(event) => setPageInput(event.target.value)}
            aria-label="이동할 페이지 번호"
          />
        </label>
        <span className="pagination-total">/ {pageCount}</span>
        <button type="submit">이동</button>
      </form>
    </nav>
  )
}
