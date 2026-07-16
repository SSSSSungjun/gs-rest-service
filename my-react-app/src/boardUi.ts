import type { KeyboardEvent, MouseEvent } from 'react'

export const POSTS_PER_PAGE = 8
export const POPULAR_POST_LIKE_THRESHOLD = 10
export const MAX_TEXTAREA_HEIGHT = 220
export const POST_HASH_PREFIX = '#post-'

export function formatDate(value: string) {
  if (!value) return ''

  const date = new Date(value)
  const timestamp = date.getTime()
  if (Number.isNaN(timestamp)) return ''

  const now = new Date()
  const elapsedMs = Math.max(0, now.getTime() - timestamp)
  const elapsedMinutes = Math.floor(elapsedMs / 60_000)

  if (elapsedMinutes < 1) return '방금 전'
  if (elapsedMinutes < 60) return `${elapsedMinutes}분 전`

  const elapsedHours = Math.floor(elapsedMinutes / 60)
  if (elapsedHours < 24) return `${elapsedHours}시간 전`

  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  })
  const getPart = (target: Date, type: Intl.DateTimeFormatPartTypes) => (
    formatter.formatToParts(target).find((part) => part.type === type)?.value ?? ''
  )
  const dateYear = getPart(date, 'year')
  const nowYear = getPart(now, 'year')
  const dateLabel = `${getPart(date, 'month')}월 ${getPart(date, 'day')}일 ${getPart(date, 'hour')}:${getPart(date, 'minute')}`

  return dateYear === nowYear ? dateLabel : `${dateYear}년 ${dateLabel}`
}

export function wasEdited(createdAt: string, updatedAt: string | null) {
  if (!createdAt || !updatedAt) return false

  return new Date(updatedAt).getTime() > new Date(createdAt).getTime()
}

export function isPopularPost(likeCount: number) {
  return likeCount >= POPULAR_POST_LIKE_THRESHOLD
}

export function preventEnterSubmit(event: KeyboardEvent<HTMLFormElement>) {
  if (event.key !== 'Enter') return
  if (event.target instanceof HTMLTextAreaElement) return

  event.preventDefault()
}

export function resizeTextarea(element: HTMLTextAreaElement) {
  element.style.height = 'auto'
  element.style.height = `${Math.min(element.scrollHeight, MAX_TEXTAREA_HEIGHT)}px`
}

export function handleTextareaKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
  if (event.key !== 'Tab') return

  event.preventDefault()
  const element = event.currentTarget
  const selectionStart = element.selectionStart
  const selectionEnd = element.selectionEnd
  const nextValue = `${element.value.slice(0, selectionStart)}\t${element.value.slice(selectionEnd)}`

  element.value = nextValue
  element.selectionStart = selectionStart + 1
  element.selectionEnd = selectionStart + 1
  element.dispatchEvent(new Event('input', { bubbles: true }))
  resizeTextarea(element)
}

export function getPostIdFromHash() {
  if (!window.location.hash.startsWith(POST_HASH_PREFIX)) return null

  const postId = Number(window.location.hash.replace(POST_HASH_PREFIX, ''))
  return Number.isInteger(postId) && postId > 0 ? postId : null
}

export function isInteractiveClick(event: MouseEvent<HTMLElement>) {
  const target = event.target
  return target instanceof Element && target.closest('button, a, input, textarea, details, form') !== null
}