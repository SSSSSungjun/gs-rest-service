import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'

interface PaginationProps {
  pageCount: number
  currentPage: number
  onPageChange: (page: number) => void
}

export function Pagination({ pageCount, currentPage, onPageChange }: PaginationProps) {
  const [pageInput, setPageInput] = useState(String(currentPage))

  useEffect(() => {
    setPageInput(String(currentPage))
  }, [currentPage])

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
        {Array.from({ length: pageCount }, (_, index) => index + 1).map((page) => (
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

      <form className="pagination-jump" onSubmit={handlePageJump}>
        <label>
          <span>페이지 이동</span>
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
        <button type="submit">이동</button>
      </form>
    </nav>
  )
}
