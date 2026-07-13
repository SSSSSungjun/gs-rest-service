import type { CommentNotification } from '../commentNotifications'
import { ArrowLeftIcon, BellIcon, CheckIcon } from './Icons'

interface CommentNotificationBarProps {
  notifications: CommentNotification[]
  onOpenList: () => void
}

interface CommentNotificationListProps {
  notifications: CommentNotification[]
  onOpenPost: (postId: number, commentIds: number[]) => void
  onDismiss: (commentIds: number[]) => void
  onBack: () => void
}

export function CommentNotificationBar({ notifications, onOpenList }: CommentNotificationBarProps) {
  const notificationCount = notifications.length
  const hasNotifications = notificationCount > 0

  return (
    <div className="notification-entry-row">
      <button
        type="button"
        className={`notification-entry-button icon-only-button ${hasNotifications ? 'has-notifications' : ''}`}
        onClick={onOpenList}
        aria-label={hasNotifications ? `댓글 알림 ${notificationCount}개 보기` : '댓글 알림 보기'}
      >
        <BellIcon />
        {hasNotifications && <span className="notification-count-badge">+{notificationCount}</span>}
      </button>
    </div>
  )
}

export function CommentNotificationList({
  notifications,
  onOpenPost,
  onDismiss,
  onBack,
}: CommentNotificationListProps) {
  const notificationIds = notifications.map((notification) => notification.commentId)
  const hasNotifications = notifications.length > 0

  return (
    <section className="notification-list-view" aria-labelledby="notification-list-title">
      <div className="notification-list-header">
        <div className="notification-list-title-row">
          <h2 id="notification-list-title">댓글 알림</h2>
          <span>{hasNotifications ? `${notifications.length}개` : '0개'}</span>
        </div>
        <div className="inline-actions">
          <button className="ghost-button icon-text-button" type="button" onClick={onBack}><ArrowLeftIcon />목록</button>
          {hasNotifications && (
            <button className="text-button icon-text-button" type="button" onClick={() => onDismiss(notificationIds)}><CheckIcon />모두 읽음</button>
          )}
        </div>
      </div>

      {hasNotifications ? (
        <ul className="notification-list">
          {notifications.map((notification) => (
            <li className="notification-list-item" key={notification.commentId}>
              <button
                type="button"
                className="notification-list-button"
                onClick={() => onOpenPost(notification.postId, [notification.commentId])}
              >
                <span className="notification-list-label">내 글에 새 댓글</span>
                <strong>{notification.commentNickname}: {notification.commentPreview}</strong>
                <span>원문: {notification.postPreview}</span>
              </button>
              <button
                type="button"
                className="notification-dismiss-button icon-only-button"
                onClick={() => onDismiss([notification.commentId])}
                aria-label="댓글 알림 읽음 처리"
              >
                <CheckIcon />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="empty-state">새 댓글 알림이 없습니다.</p>
      )}
    </section>
  )
}
