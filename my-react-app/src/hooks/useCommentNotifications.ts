import { useCallback, useEffect, useState } from 'react'
import type { Post } from '../boardApi'
import {
  getUnreadCommentNotifications,
  markCommentNotificationsSeen,
} from '../commentNotifications'
import type { CommentNotification } from '../commentNotifications'

export function useCommentNotifications(posts: Post[]) {
  const [notifications, setNotifications] = useState<CommentNotification[]>([])

  useEffect(() => {
    setNotifications(posts.length === 0 ? [] : getUnreadCommentNotifications(posts))
  }, [posts])

  const dismiss = useCallback((commentIds: number[]) => {
    markCommentNotificationsSeen(commentIds)
    setNotifications((current) => current.filter(
      (notification) => !commentIds.includes(notification.commentId),
    ))
  }, [])

  return { notifications, dismiss }
}
