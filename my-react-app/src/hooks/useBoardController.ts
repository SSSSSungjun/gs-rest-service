import { useCallback, useEffect, useReducer, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { getApiErrorMessage, isApiErrorStatus } from '../apiClient'
import { boardApi } from '../boardApi'
import type { Post } from '../boardApi'
import { boardReducer, initialBoardState } from '../boardReducer'
import { POSTS_PER_PAGE, POST_HASH_PREFIX, resizeTextarea } from '../boardUi'
import type { FeedSort } from '../feedSelectors'
import { useBoardActivity } from '../useBoardActivity'
import { useBoardImages } from './useBoardImages'
import { useBoardScreen } from './useBoardScreen'
import { useCommentNotifications } from './useCommentNotifications'
import { useFeedView } from './useFeedView'

export function useBoardController() {
  const [state, dispatch] = useReducer(boardReducer, initialBoardState)
  const [isActivityRefreshing, setIsActivityRefreshing] = useState(false)
  const [isActivityStreamEnabled, setIsActivityStreamEnabled] = useState(false)
  const [notificationPosts, setNotificationPosts] = useState<Post[]>([])
  const [detailPost, setDetailPost] = useState<Post | null>(null)

  const showSystemMessage = useCallback((message: string) => {
    window.alert(message)
  }, [])
  const changePage = useCallback((page: number) => {
    dispatch({ type: 'pagination/pageChanged', payload: page })
  }, [])

  const feed = useFeedView(state.posts, changePage)
  const screen = useBoardScreen(state.posts, detailPost, state.expandedPostId, dispatch)
  const {
    summary: boardActivity,
    captureRefreshMarker,
    acknowledgeRefresh,
  } = useBoardActivity(screen.selectedPost?.id ?? null, isActivityStreamEnabled)
  const commentNotifications = useCommentNotifications(notificationPosts)
  const boardImages = useBoardImages(
    state.images,
    state.editingPosts,
    dispatch,
    showSystemMessage,
  )

  const fetchPosts = useCallback(async (showLoading = true) => {
    const refreshMarker = captureRefreshMarker()
    if (showLoading) dispatch({ type: 'posts/loadStarted' })

    try {
      const data = await boardApi.getPosts({
        page: state.currentPage,
        size: POSTS_PER_PAGE,
        sort: feed.feedSort,
        searchMode: feed.appliedSearchMode,
        query: feed.normalizedSearchQuery,
      })
      dispatch({ type: 'posts/loadSucceeded', payload: data.posts })
      feed.applyPage(data)

      const nextNotificationPosts = await boardApi.getNotificationPosts()
      setNotificationPosts(nextNotificationPosts)

      if (state.expandedPostId !== null) {
        const postOnCurrentPage = data.posts.find((post) => post.id === state.expandedPostId)
        if (postOnCurrentPage) {
          setDetailPost(postOnCurrentPage)
        } else {
          try {
            setDetailPost(await boardApi.getPost(state.expandedPostId))
          } catch (error) {
            if (!isApiErrorStatus(error, 404)) throw error
            setDetailPost(null)
            dispatch({ type: 'posts/detailClosed' })
            window.history.replaceState(
              null,
              '',
              window.location.pathname + window.location.search,
            )
            showSystemMessage('게시글이 삭제되었습니다. 목록으로 돌아갑니다.')
          }
        }
      } else {
        setDetailPost(null)
      }

      setIsActivityStreamEnabled(true)
      acknowledgeRefresh(refreshMarker)
    } catch (error) {
      const message = '게시글을 불러오지 못했습니다.'
      if (showLoading) {
        dispatch({ type: 'posts/loadFailed', payload: message })
      } else {
        dispatch({ type: 'error/set', payload: message })
      }
      showSystemMessage(message)
      console.error(error)
    }
  }, [
    acknowledgeRefresh,
    captureRefreshMarker,
    feed.appliedSearchMode,
    feed.applyPage,
    feed.feedSort,
    feed.normalizedSearchQuery,
    showSystemMessage,
    state.currentPage,
    state.expandedPostId,
  ])

  const refreshBoardActivity = useCallback(async () => {
    setIsActivityRefreshing(true)
    try {
      await fetchPosts(false)
    } finally {
      setIsActivityRefreshing(false)
    }
  }, [fetchPosts])

  const recoverFromDeletedPost = useCallback(async () => {
    screen.closePostDetail()
    showSystemMessage('게시글이 삭제되었습니다. 목록을 새로 불러옵니다.')
    await fetchPosts(false)
  }, [fetchPosts, screen.closePostDetail, showSystemMessage])

  const recordPostView = useCallback(async (postId: number) => {
    try {
      await boardApi.increasePostView(postId)
      await fetchPosts(false)
    } catch (error) {
      dispatch({ type: 'posts/viewCountIncrementRolledBack', payload: postId })
      if (isApiErrorStatus(error, 404)) {
        await recoverFromDeletedPost()
        return
      }
      console.error(error)
    }
  }, [fetchPosts, recoverFromDeletedPost])

  const openPostDetail = useCallback((postId: number) => {
    screen.showPostDetail(postId)
    dispatch({ type: 'posts/viewCountIncremented', payload: postId })
    void recordPostView(postId)
  }, [recordPostView, screen.showPostDetail])

  const openCommentNotificationPost = useCallback((postId: number, commentIds: number[]) => {
    commentNotifications.dismiss(commentIds)
    feed.changeFeedSort('latest')
    screen.closeNotificationView()
    openPostDetail(postId)
  }, [
    commentNotifications.dismiss,
    feed.changeFeedSort,
    openPostDetail,
    screen.closeNotificationView,
  ])

  const handleBoardTitleClick = useCallback(() => {
    const isDefaultFeed = !screen.isDetailView
      && !screen.isNotificationView
      && feed.feedSort === 'latest'
      && feed.searchMode === 'posts'
      && feed.appliedSearchMode === 'posts'
      && state.currentPage === 1
      && !feed.searchInput.trim()
      && !feed.searchQuery.trim()

    if (isDefaultFeed) {
      void fetchPosts(false)
      return
    }

    screen.resetToFeed()
    feed.resetFeed()
  }, [
    feed.appliedSearchMode,
    feed.feedSort,
    feed.resetFeed,
    feed.searchInput,
    feed.searchMode,
    feed.searchQuery,
    fetchPosts,
    screen.isDetailView,
    screen.isNotificationView,
    screen.resetToFeed,
    state.currentPage,
  ])

  const changeFeedSort = (nextSort: FeedSort) => {
    screen.closeNotificationView()
    feed.changeFeedSort(nextSort)
  }

  const submitSearch = () => {
    screen.closeNotificationView()
    feed.submitSearch()
  }

  const handleComposerChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    dispatch({ type: 'composer/contentChanged', payload: event.target.value })
    resizeTextarea(event.currentTarget)
  }

  const handleCommentChange = (event: ChangeEvent<HTMLTextAreaElement>, postId: number) => {
    dispatch({
      type: 'comments/contentChanged',
      payload: { postId, content: event.target.value },
    })
    resizeTextarea(event.currentTarget)
  }

  const handleReplyChange = (event: ChangeEvent<HTMLTextAreaElement>, commentId: number) => {
    dispatch({
      type: 'comments/replyContentChanged',
      payload: { commentId, content: event.target.value },
    })
    resizeTextarea(event.currentTarget)
  }

  const getCleanPollOptions = () => state.pollOptions
    .map((option) => option.trim())
    .filter(Boolean)

  const handleTogglePostLike = async (postId: number) => {
    try {
      await boardApi.togglePostLike(postId)
      await fetchPosts(false)
    } catch (error) {
      if (isApiErrorStatus(error, 404)) {
        await recoverFromDeletedPost()
        return
      }
      showSystemMessage('좋아요 처리에 실패했습니다.')
      console.error(error)
    }
  }

  const handleVotePollOption = async (postId: number, optionId: number) => {
    try {
      await boardApi.votePollOption(postId, optionId)
      await fetchPosts(false)
    } catch (error) {
      if (isApiErrorStatus(error, 404)) {
        await recoverFromDeletedPost()
        return
      }
      showSystemMessage('투표 처리에 실패했습니다.')
      console.error(error)
    }
  }

  const handleToggleCommentLike = async (commentId: number) => {
    try {
      await boardApi.toggleCommentLike(commentId)
      await fetchPosts(false)
    } catch (error) {
      if (isApiErrorStatus(error, 404)) {
        showSystemMessage('댓글이 이미 삭제되었습니다. 목록을 새로 불러옵니다.')
        await fetchPosts(false)
        return
      }
      showSystemMessage('댓글 좋아요 처리에 실패했습니다.')
      console.error(error)
    }
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!state.content.trim()) {
      dispatch({ type: 'error/set', payload: '내용을 입력해주세요.' })
      showSystemMessage('내용을 입력해주세요.')
      return
    }

    const cleanPollOptions = getCleanPollOptions()
    if (state.pollOptions.length > 0 && cleanPollOptions.length < 2) {
      const message = '투표 선택지는 2개 이상 입력해주세요.'
      dispatch({ type: 'error/set', payload: message })
      showSystemMessage(message)
      return
    }

    dispatch({ type: 'composer/submitStarted' })
    try {
      await boardApi.createPost({
        nickname: state.nickname,
        content: state.content,
        images: state.images,
        showImagesInContent: state.showImagesInContent,
        pollOptions: cleanPollOptions.length > 0 ? cleanPollOptions : undefined,
      })
      dispatch({ type: 'composer/resetContent' })
      changePage(1)
      feed.changeFeedSort('latest')
      screen.closeNotificationView()
      screen.closeComposer()
      showSystemMessage('게시글을 등록했습니다.')
      await fetchPosts(false)
    } catch (error) {
      const message = '게시글 등록에 실패했습니다.'
      dispatch({ type: 'error/set', payload: message })
      showSystemMessage(message)
      console.error(error)
    } finally {
      dispatch({ type: 'composer/submitFinished' })
    }
  }

  const handleUpdatePost = async (event: FormEvent, postId: number) => {
    event.preventDefault()
    const draft = state.editingPosts[postId]
    if (!draft?.content.trim()) {
      dispatch({ type: 'error/set', payload: '내용을 입력해주세요.' })
      showSystemMessage('내용을 입력해주세요.')
      return
    }

    dispatch({ type: 'error/clear' })
    try {
      await boardApi.updatePost(postId, {
        nickname: draft.nickname,
        content: draft.content,
        images: draft.images ?? [],
        showImagesInContent: draft.showImagesInContent ?? true,
      })
      dispatch({ type: 'posts/editCanceled', payload: postId })
      showSystemMessage('게시글을 수정했습니다.')
      await fetchPosts(false)
    } catch (error) {
      if (isApiErrorStatus(error, 404)) {
        await recoverFromDeletedPost()
        return
      }
      const message = '내가 작성한 글만 수정할 수 있습니다.'
      dispatch({ type: 'error/set', payload: message })
      showSystemMessage(message)
      console.error(error)
    }
  }

  const handleCreateComment = async (
    event: FormEvent,
    postId: number,
    parentCommentId?: number,
  ) => {
    event.preventDefault()
    const draft = parentCommentId === undefined
      ? state.commentDrafts[postId] ?? { nickname: '', content: '' }
      : state.replyDrafts[parentCommentId] ?? { nickname: '', content: '' }
    if (!draft.content.trim()) {
      showSystemMessage(parentCommentId === undefined
        ? '댓글 내용을 입력해주세요.'
        : '답글 내용을 입력해주세요.')
      return
    }

    dispatch({ type: 'error/clear' })
    try {
      await boardApi.createComment(postId, {
        nickname: draft.nickname,
        content: draft.content,
        parentCommentId: parentCommentId ?? null,
      })
      dispatch(parentCommentId === undefined
        ? { type: 'comments/draftCleared', payload: postId }
        : {
          type: 'comments/replyDraftCleared',
          payload: { postId, commentId: parentCommentId },
        })
      showSystemMessage(parentCommentId === undefined
        ? '댓글을 등록했습니다.'
        : '답글을 등록했습니다.')
      await fetchPosts(false)
    } catch (error) {
      if (isApiErrorStatus(error, 404)) {
        if (getApiErrorMessage(error)?.includes('댓글')) {
          showSystemMessage('답글 대상 댓글이 삭제되었습니다. 댓글을 새로 불러옵니다.')
          await fetchPosts(false)
        } else {
          await recoverFromDeletedPost()
        }
        return
      }
      const message = parentCommentId === undefined
        ? '댓글 등록에 실패했습니다.'
        : '답글 등록에 실패했습니다.'
      dispatch({ type: 'error/set', payload: message })
      showSystemMessage(message)
      console.error(error)
    }
  }

  const handleUpdateComment = async (event: FormEvent, commentId: number) => {
    event.preventDefault()
    const draft = state.editingComments[commentId]
    if (!draft?.content.trim()) {
      dispatch({ type: 'error/set', payload: '댓글 내용을 입력해주세요.' })
      showSystemMessage('댓글 내용을 입력해주세요.')
      return
    }

    dispatch({ type: 'error/clear' })
    try {
      await boardApi.updateComment(commentId, draft)
      dispatch({ type: 'comments/editCanceled', payload: commentId })
      showSystemMessage('댓글을 수정했습니다.')
      await fetchPosts(false)
    } catch (error) {
      if (isApiErrorStatus(error, 404)) {
        dispatch({ type: 'comments/editCanceled', payload: commentId })
        showSystemMessage('댓글이 이미 삭제되었습니다. 목록을 새로 불러옵니다.')
        await fetchPosts(false)
        return
      }
      const message = '내가 작성한 댓글만 수정할 수 있습니다.'
      dispatch({ type: 'error/set', payload: message })
      showSystemMessage(message)
      console.error(error)
    }
  }

  const handleConfirmDelete = async () => {
    if (!state.pendingDelete) return

    dispatch({ type: 'error/clear' })
    try {
      if (state.pendingDelete.target === 'post') {
        await boardApi.deletePost(state.pendingDelete.id)
        dispatch({ type: 'posts/deleted', payload: state.pendingDelete.id })
        if (window.location.hash === `${POST_HASH_PREFIX}${state.pendingDelete.id}`) {
          window.history.replaceState(
            null,
            '',
            window.location.pathname + window.location.search,
          )
        }
        showSystemMessage('게시글을 삭제했습니다.')
        return
      }

      await boardApi.deleteComment(state.pendingDelete.id)
      dispatch({ type: 'delete/canceled' })
      showSystemMessage('댓글을 삭제했습니다.')
      await fetchPosts(false)
    } catch (error) {
      if (isApiErrorStatus(error, 404)) {
        const deletedTarget = state.pendingDelete.target
        dispatch({ type: 'delete/canceled' })
        if (deletedTarget === 'post') {
          await recoverFromDeletedPost()
        } else {
          showSystemMessage('댓글이 이미 삭제되었습니다. 목록을 새로 불러옵니다.')
          await fetchPosts(false)
        }
        return
      }
      const message = state.pendingDelete.target === 'post'
        ? '내가 작성한 글만 삭제할 수 있습니다.'
        : '내가 작성한 댓글만 삭제할 수 있습니다.'
      dispatch({ type: 'error/set', payload: message })
      dispatch({ type: 'delete/canceled' })
      showSystemMessage(message)
      console.error(error)
    }
  }

  useEffect(() => {
    void fetchPosts()
  }, [fetchPosts])

  useEffect(() => {
    if (state.currentPage > feed.pageCount) {
      changePage(feed.pageCount)
    }
  }, [changePage, feed.pageCount, state.currentPage])

  return {
    state,
    dispatch,
    feed,
    screen: {
      ...screen,
      openPostDetail,
    },
    notifications: {
      items: commentNotifications.notifications,
      dismiss: commentNotifications.dismiss,
      openPost: openCommentNotificationPost,
      openList: screen.openNotificationView,
    },
    activity: {
      summary: boardActivity,
      isRefreshing: isActivityRefreshing,
      refresh: refreshBoardActivity,
    },
    images: boardImages,
    actions: {
      fetchPosts,
      handleBoardTitleClick,
      changeFeedSort,
      submitSearch,
      handleComposerChange,
      handleCommentChange,
      handleReplyChange,
      handleTogglePostLike,
      handleVotePollOption,
      handleToggleCommentLike,
      handleSubmit,
      handleUpdatePost,
      handleCreateComment,
      handleUpdateComment,
      handleConfirmDelete,
      generateAiDraft: boardApi.generateAiDraft,
    },
  }
}

export type BoardController = ReturnType<typeof useBoardController>
