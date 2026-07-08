import { useCallback, useEffect, useMemo, useReducer } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import './App.css'
import { boardApi } from './boardApi'
import { boardReducer, initialBoardState } from './boardReducer'
import { BoardComposer } from './components/BoardComposer'
import { ConfirmDialog } from './components/ConfirmDialog'
import { Pagination } from './components/Pagination'
import { PostDetail } from './components/PostDetail'
import { PostList } from './components/PostList'
import { Toast } from './components/Toast'
import { getPostIdFromHash, POST_HASH_PREFIX, POSTS_PER_PAGE, resizeTextarea, TOAST_DURATION_MS } from './boardUi'

function App() {
  const [state, dispatch] = useReducer(boardReducer, initialBoardState)
  const {
    posts,
    nickname,
    content,
    commentDrafts,
    editingPosts,
    editingComments,
    expandedPostId,
    pendingDelete,
    toast,
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
  const pageCount = Math.max(1, Math.ceil(posts.length / POSTS_PER_PAGE))
  const visiblePosts = useMemo(() => {
    const startIndex = (currentPage - 1) * POSTS_PER_PAGE
    return posts.slice(startIndex, startIndex + POSTS_PER_PAGE)
  }, [currentPage, posts])

  const showToast = useCallback((message: string, tone: 'success' | 'error') => {
    dispatch({ type: 'toast/show', payload: { message, tone } })
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
      showToast(message, 'error')
      console.error(error)
    }
  }, [showToast])

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

  const handleTogglePostLike = async (postId: number) => {
    try {
      await boardApi.togglePostLike(postId)
      await fetchPosts(false)
    } catch (error) {
      showToast('좋아요 처리에 실패했습니다.', 'error')
      console.error(error)
    }
  }

  const handleToggleCommentLike = async (commentId: number) => {
    try {
      await boardApi.toggleCommentLike(commentId)
      await fetchPosts(false)
    } catch (error) {
      showToast('댓글 좋아요 처리에 실패했습니다.', 'error')
      console.error(error)
    }
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!content.trim()) {
      dispatch({ type: 'error/set', payload: '내용을 입력해주세요.' })
      showToast('내용을 입력해주세요.', 'error')
      return
    }

    dispatch({ type: 'composer/submitStarted' })
    try {
      await boardApi.createPost({ nickname, content })
      dispatch({ type: 'composer/resetContent' })
      dispatch({ type: 'pagination/pageChanged', payload: 1 })
      showToast('게시글을 등록했습니다.', 'success')
      await fetchPosts(false)
    } catch (error) {
      const message = '게시글 등록에 실패했습니다.'
      dispatch({ type: 'error/set', payload: message })
      showToast(message, 'error')
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
      showToast('내용을 입력해주세요.', 'error')
      return
    }

    dispatch({ type: 'error/clear' })
    try {
      await boardApi.updatePost(postId, draft)
      dispatch({ type: 'posts/editCanceled', payload: postId })
      showToast('게시글을 수정했습니다.', 'success')
      await fetchPosts(false)
    } catch (error) {
      const message = '내가 작성한 글만 수정할 수 있습니다.'
      dispatch({ type: 'error/set', payload: message })
      showToast(message, 'error')
      console.error(error)
    }
  }

  const handleCreateComment = async (event: FormEvent, postId: number) => {
    event.preventDefault()
    const draft = commentDrafts[postId] ?? { nickname: '', content: '' }
    if (!draft.content.trim()) {
      showToast('댓글 내용을 입력해주세요.', 'error')
      return
    }

    dispatch({ type: 'error/clear' })
    try {
      await boardApi.createComment(postId, { nickname: draft.nickname, content: draft.content })
      dispatch({ type: 'comments/draftCleared', payload: postId })
      showToast('댓글을 등록했습니다.', 'success')
      await fetchPosts(false)
    } catch (error) {
      const message = '댓글 등록에 실패했습니다.'
      dispatch({ type: 'error/set', payload: message })
      showToast(message, 'error')
      console.error(error)
    }
  }

  const handleUpdateComment = async (event: FormEvent, commentId: number) => {
    event.preventDefault()
    const draft = editingComments[commentId]
    if (!draft?.content.trim()) {
      dispatch({ type: 'error/set', payload: '댓글 내용을 입력해주세요.' })
      showToast('댓글 내용을 입력해주세요.', 'error')
      return
    }

    dispatch({ type: 'error/clear' })
    try {
      await boardApi.updateComment(commentId, draft)
      dispatch({ type: 'comments/editCanceled', payload: commentId })
      showToast('댓글을 수정했습니다.', 'success')
      await fetchPosts(false)
    } catch (error) {
      const message = '내가 작성한 댓글만 수정할 수 있습니다.'
      dispatch({ type: 'error/set', payload: message })
      showToast(message, 'error')
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
        showToast('게시글을 삭제했습니다.', 'success')
        return
      }

      await boardApi.deleteComment(pendingDelete.id)
      dispatch({ type: 'delete/canceled' })
      showToast('댓글을 삭제했습니다.', 'success')
      await fetchPosts(false)
    } catch (error) {
      const message = pendingDelete.target === 'post'
        ? '내가 작성한 글만 삭제할 수 있습니다.'
        : '내가 작성한 댓글만 삭제할 수 있습니다.'
      dispatch({ type: 'error/set', payload: message })
      dispatch({ type: 'delete/canceled' })
      showToast(message, 'error')
      console.error(error)
    }
  }

  useEffect(() => {
    fetchPosts()
  }, [fetchPosts])

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

  useEffect(() => {
    if (!toast) return undefined

    const timeoutId = window.setTimeout(() => {
      dispatch({ type: 'toast/hidden' })
    }, TOAST_DURATION_MS)

    return () => window.clearTimeout(timeoutId)
  }, [toast])

  return (
    <main className="board-shell">
      <section className="board-hero" aria-labelledby="board-title">
        <div>
          <p className="eyebrow">Bamboo forest</p>
          <h1 id="board-title">대나무숲</h1>
          <p className="hero-copy">가입 없이 남기고, 내가 쓴 글과 댓글은 이 브라우저에서 바로 삭제할 수 있습니다.</p>
        </div>
      </section>

      <section className="feed" aria-label={isDetailView ? '게시글 상세' : '게시글 목록'}>
        {isLoading && posts.length === 0 && <p className="empty-state">게시글을 불러오는 중입니다.</p>}
        {!isLoading && posts.length === 0 && <p className="empty-state">아직 게시글이 없습니다.</p>}

        {selectedPost ? (
          <PostDetail
            post={selectedPost}
            commentDraft={commentDrafts[selectedPost.id] ?? { nickname: '', content: '' }}
            postEditDraft={editingPosts[selectedPost.id]}
            editingComments={editingComments}
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
            onSubmitPostEdit={handleUpdatePost}
            onCancelPostEdit={(postId) => dispatch({ type: 'posts/editCanceled', payload: postId })}
          />
        )}

        {!isDetailView && !isLoading && posts.length > POSTS_PER_PAGE && (
          <Pagination
            pageCount={pageCount}
            currentPage={currentPage}
            onPageChange={(page) => dispatch({ type: 'pagination/pageChanged', payload: page })}
          />
        )}
      </section>

      {!isDetailView && !hasActivePostEdit && (
        <BoardComposer
          nickname={nickname}
          content={content}
          isSubmitting={isSubmitting}
          errorMessage={errorMessage}
          onNicknameChange={(nextNickname) => dispatch({ type: 'composer/nicknameChanged', payload: nextNickname })}
          onContentChange={handleComposerChange}
          onSubmit={handleSubmit}
        />
      )}

      <ConfirmDialog
        pendingDelete={pendingDelete}
        onConfirm={handleConfirmDelete}
        onCancel={() => dispatch({ type: 'delete/canceled' })}
      />
      <Toast toast={toast} />
    </main>
  )
}

export default App
