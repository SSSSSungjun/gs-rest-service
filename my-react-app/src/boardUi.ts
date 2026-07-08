import type { KeyboardEvent, MouseEvent } from 'react'

export const POSTS_PER_PAGE = 8
export const TOAST_DURATION_MS = 2400
export const MAX_TEXTAREA_HEIGHT = 220
export const POST_HASH_PREFIX = '#post-'

export function formatDate(value: string) {
  if (!value) return ''

  return new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

export function preventEnterSubmit(event: KeyboardEvent<HTMLFormElement>) {
  if (event.key !== 'Enter') return

  const target = event.target
  if (target instanceof HTMLTextAreaElement) return

  event.preventDefault()
}

export function resizeTextarea(element: HTMLTextAreaElement) {
  element.style.height = 'auto'
  element.style.height = `${Math.min(element.scrollHeight, MAX_TEXTAREA_HEIGHT)}px`
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
