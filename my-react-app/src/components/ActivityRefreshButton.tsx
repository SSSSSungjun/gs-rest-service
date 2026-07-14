import type { BoardActivitySummary } from '../useBoardActivity'
import { RefreshCwIcon } from './Icons'

interface ActivityRefreshButtonProps {
  summary: BoardActivitySummary
  isRefreshing: boolean
  onRefresh: () => void
}

function formatCount(count: number) {
  return count > 99 ? '99+' : String(count)
}

export function ActivityRefreshButton({
  summary,
  isRefreshing,
  onRefresh,
}: ActivityRefreshButtonProps) {
  const postCount = formatCount(summary.postCount)
  const commentCount = formatCount(summary.commentCount)
  const label = summary.postCount > 0 && summary.commentCount > 0
    ? `새 글 ${postCount} · 댓글 ${commentCount}`
    : summary.postCount > 0
      ? `새 글 ${postCount}`
      : `새 댓글 ${commentCount}`

  return (
    <button
      className="activity-refresh-button icon-text-button"
      type="button"
      onClick={onRefresh}
      disabled={isRefreshing}
      aria-label={`${label} 보기`}
      title={`${label} 보기`}
    >
      <RefreshCwIcon />
      <span>{isRefreshing ? '갱신 중' : label}</span>
    </button>
  )
}
