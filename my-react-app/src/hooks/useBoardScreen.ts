import { useCallback, useEffect, useMemo, useState } from 'react'
import type { Dispatch } from 'react'
import type { Post } from '../boardApi'
import type { BoardAction } from '../boardReducer'
import { getPostIdFromHash, POST_HASH_PREFIX } from '../boardUi'

export const COMPOSE_HASH = '#compose'

function replaceHashWithRoot() {
  window.history.replaceState(null, '', window.location.pathname + window.location.search)
}

export function useBoardScreen(
  posts: Post[],
  detailPost: Post | null,
  expandedPostId: number | null,
  dispatch: Dispatch<BoardAction>,
) {
  const [isNotificationViewOpen, setIsNotificationViewOpen] = useState(false)
  const [isComposerViewOpen, setIsComposerViewOpen] = useState(false)

  const selectedPost = useMemo(
    () => posts.find((post) => post.id === expandedPostId)
      ?? (detailPost?.id === expandedPostId ? detailPost : null),
    [detailPost, expandedPostId, posts],
  )
  const isDetailView = selectedPost !== null
  const isNotificationView = isNotificationViewOpen && !isDetailView

  const showPostDetail = useCallback((postId: number) => {
    const nextHash = `${POST_HASH_PREFIX}${postId}`
    if (window.location.hash !== nextHash) {
      window.history.pushState({ postId }, '', nextHash)
    }
    setIsComposerViewOpen(false)
    setIsNotificationViewOpen(false)
    dispatch({ type: 'posts/detailOpened', payload: postId })
  }, [dispatch])

  const closePostDetail = useCallback(() => {
    if (window.location.hash.startsWith(POST_HASH_PREFIX)) {
      replaceHashWithRoot()
    }
    setIsNotificationViewOpen(false)
    dispatch({ type: 'posts/detailClosed' })
  }, [dispatch])

  const openComposer = useCallback(() => {
    if (window.location.hash !== COMPOSE_HASH) {
      window.history.pushState({ composer: true }, '', COMPOSE_HASH)
    }
    setIsNotificationViewOpen(false)
    dispatch({ type: 'posts/detailClosed' })
    setIsComposerViewOpen(true)
  }, [dispatch])

  const closeComposer = useCallback(() => {
    setIsComposerViewOpen(false)
    if (window.location.hash !== COMPOSE_HASH) return

    if (window.history.state?.composer) {
      window.history.back()
      return
    }
    replaceHashWithRoot()
  }, [])

  const openNotificationView = useCallback(() => {
    if (window.location.hash.startsWith(POST_HASH_PREFIX)) {
      replaceHashWithRoot()
    }
    dispatch({ type: 'posts/detailClosed' })
    setIsNotificationViewOpen(true)
  }, [dispatch])

  const closeNotificationView = useCallback(() => {
    setIsNotificationViewOpen(false)
  }, [])

  const resetToFeed = useCallback(() => {
    if (window.location.hash.startsWith(POST_HASH_PREFIX)) {
      replaceHashWithRoot()
    }
    setIsComposerViewOpen(false)
    setIsNotificationViewOpen(false)
    dispatch({ type: 'posts/detailClosed' })
  }, [dispatch])

  useEffect(() => {
    const syncFromHash = () => {
      const isComposerHash = window.location.hash === COMPOSE_HASH
      setIsComposerViewOpen(isComposerHash)
      if (isComposerHash) {
        setIsNotificationViewOpen(false)
        dispatch({ type: 'posts/detailClosed' })
        return
      }

      const postId = getPostIdFromHash()
      if (postId === null) {
        dispatch({ type: 'posts/detailClosed' })
        return
      }
      setIsNotificationViewOpen(false)
      dispatch({ type: 'posts/detailOpened', payload: postId })
    }

    syncFromHash()
    window.addEventListener('popstate', syncFromHash)
    return () => window.removeEventListener('popstate', syncFromHash)
  }, [dispatch])

  return {
    selectedPost,
    isDetailView,
    isNotificationView,
    isNotificationViewOpen,
    isComposerViewOpen,
    showPostDetail,
    closePostDetail,
    openComposer,
    closeComposer,
    openNotificationView,
    closeNotificationView,
    resetToFeed,
  }
}
