import { useCallback, useEffect, useRef, useState } from 'react'
import { resolveApiBaseUrl } from './apiClient'

const BURST_WINDOW_MS = 20_000
const REFRESH_COOLDOWN_MS = 20_000
const DISPLAY_UPDATE_MS = 3_000
const MAX_PENDING_ACTIVITIES = 2_000
const MAX_SEEN_EVENT_IDS = 500

interface BoardActivityMessage {
  id: string
  type: 'POST' | 'COMMENT'
  postId: number
  occurredAt: number
}

interface ReceivedActivity extends BoardActivityMessage {
  receipt: number
}

export interface BoardActivitySummary {
  postCount: number
  commentCount: number
  visible: boolean
}

const EMPTY_SUMMARY: BoardActivitySummary = {
  postCount: 0,
  commentCount: 0,
  visible: false,
}

function countActivities(activities: ReceivedActivity[]) {
  let postCount = 0
  let commentCount = 0

  for (const activity of activities) {
    if (activity.type === 'POST') postCount += 1
    if (activity.type === 'COMMENT') commentCount += 1
  }
  return { postCount, commentCount }
}

function isActivityMessage(value: unknown): value is BoardActivityMessage {
  if (!value || typeof value !== 'object') return false
  const message = value as Partial<BoardActivityMessage>
  return typeof message.id === 'string'
    && (message.type === 'POST' || message.type === 'COMMENT')
    && typeof message.postId === 'number'
    && typeof message.occurredAt === 'number'
}

export function useBoardActivity(activePostId: number | null) {
  const pendingActivitiesRef = useRef<ReceivedActivity[]>([])
  const seenEventIdsRef = useRef(new Set<string>())
  const seenEventOrderRef = useRef<string[]>([])
  const receiptRef = useRef(0)
  const visibleRef = useRef(false)
  const cooldownUntilRef = useRef(0)
  const [summary, setSummary] = useState<BoardActivitySummary>(EMPTY_SUMMARY)

  useEffect(() => {
    if (!('EventSource' in window)) return

    const baseUrl = resolveApiBaseUrl().replace(/\/$/, '')
    const eventSource = new EventSource(`${baseUrl}/activity/stream`, {
      withCredentials: true,
    })

    const receiveActivity = (event: Event) => {
      try {
        const message = JSON.parse((event as MessageEvent<string>).data)
        if (!isActivityMessage(message) || seenEventIdsRef.current.has(message.id)) return

        seenEventIdsRef.current.add(message.id)
        seenEventOrderRef.current.push(message.id)
        if (seenEventOrderRef.current.length > MAX_SEEN_EVENT_IDS) {
          const expiredId = seenEventOrderRef.current.shift()
          if (expiredId) seenEventIdsRef.current.delete(expiredId)
        }

        receiptRef.current += 1
        pendingActivitiesRef.current.push({
          ...message,
          receipt: receiptRef.current,
        })
        if (pendingActivitiesRef.current.length > MAX_PENDING_ACTIVITIES) {
          pendingActivitiesRef.current.shift()
        }
      } catch {
        // Ignore malformed or non-activity SSE messages.
      }
    }

    eventSource.addEventListener('activity', receiveActivity)
    return () => {
      eventSource.removeEventListener('activity', receiveActivity)
      eventSource.close()
    }
  }, [])

  useEffect(() => {
    const evaluateActivity = () => {
      const now = Date.now()
      if (!visibleRef.current) {
        pendingActivitiesRef.current = pendingActivitiesRef.current.filter(
          (activity) => activity.occurredAt >= now - BURST_WINDOW_MS,
        )
      }

      if (now < cooldownUntilRef.current) {
        setSummary((current) => current.visible ? EMPTY_SUMMARY : current)
        return
      }

      const counts = countActivities(pendingActivitiesRef.current)
      const activePostCommentCount = activePostId === null
        ? 0
        : pendingActivitiesRef.current.filter(
          (activity) => activity.type === 'COMMENT' && activity.postId === activePostId,
        ).length
      const isBurst = counts.postCount >= 3
        || counts.commentCount >= 5
        || counts.postCount + counts.commentCount >= 6
        || activePostCommentCount >= 3

      if (!visibleRef.current && !isBurst) {
        setSummary((current) => current.visible ? EMPTY_SUMMARY : current)
        return
      }

      visibleRef.current = true
      setSummary((current) => {
        const next = { ...counts, visible: true }
        return current.postCount === next.postCount
          && current.commentCount === next.commentCount
          && current.visible
          ? current
          : next
      })
    }

    evaluateActivity()
    const timer = window.setInterval(evaluateActivity, DISPLAY_UPDATE_MS)
    return () => window.clearInterval(timer)
  }, [activePostId])

  const captureRefreshMarker = useCallback(() => receiptRef.current, [])

  const acknowledgeRefresh = useCallback((marker: number) => {
    pendingActivitiesRef.current = pendingActivitiesRef.current.filter(
      (activity) => activity.receipt > marker,
    )
    visibleRef.current = false
    cooldownUntilRef.current = Date.now() + REFRESH_COOLDOWN_MS
    setSummary(EMPTY_SUMMARY)
  }, [])

  return {
    summary,
    captureRefreshMarker,
    acknowledgeRefresh,
  }
}
