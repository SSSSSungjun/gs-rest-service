import { useCallback, useEffect, useMemo, useReducer, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import './App.css'
import './feedSort.css'
import './forumToss.css'
import './search.css'
import { boardApi } from './boardApi'
import { isApiErrorStatus } from './apiClient'
import type { PostImage } from './boardApi'
import { boardReducer, initialBoardState } from './boardReducer'
import { getUnreadCommentNotifications, markCommentNotificationsSeen } from './commentNotifications'
import type { CommentNotification } from './commentNotifications'
import { BoardComposer } from './components/BoardComposer'
import { CommentNotificationBar, CommentNotificationList } from './components/CommentNotificationBar'
import { CommentSearchResults } from './components/CommentSearchResults'
import { ConfirmDialog } from './components/ConfirmDialog'
import { RefreshCwIcon, SearchIcon } from './components/Icons'
import { Pagination } from './components/Pagination'
import { PostDetail } from './components/PostDetail'
import { PostList } from './components/PostList'
import { getPostIdFromHash, POST_HASH_PREFIX, POSTS_PER_PAGE, resizeTextarea } from './boardUi'

type FeedSort = 'latest' | 'oldest' | 'popular'
type SearchMode = 'posts' | 'comments'

const MAX_IMAGE_COUNT = 10
const COMPOSE_HASH = '#compose'

function App() {
  const [state, dispatch] = useReducer(boardReducer, initialBoardState)
  const [isUploadingImage, setIsUploadingImage] = useState(false)
  const [feedSort, setFeedSort] = useState<FeedSort>('latest')
  const [searchMode, setSearchMode] = useState<SearchMode>('posts')
  const [appliedSearchMode, setAppliedSearchMode] = useState<SearchMode>('posts')
  const [searchInput, setSearchInput] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [commentNotifications, setCommentNotifications] = useState<CommentNotification[]>([])
  const [isNotificationViewOpen, setIsNotificationViewOpen] = useState(false)
  const [isComposerViewOpen, setIsComposerViewOpen] = useState(false)
  const {
    posts,
    nickname,
    content,
    images,
    pollOptions,
    showImagesInContent,
    commentDrafts,
    replyDrafts,
    replyTargets,
    editingPosts,
    editingComments,
    expandedPostId,
    pendingDelete,
    currentPage,
    isLoading,
    isSubmitting,
    errorMessage,
  } = state

  const selectedPost = useMemo(
    () => posts.find((post) => post.id === expandedPostId) ?? null,
    [expandedPostId, posts],
  )
  const isDetailView = selectedPost !== null
  const isNotificationView = isNotificationViewOpen && !isDetailView
  const hasActivePostEdit = Object.keys(editingPosts).length > 0
  const sortedPosts = useMemo(() => {
    return [...posts].sort((first, second) => {
      if (feedSort === 'oldest') {
        return new Date(first.createdAt).getTime() - new Date(second.createdAt).getTime()
      }
      if (feedSort === 'popular') {
        if (second.likeCount !== first.likeCount) {
          return second.likeCount - first.likeCount
        }
        return new Date(second.createdAt).getTime() - new Date(first.createdAt).getTime()
      }
      return new Date(second.createdAt).getTime() - new Date(first.createdAt).getTime()
    })
  }, [feedSort, posts])
  const normalizedSearchQuery = searchQuery.trim().toLocaleLowerCase()
  const isCommentSearch = appliedSearchMode === 'comments' && Boolean(normalizedSearchQuery)
  const filteredPosts = useMemo(() => {
    if (!normalizedSearchQuery) return sortedPosts
    if (appliedSearchMode === 'comments') return []

    return sortedPosts.filter((post) => {
      const searchableText = [post.nickname, post.content].join('\n').toLocaleLowerCase()
      return searchableText.includes(normalizedSearchQuery)
    })
  }, [appliedSearchMode, normalizedSearchQuery, sortedPosts])
  const commentSearchResults = useMemo(() => {
    if (!isCommentSearch) return []

    return sortedPosts.flatMap((post) => post.comments
      .filter((comment) => [comment.nickname, comment.content]
        .join('\n')
        .toLocaleLowerCase()
        .includes(normalizedSearchQuery))
      .map((comment) => ({
        postId: post.id,
        postContent: post.content,
        comment,
      })))
  }, [isCommentSearch, normalizedSearchQuery, sortedPosts])
  const searchResultCount = isCommentSearch ? commentSearchResults.length : filteredPosts.length
  const pageCount = Math.max(1, Math.ceil(searchResultCount / POSTS_PER_PAGE))
  const visiblePosts = useMemo(() => {
    const startIndex = (currentPage - 1) * POSTS_PER_PAGE
    return filteredPosts.slice(startIndex, startIndex + POSTS_PER_PAGE)
  }, [currentPage, filteredPosts])
  const visibleCommentResults = useMemo(() => {
    const startIndex = (currentPage - 1) * POSTS_PER_PAGE
    return commentSearchResults.slice(startIndex, startIndex + POSTS_PER_PAGE)
  }, [commentSearchResults, currentPage])

  const showSystemMessage = useCallback((message: string) => {
    window.alert(message)
  }, [])

  const fetchPosts = useCallback(async (showLoading = true) => {
    if (showLoading) {
      dispatch({ type: 'posts/loadStarted' })
    }

    try {
      const data = await boardApi.getPosts()
      dispatch({ type: 'posts/loadSucceeded', payload: data })
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
  }, [showSystemMessage])

  const recoverFromDeletedPost = useCallback(async () => {
    if (window.location.hash.startsWith(POST_HASH_PREFIX)) {
      window.history.replaceState(null, '', window.location.pathname + window.location.search)
    }
    setIsNotificationViewOpen(false)
    dispatch({ type: 'posts/detailClosed' })
    showSystemMessage('게시글이 삭제되었습니다. 목록을 새로 불러옵니다.')
    await fetchPosts(false)
  }, [fetchPosts, showSystemMessage])

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
    const nextHash = `${POST_HASH_PREFIX}${postId}`
    if (window.location.hash !== nextHash) {
      window.history.pushState({ postId }, '', nextHash)
    }
    setIsComposerViewOpen(false)
    setIsNotificationViewOpen(false)
    dispatch({ type: 'posts/detailOpened', payload: postId })
    dispatch({ type: 'posts/viewCountIncremented', payload: postId })
    void recordPostView(postId)
  }, [recordPostView])

  const closePostDetail = useCallback(() => {
    if (window.location.hash.startsWith(POST_HASH_PREFIX)) {
      window.history.replaceState(null, '', window.location.pathname + window.location.search)
    }
    setIsNotificationViewOpen(false)
    dispatch({ type: 'posts/detailClosed' })
  }, [])

  const openComposer = useCallback(() => {
    if (window.location.hash !== COMPOSE_HASH) {
      window.history.pushState({ composer: true }, '', COMPOSE_HASH)
    }
    setIsNotificationViewOpen(false)
    dispatch({ type: 'posts/detailClosed' })
    setIsComposerViewOpen(true)
  }, [])

  const closeComposer = useCallback(() => {
    setIsComposerViewOpen(false)
    if (window.location.hash !== COMPOSE_HASH) return

    if (window.history.state?.composer) {
      window.history.back()
      return
    }
    window.history.replaceState(null, '', window.location.pathname + window.location.search)
  }, [])

  const handleBoardTitleClick = useCallback(() => {
    const isDefaultFeed = !isDetailView && !isNotificationView && feedSort === 'latest'
      && searchMode === 'posts' && appliedSearchMode === 'posts'
      && currentPage === 1 && !searchInput.trim() && !searchQuery.trim()
    if (isDefaultFeed) {
      void fetchPosts(false)
      return
    }

    if (window.location.hash.startsWith(POST_HASH_PREFIX)) {
      window.history.replaceState(null, '', window.location.pathname + window.location.search)
    }
    setFeedSort('latest')
    setSearchMode('posts')
    setAppliedSearchMode('posts')
    setSearchInput('')
    setSearchQuery('')
    setIsNotificationViewOpen(false)
    dispatch({ type: 'pagination/pageChanged', payload: 1 })
    dispatch({ type: 'posts/detailClosed' })
  }, [appliedSearchMode, currentPage, feedSort, fetchPosts, isDetailView, isNotificationView, searchInput, searchMode, searchQuery])

  const dismissCommentNotifications = useCallback((commentIds: number[]) => {
    markCommentNotificationsSeen(commentIds)
    setCommentNotifications((currentNotifications) => currentNotifications.filter(
      (notification) => !commentIds.includes(notification.commentId),
    ))
  }, [])

  const openCommentNotificationPost = useCallback((postId: number, commentIds: number[]) => {
    dismissCommentNotifications(commentIds)
    setFeedSort('latest')
    setIsNotificationViewOpen(false)
    openPostDetail(postId)
  }, [dismissCommentNotifications, openPostDetail])

  const openCommentNotificationList = useCallback(() => {
    if (window.location.hash.startsWith(POST_HASH_PREFIX)) {
      window.history.replaceState(null, '', window.location.pathname + window.location.search)
    }
    dispatch({ type: 'posts/detailClosed' })
    setIsNotificationViewOpen(true)
  }, [])

  const changeFeedSort = (nextSort: FeedSort) => {
    setFeedSort(nextSort)
    setIsNotificationViewOpen(false)
    dispatch({ type: 'pagination/pageChanged', payload: 1 })
  }

  const handleSearchModeChange = (event: ChangeEvent<HTMLSelectElement>) => {
    setSearchMode(event.target.value as SearchMode)
  }

  const handleSearchQueryChange = (event: ChangeEvent<HTMLInputElement>) => {
    setSearchInput(event.target.value)
  }

  const handleSearchSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const nextQuery = searchInput.trim()
    setSearchInput(nextQuery)
    setSearchQuery(nextQuery)
    setAppliedSearchMode(searchMode)
    setIsNotificationViewOpen(false)
    dispatch({ type: 'pagination/pageChanged', payload: 1 })
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

  const ensureCanAddImages = (currentCount: number, nextCount: number) => {
    if (currentCount + nextCount > MAX_IMAGE_COUNT) {
      showSystemMessage('이미지는 최대 10장까지 첨부할 수 있습니다.')
      return false
    }
    return true
  }

  const createUrlImage = (url: string): PostImage | null => {
    try {
      const parsedUrl = new URL(url)
      if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
        showSystemMessage('이미지 URL은 http 또는 https로 시작해야 합니다.')
        return null
      }
      return { sourceType: 'URL', url: parsedUrl.toString(), originalFilename: null }
    } catch {
      showSystemMessage('이미지 URL 형식이 올바르지 않습니다.')
      return null
    }
  }

  const getCleanPollOptions = () => pollOptions
    .map((option) => option.trim())
    .filter(Boolean)

  const handleAddComposerImageUrl = (url: string) => {
    if (!ensureCanAddImages(images.length, 1)) return
    const image = createUrlImage(url)
    if (image) {
      dispatch({ type: 'composer/imageAdded', payload: image })
    }
  }

  const handleUploadComposerImages = async (files: File[]) => {
    if (!ensureCanAddImages(images.length, files.length)) return
    setIsUploadingImage(true)
    try {
      for (const file of files) {
        const image = await boardApi.uploadPostImage(file)
        dispatch({ type: 'composer/imageAdded', payload: image })
      }
    } catch (error) {
      showSystemMessage('이미지 업로드에 실패했습니다.')
      console.error(error)
    } finally {
      setIsUploadingImage(false)
    }
  }

  const handleAddPostEditImageUrl = (postId: number, url: string) => {
    const currentImages = editingPosts[postId]?.images ?? []
    if (!ensureCanAddImages(currentImages.length, 1)) return
    const image = createUrlImage(url)
    if (image) {
      dispatch({ type: 'posts/editImageAdded', payload: { postId, image } })
    }
  }

  const handleUploadPostEditImages = async (postId: number, files: File[]) => {
    const currentImages = editingPosts[postId]?.images ?? []
    if (!ensureCanAddImages(currentImages.length, files.length)) return
    setIsUploadingImage(true)
    try {
      for (const file of files) {
        const image = await boardApi.uploadPostImage(file)
        dispatch({ type: 'posts/editImageAdded', payload: { postId, image } })
      }
    } catch (error) {
      showSystemMessage('이미지 업로드에 실패했습니다.')
      console.error(error)
    } finally {
      setIsUploadingImage(false)
    }
  }

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
      showSystemMessage('댓글 좋아요 처리에 실패했습니다.')
      console.error(error)
    }
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!content.trim()) {
      dispatch({ type: 'error/set', payload: '내용을 입력해주세요.' })
      showSystemMessage('내용을 입력해주세요.')
      return
    }

    const cleanPollOptions = getCleanPollOptions()
    if (pollOptions.length > 0 && cleanPollOptions.length < 2) {
      const message = '투표 선택지는 2개 이상 입력해주세요.'
      dispatch({ type: 'error/set', payload: message })
      showSystemMessage(message)
      return
    }

    dispatch({ type: 'composer/submitStarted' })
    try {
      await boardApi.createPost({
        nickname,
        content,
        images,
        showImagesInContent,
        pollOptions: cleanPollOptions.length > 0 ? cleanPollOptions : undefined,
      })
      dispatch({ type: 'composer/resetContent' })
      dispatch({ type: 'pagination/pageChanged', payload: 1 })
      setFeedSort('latest')
      setIsNotificationViewOpen(false)
      closeComposer()
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
    const draft = editingPosts[postId]
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
      const message = '내가 작성한 글만 수정할 수 있습니다.'
      dispatch({ type: 'error/set', payload: message })
      showSystemMessage(message)
      console.error(error)
    }
  }

  const handleCreateComment = async (event: FormEvent, postId: number, parentCommentId?: number) => {
    event.preventDefault()
    const draft = parentCommentId === undefined
      ? commentDrafts[postId] ?? { nickname: '', content: '' }
      : replyDrafts[parentCommentId] ?? { nickname: '', content: '' }
    if (!draft.content.trim()) {
      showSystemMessage(parentCommentId === undefined ? '댓글 내용을 입력해주세요.' : '답글 내용을 입력해주세요.')
      return
    }

    dispatch({ type: 'error/clear' })
    try {
      await boardApi.createComment(postId, {
        nickname: draft.nickname,
        content: draft.content,
        parentCommentId: parentCommentId ?? null,
      })
      if (parentCommentId === undefined) {
        dispatch({ type: 'comments/draftCleared', payload: postId })
      } else {
        dispatch({ type: 'comments/replyDraftCleared', payload: { postId, commentId: parentCommentId } })
      }
      showSystemMessage(parentCommentId === undefined ? '댓글을 등록했습니다.' : '답글을 등록했습니다.')
      await fetchPosts(false)
    } catch (error) {
      if (isApiErrorStatus(error, 404)) {
        await recoverFromDeletedPost()
        return
      }
      const message = parentCommentId === undefined ? '댓글 등록에 실패했습니다.' : '답글 등록에 실패했습니다.'
      dispatch({ type: 'error/set', payload: message })
      showSystemMessage(message)
      console.error(error)
    }
  }

  const handleUpdateComment = async (event: FormEvent, commentId: number) => {
    event.preventDefault()
    const draft = editingComments[commentId]
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
      const message = '내가 작성한 댓글만 수정할 수 있습니다.'
      dispatch({ type: 'error/set', payload: message })
      showSystemMessage(message)
      console.error(error)
    }
  }

  const handleConfirmDelete = async () => {
    if (!pendingDelete) return

    dispatch({ type: 'error/clear' })
    try {
      if (pendingDelete.target === 'post') {
        await boardApi.deletePost(pendingDelete.id)
        dispatch({ type: 'posts/deleted', payload: pendingDelete.id })
        if (window.location.hash === `${POST_HASH_PREFIX}${pendingDelete.id}`) {
          window.history.replaceState(null, '', window.location.pathname + window.location.search)
        }
        showSystemMessage('게시글을 삭제했습니다.')
        return
      }

      await boardApi.deleteComment(pendingDelete.id)
      dispatch({ type: 'delete/canceled' })
      showSystemMessage('댓글을 삭제했습니다.')
      await fetchPosts(false)
    } catch (error) {
      const message = pendingDelete.target === 'post'
        ? '내가 작성한 글만 삭제할 수 있습니다.'
        : '내가 작성한 댓글만 삭제할 수 있습니다.'
      dispatch({ type: 'error/set', payload: message })
      dispatch({ type: 'delete/canceled' })
      showSystemMessage(message)
      console.error(error)
    }
  }

  useEffect(() => {
    fetchPosts()
  }, [fetchPosts])

  useEffect(() => {
    if (posts.length === 0) {
      setCommentNotifications([])
      return
    }
    setCommentNotifications(getUnreadCommentNotifications(posts))
  }, [posts])

  useEffect(() => {
    const syncDetailFromHash = () => {
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

    syncDetailFromHash()
    window.addEventListener('popstate', syncDetailFromHash)
    return () => window.removeEventListener('popstate', syncDetailFromHash)
  }, [])

  useEffect(() => {
    if (currentPage > pageCount) {
      dispatch({ type: 'pagination/pageChanged', payload: pageCount })
    }
  }, [currentPage, pageCount])

  return (
    <main className="board-shell">
      <section className="board-hero" aria-labelledby="board-title">
        <div>
          <p className="eyebrow">Bamboo forest</p>
          <h1 id="board-title">
            <button className="board-title-button" type="button" onClick={handleBoardTitleClick} disabled={isLoading}>
              대나무숲
            </button>
          </h1>
          <p className="hero-copy">가입 없이 남기고, 내가 쓴 글과 댓글은 이 브라우저에서 바로 삭제할 수 있습니다.</p>
        </div>
      </section>

      <CommentNotificationBar
        notifications={commentNotifications}
        onOpenList={openCommentNotificationList}
      />

      <section
        className="feed"
        aria-label={isDetailView
          ? '게시글 상세'
          : isNotificationView
            ? '댓글 알림'
            : isCommentSearch
              ? '댓글 검색 결과'
              : '게시글 목록'}
      >
        <div className="feed-toolbar">
          <div>
            <strong>
              {isDetailView
                ? '게시글 상세'
                : isNotificationView
                  ? '댓글 알림'
                  : isCommentSearch
                    ? '댓글 검색 결과'
                    : normalizedSearchQuery
                      ? '게시글 검색 결과'
                      : '전체 글'}
            </strong>
          </div>
          <div className="feed-toolbar-actions">
            {!isDetailView && !isNotificationView && (
              <form className="feed-search-field" role="search" onSubmit={handleSearchSubmit}>
                <span>검색</span>
                <div className="feed-search-control">
                  <select
                    className="feed-search-target"
                    value={searchMode}
                    onChange={handleSearchModeChange}
                    aria-label="검색 대상"
                  >
                    <option value="posts">게시글</option>
                    <option value="comments">댓글</option>
                  </select>
                  <input
                    value={searchInput}
                    onChange={handleSearchQueryChange}
                    placeholder="검색어"
                    aria-label={searchMode === 'comments' ? '댓글 검색어' : '게시글 검색어'}
                  />
                  <button
                    className="feed-search-button"
                    type="submit"
                    aria-label={searchMode === 'comments' ? '댓글 검색 실행' : '게시글 검색 실행'}
                  >
                    <SearchIcon />
                  </button>
                </div>
              </form>
            )}
            {!isDetailView && !isNotificationView && (
              <label className="feed-sort-select">
                <span>정렬</span>
                <select value={feedSort} onChange={(event) => changeFeedSort(event.target.value as FeedSort)}>
                  <option value="latest">최신순</option>
                  <option value="oldest">오래된순</option>
                  <option value="popular">인기순</option>
                </select>
              </label>
            )}
            <button className="refresh-button icon-only-button" type="button" onClick={() => fetchPosts(false)} disabled={isLoading} aria-label="게시글 새로고침">
              <RefreshCwIcon />
            </button>
          </div>
        </div>

        <div className="feed-scroll-region">
          {isLoading && posts.length === 0 && <p className="empty-state">게시글을 불러오는 중입니다.</p>}
          {!isLoading && posts.length === 0 && <p className="empty-state">아직 게시글이 없습니다.</p>}
          {!isLoading && posts.length > 0 && searchResultCount === 0 && !isDetailView && !isNotificationView && (
            <p className="empty-state">검색 결과가 없습니다.</p>
          )}

          {isNotificationView ? (
            <CommentNotificationList
              notifications={commentNotifications}
              onOpenPost={openCommentNotificationPost}
              onDismiss={dismissCommentNotifications}
              onBack={() => setIsNotificationViewOpen(false)}
            />
          ) : selectedPost ? (
            <PostDetail
              post={selectedPost}
              searchQuery={searchQuery}
              searchMode={appliedSearchMode}
              commentDraft={commentDrafts[selectedPost.id] ?? { nickname: '', content: '' }}
              replyDrafts={replyDrafts}
              activeReplyCommentId={replyTargets[selectedPost.id] ?? null}
              postEditDraft={editingPosts[selectedPost.id]}
              editingComments={editingComments}
              isUploadingImage={isUploadingImage}
              onBack={closePostDetail}
              onStartEditPost={(post) => dispatch({ type: 'posts/editStarted', payload: post })}
              onRequestDeletePost={(postId) => dispatch({ type: 'delete/requested', payload: { target: 'post', id: postId } })}
              onTogglePostLike={handleTogglePostLike}
              onVotePollOption={handleVotePollOption}
              onPostEditNicknameChange={(postId, nextNickname) => dispatch({
                type: 'posts/editNicknameChanged',
                payload: { postId, nickname: nextNickname },
              })}
              onPostEditContentChange={(postId, nextContent) => dispatch({
                type: 'posts/editContentChanged',
                payload: { postId, content: nextContent },
              })}
              onPostEditAddImageUrl={handleAddPostEditImageUrl}
              onPostEditUploadImages={handleUploadPostEditImages}
              onPostEditRemoveImage={(postId, index) => dispatch({
                type: 'posts/editImageRemoved',
                payload: { postId, index },
              })}
              onPostEditShowImagesInContentChange={(postId, nextShowImagesInContent) => dispatch({
                type: 'posts/editShowImagesChanged',
                payload: { postId, showImagesInContent: nextShowImagesInContent },
              })}
              onSubmitPostEdit={handleUpdatePost}
              onCancelPostEdit={(postId) => dispatch({ type: 'posts/editCanceled', payload: postId })}
              onStartEditComment={(comment) => dispatch({ type: 'comments/editStarted', payload: comment })}
              onRequestDeleteComment={(commentId) => dispatch({ type: 'delete/requested', payload: { target: 'comment', id: commentId } })}
              onToggleCommentLike={handleToggleCommentLike}
              onCommentEditNicknameChange={(commentId, nextNickname) => dispatch({
                type: 'comments/editNicknameChanged',
                payload: { commentId, nickname: nextNickname },
              })}
              onCommentEditContentChange={(commentId, nextContent) => dispatch({
                type: 'comments/editContentChanged',
                payload: { commentId, content: nextContent },
              })}
              onSubmitCommentEdit={handleUpdateComment}
              onCancelCommentEdit={(commentId) => dispatch({ type: 'comments/editCanceled', payload: commentId })}
              onCommentNicknameChange={(postId, nextNickname) => dispatch({
                type: 'comments/nicknameChanged',
                payload: { postId, nickname: nextNickname },
              })}
              onCommentContentChange={handleCommentChange}
              onSubmitComment={handleCreateComment}
              onStartReply={(postId, commentId) => dispatch({
                type: 'comments/replyStarted',
                payload: { postId, commentId },
              })}
              onCancelReply={(postId, commentId) => dispatch({
                type: 'comments/replyCanceled',
                payload: { postId, commentId },
              })}
              onReplyNicknameChange={(commentId, nextNickname) => dispatch({
                type: 'comments/replyNicknameChanged',
                payload: { commentId, nickname: nextNickname },
              })}
              onReplyContentChange={handleReplyChange}
              onSubmitReply={handleCreateComment}
            />
          ) : isCommentSearch ? (
            <CommentSearchResults
              results={visibleCommentResults}
              query={searchQuery}
              onOpenPost={openPostDetail}
            />
          ) : (
            <PostList
              posts={visiblePosts}
              searchQuery={appliedSearchMode === 'posts' ? searchQuery : ''}
              editingPosts={editingPosts}
              isUploadingImage={isUploadingImage}
              onOpenPost={openPostDetail}
              onStartEditPost={(post) => dispatch({ type: 'posts/editStarted', payload: post })}
              onRequestDeletePost={(postId) => dispatch({ type: 'delete/requested', payload: { target: 'post', id: postId } })}
              onTogglePostLike={handleTogglePostLike}
              onVotePollOption={handleVotePollOption}
              onPostEditNicknameChange={(postId, nextNickname) => dispatch({
                type: 'posts/editNicknameChanged',
                payload: { postId, nickname: nextNickname },
              })}
              onPostEditContentChange={(postId, nextContent) => dispatch({
                type: 'posts/editContentChanged',
                payload: { postId, content: nextContent },
              })}
              onPostEditAddImageUrl={handleAddPostEditImageUrl}
              onPostEditUploadImages={handleUploadPostEditImages}
              onPostEditRemoveImage={(postId, index) => dispatch({
                type: 'posts/editImageRemoved',
                payload: { postId, index },
              })}
              onPostEditShowImagesInContentChange={(postId, nextShowImagesInContent) => dispatch({
                type: 'posts/editShowImagesChanged',
                payload: { postId, showImagesInContent: nextShowImagesInContent },
              })}
              onSubmitPostEdit={handleUpdatePost}
              onCancelPostEdit={(postId) => dispatch({ type: 'posts/editCanceled', payload: postId })}
            />
          )}

          {!isDetailView && !isNotificationView && !isLoading && searchResultCount > 0 && (
            <Pagination
              pageCount={pageCount}
              currentPage={currentPage}
              onPageChange={(page) => dispatch({ type: 'pagination/pageChanged', payload: page })}
            />
          )}
        </div>
      </section>

      {!isDetailView && !isNotificationView && !hasActivePostEdit && (
        <BoardComposer
          isOpen={isComposerViewOpen}
          nickname={nickname}
          content={content}
          images={images}
          pollOptions={pollOptions}
          showImagesInContent={showImagesInContent}
          isSubmitting={isSubmitting}
          isUploadingImage={isUploadingImage}
          errorMessage={errorMessage}
          onOpen={openComposer}
          onClose={closeComposer}
          onNicknameChange={(nextNickname) => dispatch({ type: 'composer/nicknameChanged', payload: nextNickname })}
          onContentChange={handleComposerChange}
          onAddImageUrl={handleAddComposerImageUrl}
          onUploadImages={handleUploadComposerImages}
          onRemoveImage={(index) => dispatch({ type: 'composer/imageRemoved', payload: index })}
          onStartPoll={() => dispatch({ type: 'composer/pollStarted' })}
          onPollOptionChange={(index, nextContent) => dispatch({
            type: 'composer/pollOptionChanged',
            payload: { index, content: nextContent },
          })}
          onAddPollOption={() => dispatch({ type: 'composer/pollOptionAdded' })}
          onRemovePollOption={(index) => dispatch({ type: 'composer/pollOptionRemoved', payload: index })}
          onClearPoll={() => dispatch({ type: 'composer/pollCleared' })}
          onShowImagesInContentChange={(nextShowImagesInContent) => dispatch({
            type: 'composer/showImagesChanged',
            payload: nextShowImagesInContent,
          })}
          onGenerateAiDraft={(prompt, signal) => boardApi.generateAiDraft(prompt, signal)}
          onApplyAiDraft={(nextContent) => dispatch({
            type: 'composer/contentChanged',
            payload: nextContent,
          })}
          onSubmit={handleSubmit}
        />
      )}

      <ConfirmDialog
        pendingDelete={pendingDelete}
        onConfirm={handleConfirmDelete}
        onCancel={() => dispatch({ type: 'delete/canceled' })}
      />
    </main>
  )
}

export default App