import type { Post } from './boardApi'

const STORAGE_KEY = 'bambooForest.seenCommentIds'

export interface CommentNotification {
  postId: number
  postPreview: string
  commentId: number
  commentNickname: string
  commentPreview: string
}

function readSeenCommentIds() {
  try {
    const rawValue = window.localStorage.getItem(STORAGE_KEY)
    if (!rawValue) return null
    const parsedValue = JSON.parse(rawValue)
    if (!Array.isArray(parsedValue)) return new Set<number>()
    return new Set(parsedValue.filter((commentId): commentId is number => Number.isInteger(commentId)))
  } catch {
    return new Set<number>()
  }
}

function writeSeenCommentIds(commentIds: Set<number>) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(commentIds)))
}

function makePreview(value: string) {
  const compactValue = value.trim().replace(/\s+/g, ' ')
  if (compactValue.length <= 36) return compactValue
  return `${compactValue.slice(0, 36)}...`
}

function collectOwnedPostCommentIds(posts: Post[]) {
  const commentIds = new Set<number>()
  for (const post of posts) {
    if (!post.ownedByMe) continue
    for (const comment of post.comments) {
      commentIds.add(comment.id)
    }
  }
  return commentIds
}

export function getUnreadCommentNotifications(posts: Post[]) {
  const seenCommentIds = readSeenCommentIds()
  if (seenCommentIds === null) {
    writeSeenCommentIds(collectOwnedPostCommentIds(posts))
    return []
  }

  const notifications: CommentNotification[] = []

  for (const post of posts) {
    if (!post.ownedByMe) continue

    for (const comment of post.comments) {
      if (seenCommentIds.has(comment.id)) continue
      notifications.push({
        postId: post.id,
        postPreview: makePreview(post.content),
        commentId: comment.id,
        commentNickname: comment.nickname || '익명',
        commentPreview: makePreview(comment.content),
      })
    }
  }

  return notifications
}

export function markCommentNotificationsSeen(commentIds: number[]) {
  if (commentIds.length === 0) return
  const seenCommentIds = readSeenCommentIds() ?? new Set<number>()
  for (const commentId of commentIds) {
    seenCommentIds.add(commentId)
  }
  writeSeenCommentIds(seenCommentIds)
}
