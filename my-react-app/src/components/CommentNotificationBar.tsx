import type { CommentNotification } from '../commentNotifications'

interface CommentNotificationBarProps {
  notifications: CommentNotification[]
  onOpenPost: (postId: number, commentIds: number[]) => void
  onDismiss: (commentIds: number[]) => void
}

export function CommentNotificationBar({ notifications, onOpenPost, onDismiss }: CommentNotificationBarProps) {
  if (notifications.length === 0) return null

  const visibleNotification = notifications[0]
  const notificationIds = notifications.map((notification) => notification.commentId)
  const extraCount = notifications.length - 1

  return (
    <aside className="comment-notification-bar" aria-live="polite">
      <button
        type="button"
        className="comment-notification-main"
        onClick={() => onOpenPost(visibleNotification.postId, notificationIds)}
      >
        <strong>내 글에 새 댓글</strong>
        <span>
          {visibleNotification.commentNickname}: {visibleNotification.commentPreview}
          {extraCount > 0 && ` 외 ${extraCount}개`}
        </span>
      </button>
      <button type="button" className="comment-notification-dismiss" onClick={() => onDismiss(notificationIds)} aria-label="댓글 알림 닫기">
        닫기
      </button>
    </aside>
  )
}
