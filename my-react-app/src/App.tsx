import { useCallback, useEffect, useMemo, useReducer, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import './App.css'
import { boardApi } from './boardApi'
import type { PostImage } from './boardApi'
import { boardReducer, initialBoardState } from './boardReducer'
import { getUnreadCommentNotifications, markCommentNotificationsSeen } from './commentNotifications'
import type { CommentNotification } from './commentNotifications'
import { BoardComposer } from './components/BoardComposer'
import { CommentNotificationBar } from './components/CommentNotificationBar'
import { ConfirmDialog } from './components/ConfirmDialog'
import { Pagination } from './components/Pagination'
import { PostDetail } from './components/PostDetail'
import { PostList } from './components/PostList'
import { getPostIdFromHash, isPopularPost, POST_HASH_PREFIX, POSTS_PER_PAGE, resizeTextarea } from './boardUi'

type FeedTab = 'all' | 'popular'

const MAX_IMAGE_COUNT = 10

function App() {
  const [state, dispatch] = useReducer(boardReducer, initialBoardState)
  const [isUploadingImage, setIsUploadingImage] = useState(false)
  const [activeFeedTab, setActiveFeedTab] = useState<FeedTab>('all')
  const [commentNotifications, setCommentNotifications] = useState<CommentNotification[]>([])
  const {
    posts,
    nickname,
    content,
    images,
    showImagesInContent,
    commentDrafts,
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
  const hasActivePostEdit = Object.keys(editingPosts).length > 0
  const popularPosts = useMemo(
    () => posts
      .filter((post) => isPopularPost(post.likeCount))
      .sort((first, second) => {
        if (second.likeCount !== first.likeCount) {
          return second.likeCount - first.likeCount
        }
        return new Date(second.createdAt).getTime() - new Date(first.createdAt).getTime()
      }),
    [posts],
  )
  const activePosts = activeFeedTab === 'popular' ? popularPosts : posts
  const pageCount = Math.max(1, Math.ceil(activePosts.length / POSTS_PER_PAGE))
  const visiblePosts = useMemo(() => {
    const startIndex = (currentPage - 1) * POSTS_PER_PAGE
    return activePosts.slice(startIndex, startIndex + POSTS_PER_PAGE)
  }, [activePosts, currentPage])

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

  const openPostDetail = useCallback((postId: number) => {
    const nextHash = `${POST_HASH_PREFIX}${postId}`
    if (window.location.hash !== nextHash) {
      window.history.pushState({ postId }, '', nextHash)
    }
    dispatch({ type: 'posts/detailOpened', payload: postId })
  }, [])

  const closePostDetail = useCallback(() => {
    if (window.location.hash.startsWith(POST_HASH_PREFIX)) {
      window.history.replaceState(null, '', window.location.pathname + window.location.search)
    }
    dispatch({ type: 'posts/detailClosed' })
  }, [])

  const handleBoardTitleClick = useCallback(() => {
    const isDefaultFeed = !isDetailView && activeFeedTab === 'all' && currentPage === 1
    if (isDefaultFeed) {
      void fetchPosts(false)
      return
    }

    if (window.location.hash.startsWith(POST_HASH_PREFIX)) {
      window.history.replaceState(null, '', window.location.pathname + window.location.search)
    }
    setActiveFeedTab('all')
    dispatch({ type: 'pagination/pageChanged', payload: 1 })
    dispatch({ type: 'posts/detailClosed' })
  }, [activeFeedTab, currentPage, fetchPosts, isDetailView])

  const dismissCommentNotifications = useCallback((commentIds: number[]) => {
    markCommentNotificationsSeen(commentIds)
    setCommentNotifications((currentNotifications) => currentNotifications.filter(
      (notification) => !commentIds.includes(notification.commentId),
    ))
  }, [])

  const openCommentNotificationPost = useCallback((postId: number, commentIds: number[]) => {
    dismissCommentNotifications(commentIds)
    setActiveFeedTab('all')
    openPostDetail(postId)
  }, [dismissCommentNotifications, openPostDetail])

  const changeFeedTab = (nextTab: FeedTab) => {
    setActiveFeedTab(nextTab)
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
      showSystemMessage('좋아요 처리에 실패했습니다.')
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

    dispatch({ type: 'composer/submitStarted' })
    try {
      await boardApi.createPost({ nickname, content, images, showImagesInContent })
      dispatch({ type: 'composer/resetContent' })
      dispatch({ type: 'pagination/pageChanged', payload: 1 })
      setActiveFeedTab('all')
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

  const handleCreateComment = async (event: FormEvent, postId: number) => {
    event.preventDefault()
    const draft = commentDrafts[postId] ?? { nickname: '', content: '' }
    if (!draft.content.trim()) {
      showSystemMessage('댓글 내용을 입력해주세요.')
      return
    }

    dispatch({ type: 'error/clear' })
    try {
      await boardApi.createComment(postId, { nickname: draft.nickname, content: draft.content })
      dispatch({ type: 'comments/draftCleared', payload: postId })
      showSystemMessage('댓글을 등록했습니다.')
      await fetchPosts(false)
    } catch (error) {
      const message = '댓글 등록에 실패했습니다.'
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
      const postId = getPostIdFromHash()
      if (postId === null) {
        dispatch({ type: 'posts/detailClosed' })
        return
      }
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
        onOpenPost={openCommentNotificationPost}
        onDismiss={dismissCommentNotifications}
      />

      <section className="feed" aria-label={isDetailView ? '게시글 상세' : '게시글 목록'}>
        <div className="feed-toolbar">
          <div>
            <strong>{isDetailView ? '게시글 상세' : activeFeedTab === 'popular' ? '인기글' : '전체 글'}</strong>
          </div>
          <button className="refresh-button" type="button" onClick={() => fetchPosts(false)} disabled={isLoading}>
            {isLoading ? '갱신 중' : '갱신하기'}
          </button>
        </div>

        {!isDetailView && (
          <div className="feed-tabs" role="tablist" aria-label="게시글 목록 종류">
            <button
              type="button"
              role="tab"
              aria-selected={activeFeedTab === 'all'}
              className={activeFeedTab === 'all' ? 'active' : undefined}
              onClick={() => changeFeedTab('all')}
            >
              전체글 <span>{posts.length}</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeFeedTab === 'popular'}
              className={activeFeedTab === 'popular' ? 'active' : undefined}
              onClick={() => changeFeedTab('popular')}
            >
              인기글 <span>{popularPosts.length}</span>
            </button>
          </div>
        )}

        <div className="feed-scroll-region">
          {isLoading && posts.length === 0 && <p className="empty-state">게시글을 불러오는 중입니다.</p>}
          {!isLoading && posts.length === 0 && <p className="empty-state">아직 게시글이 없습니다.</p>}
          {!isLoading && posts.length > 0 && activePosts.length === 0 && <p className="empty-state">아직 인기글이 없습니다.</p>}

          {selectedPost ? (
            <PostDetail
              post={selectedPost}
              commentDraft={commentDrafts[selectedPost.id] ?? { nickname: '', content: '' }}
              postEditDraft={editingPosts[selectedPost.id]}
              editingComments={editingComments}
              isUploadingImage={isUploadingImage}
              onBack={closePostDetail}
              onStartEditPost={(post) => dispatch({ type: 'posts/editStarted', payload: post })}
              onRequestDeletePost={(postId) => dispatch({ type: 'delete/requested', payload: { target: 'post', id: postId } })}
              onTogglePostLike={handleTogglePostLike}
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
            />
          ) : (
            <PostList
              posts={visiblePosts}
              editingPosts={editingPosts}
              isUploadingImage={isUploadingImage}
              onOpenPost={openPostDetail}
              onStartEditPost={(post) => dispatch({ type: 'posts/editStarted', payload: post })}
              onRequestDeletePost={(postId) => dispatch({ type: 'delete/requested', payload: { target: 'post', id: postId } })}
              onTogglePostLike={handleTogglePostLike}
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

          {!isDetailView && !isLoading && activePosts.length > 0 && (
            <Pagination
              pageCount={pageCount}
              currentPage={currentPage}
              onPageChange={(page) => dispatch({ type: 'pagination/pageChanged', payload: page })}
            />
          )}
        </div>
      </section>

      {!isDetailView && !hasActivePostEdit && (
        <BoardComposer
          nickname={nickname}
          content={content}
          images={images}
          showImagesInContent={showImagesInContent}
          isSubmitting={isSubmitting}
          isUploadingImage={isUploadingImage}
          errorMessage={errorMessage}
          onNicknameChange={(nextNickname) => dispatch({ type: 'composer/nicknameChanged', payload: nextNickname })}
          onContentChange={handleComposerChange}
          onAddImageUrl={handleAddComposerImageUrl}
          onUploadImages={handleUploadComposerImages}
          onRemoveImage={(index) => dispatch({ type: 'composer/imageRemoved', payload: index })}
          onShowImagesInContentChange={(nextShowImagesInContent) => dispatch({
            type: 'composer/showImagesChanged',
            payload: nextShowImagesInContent,
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
