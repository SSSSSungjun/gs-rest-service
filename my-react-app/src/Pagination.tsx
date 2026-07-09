interface PaginationProps {
  pageCount: number
  currentPage: number
  onPageChange: (page: number) => void
}

export function Pagination({ pageCount, currentPage, onPageChange }: PaginationProps) {
  return (
    <nav className="pagination" aria-label="게시글 페이지">
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
    </nav>
  )
}
