import { useCallback, useEffect, useMemo, useReducer } from 'react'
import type { ChangeEvent, FormEvent, KeyboardEvent, MouseEvent } from 'react'
import './App.css'
import { boardApi } from './boardApi'
import { boardReducer, initialBoardState } from './boardReducer'

const POSTS_PER_PAGE = 8
const TOAST_DURATION_MS = 2400
const MAX_TEXTAREA_HEIGHT = 220
const POST_HASH_PREFIX = '#post-'

function formatDate(value: string) {
  if (!value) return ''

  return new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

function preventEnterSubmit(event: KeyboardEvent<HTMLFormElement>) {
  if (event.key !== 'Enter') return

  const target = event.target
  if (target instanceof HTMLTextAreaElement) return

  event.preventDefault()
}

function resizeTextarea(element: HTMLTextAreaElement) {
  element.style.height = 'auto'
  element.style.height = `${Math.min(element.scrollHeight, MAX_TEXTAREA_HEIGHT)}px`
}

function getPostIdFromHash() {
  if (!window.location.hash.startsWith(POST_HASH_PREFIX)) return null

  const postId = Number(window.location.hash.replace(POST_HASH_PREFIX, ''))
  return Number.isInteger(postId) && postId > 0 ? postId : null
}

function isInteractiveClick(event: MouseEvent<HTMLElement>) {
  const target = event.target
  return target instanceof Element && target.closest('button, a, input, textarea, details, form') !== null
}

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
  const pageCount = Math.max(1, Math.ceil(posts.length / POSTS_PER_PAGE))
  const visiblePosts = useMemo(() => {
    const startIndex = (currentPage - 1) * POSTS_PER_PAGE
    return posts.slice(startIndex, startIndex + POSTS_PER_PAGE)
  }, [currentPage, posts])

  const showToast = useCallback((message: string, tone: 'success' | 'error') => {
    dispatch({ type: 'toast/show', payload: { message, tone } })
  }, [])

  const openPostDetail = useCallback((postId: number) => {
    const nextHash = `${POST_HASH_PREFIX}${postId}`
    if (window.location.hash !== nextHash) {
      window.history.pushState({ postId }, '', nextHash)
    }
    dispatch({ type: 'posts/detailOpened', payload: postId })
  }, [])

  const closePostDetail = useCallback(() => {
    if (window.location.hash.startsWith(POST_HASH_PREFIX)) {
      window.history.back()
      return
    }
    dispatch({ type: 'posts/detailClosed' })
  }, [])

  const fetchPosts = useCallback(async () => {
    dispatch({ type: 'posts/loadStarted' })
    try {
      const data = await boardApi.getPosts()
      dispatch({ type: 'posts/loadSucceeded', payload: data })
    } catch (error) {
      const message = '게시글을 불러오지 못했습니다.'
      dispatch({ type: 'posts/loadFailed', payload: message })
      showToast(message, 'error')
      console.error(error)
    }
  }, [showToast])

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

  const handlePostCardClick = (event: MouseEvent<HTMLElement>, postId: number) => {
    if (isInteractiveClick(event)) return
    openPostDetail(postId)
  }

  const handleTogglePostLike = async (postId: number) => {
    try {
      await boardApi.togglePostLike(postId)
      await fetchPosts()
    } catch (error) {
      showToast('좋아요 처리에 실패했습니다.', 'error')
      console.error(error)
    }
  }

  const handleToggleCommentLike = async (commentId: number) => {
    try {
      await boardApi.toggleCommentLike(commentId)
      await fetchPosts()
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
      await fetchPosts()
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
      await fetchPosts()
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
      await fetchPosts()
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
      await fetchPosts()
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
      await fetchPosts()
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
        {isLoading && <p className="empty-state">게시글을 불러오는 중입니다.</p>}
        {!isLoading && posts.length === 0 && <p className="empty-state">아직 게시글이 없습니다.</p>}

        {selectedPost ? (() => {
          const post = selectedPost
          const commentDraft = commentDrafts[post.id] ?? { nickname: '', content: '' }
          const postEditDraft = editingPosts[post.id]

          return (
            <article className="post-card detail-card" key={post.id}>
              <div className="detail-toolbar">
                <button className="back-button" type="button" onClick={closePostDetail}>
                  목록
                </button>
              </div>
              <header className="post-header">
                <div>
                  <strong>{post.nickname || '익명'}</strong>
                  <time dateTime={post.createdAt}>{formatDate(post.createdAt)}</time>
                </div>
                {post.ownedByMe && !postEditDraft && (
                  <details className="action-menu">
                    <summary aria-label="게시글 메뉴">⋮</summary>
                    <div className="action-menu-panel">
                      <button onClick={() => dispatch({ type: 'posts/editStarted', payload: post })} type="button">
                        수정
                      </button>
                      <button
                        className="danger-menu-button"
                        onClick={() => dispatch({ type: 'delete/requested', payload: { target: 'post', id: post.id } })}
                        type="button"
                      >
                        삭제
                      </button>
                    </div>
                  </details>
                )}
              </header>

              {postEditDraft ? (
                <form className="edit-form" onSubmit={(event) => handleUpdatePost(event, post.id)} onKeyDown={preventEnterSubmit}>
                  <input
                    value={postEditDraft.nickname}
                    onChange={(event) => dispatch({
                      type: 'posts/editNicknameChanged',
                      payload: { postId: post.id, nickname: event.target.value },
                    })}
                    maxLength={40}
                    placeholder="익명"
                    aria-label="게시글 수정 닉네임"
                  />
                  <textarea
                    value={postEditDraft.content}
                    onChange={(event) => dispatch({
                      type: 'posts/editContentChanged',
                      payload: { postId: post.id, content: event.target.value },
                    })}
                    rows={4}
                    aria-label="게시글 수정 내용"
                  />
                  <div className="inline-actions">
                    <button type="submit">저장</button>
                    <button className="ghost-button" type="button" onClick={() => dispatch({ type: 'posts/editCanceled', payload: post.id })}>
                      취소
                    </button>
                  </div>
                </form>
              ) : (
                <p className="detail-content">{post.content}</p>
              )}

              {!postEditDraft && (
                <div className="post-card-meta-row">
                  <button
                    className={`like-button ${post.likedByMe ? 'active' : ''}`}
                    type="button"
                    aria-pressed={post.likedByMe}
                    onClick={() => handleTogglePostLike(post.id)}
                  >
                    좋아요 {post.likeCount}
                  </button>
                  <span className="meta-pill">댓글 {post.comments.length}</span>
                </div>
              )}

              <div className="comments">
                <div className="comments-title">댓글 {post.comments.length}</div>
                {post.comments.map((comment) => {
                  const commentEditDraft = editingComments[comment.id]

                  return (
                    <div className="comment" key={comment.id}>
                      {commentEditDraft ? (
                        <form className="comment-edit-form" onSubmit={(event) => handleUpdateComment(event, comment.id)} onKeyDown={preventEnterSubmit}>
                          <input
                            value={commentEditDraft.nickname}
                            onChange={(event) => dispatch({
                              type: 'comments/editNicknameChanged',
                              payload: { commentId: comment.id, nickname: event.target.value },
                            })}
                            maxLength={40}
                            placeholder="익명"
                            aria-label="댓글 수정 닉네임"
                          />
                          <textarea
                            value={commentEditDraft.content}
                            onChange={(event) => dispatch({
                              type: 'comments/editContentChanged',
                              payload: { commentId: comment.id, content: event.target.value },
                            })}
                            rows={1}
                            aria-label="댓글 수정 내용"
                          />
                          <div className="inline-actions">
                            <button type="submit">저장</button>
                            <button className="ghost-button" type="button" onClick={() => dispatch({ type: 'comments/editCanceled', payload: comment.id })}>
                              취소
                            </button>
                          </div>
                        </form>
                      ) : (
                        <>
                          <div className="comment-body">
                            <div>
                              <strong>{comment.nickname || '익명'}</strong>
                              <time dateTime={comment.createdAt}>{formatDate(comment.createdAt)}</time>
                              <p>{comment.content}</p>
                            </div>
                            {comment.ownedByMe && (
                              <details className="action-menu compact">
                                <summary aria-label="댓글 메뉴">⋮</summary>
                                <div className="action-menu-panel">
                                  <button onClick={() => dispatch({ type: 'comments/editStarted', payload: comment })} type="button">
                                    수정
                                  </button>
                                  <button
                                    className="danger-menu-button"
                                    onClick={() => dispatch({ type: 'delete/requested', payload: { target: 'comment', id: comment.id } })}
                                    type="button"
                                  >
                                    삭제
                                  </button>
                                </div>
                              </details>
                            )}
                          </div>
                          <button
                            className={`like-button compact-like ${comment.likedByMe ? 'active' : ''}`}
                            type="button"
                            aria-pressed={comment.likedByMe}
                            onClick={() => handleToggleCommentLike(comment.id)}
                          >
                            좋아요 {comment.likeCount}
                          </button>
                        </>
                      )}
                    </div>
                  )
                })}

                <form className="comment-form" onSubmit={(event) => handleCreateComment(event, post.id)} onKeyDown={preventEnterSubmit}>
                  <input
                    className="comment-nickname-input"
                    value={commentDraft.nickname}
                    onChange={(event) => dispatch({
                      type: 'comments/nicknameChanged',
                      payload: { postId: post.id, nickname: event.target.value },
                    })}
                    maxLength={40}
                    placeholder="익명"
                    aria-label="댓글 닉네임"
                  />
                  <textarea
                    value={commentDraft.content}
                    onChange={(event) => handleCommentChange(event, post.id)}
                    rows={1}
                    placeholder="댓글을 남겨보세요"
                    aria-label="댓글 내용"
                  />
                  <button type="submit">등록</button>
                </form>
              </div>
            </article>
          )
        })() : visiblePosts.map((post) => {
          const postEditDraft = editingPosts[post.id]

          return (
            <article
              className={`post-card ${postEditDraft ? '' : 'clickable-card'}`}
              key={post.id}
              onClick={(event) => handlePostCardClick(event, post.id)}
            >
              <header className="post-header">
                <div>
                  <strong>{post.nickname || '익명'}</strong>
                  <time dateTime={post.createdAt}>{formatDate(post.createdAt)}</time>
                </div>
                {post.ownedByMe && !postEditDraft && (
                  <details className="action-menu">
                    <summary aria-label="게시글 메뉴">⋮</summary>
                    <div className="action-menu-panel">
                      <button onClick={() => dispatch({ type: 'posts/editStarted', payload: post })} type="button">
                        수정
                      </button>
                      <button
                        className="danger-menu-button"
                        onClick={() => dispatch({ type: 'delete/requested', payload: { target: 'post', id: post.id } })}
                        type="button"
                      >
                        삭제
                      </button>
                    </div>
                  </details>
                )}
              </header>

              {postEditDraft ? (
                <form className="edit-form" onSubmit={(event) => handleUpdatePost(event, post.id)} onKeyDown={preventEnterSubmit}>
                  <input
                    value={postEditDraft.nickname}
                    onChange={(event) => dispatch({
                      type: 'posts/editNicknameChanged',
                      payload: { postId: post.id, nickname: event.target.value },
                    })}
                    maxLength={40}
                    placeholder="익명"
                    aria-label="게시글 수정 닉네임"
                  />
                  <textarea
                    value={postEditDraft.content}
                    onChange={(event) => dispatch({
                      type: 'posts/editContentChanged',
                      payload: { postId: post.id, content: event.target.value },
                    })}
                    rows={4}
                    aria-label="게시글 수정 내용"
                  />
                  <div className="inline-actions">
                    <button type="submit">저장</button>
                    <button className="ghost-button" type="button" onClick={() => dispatch({ type: 'posts/editCanceled', payload: post.id })}>
                      취소
                    </button>
                  </div>
                </form>
              ) : (
                <div className="post-open-button" aria-label="게시글 상세 보기">
                  <span className="post-content">{post.content}</span>
                </div>
              )}

              {!postEditDraft && (
                <div className="post-card-meta-row">
                  <button
                    className={`like-button ${post.likedByMe ? 'active' : ''}`}
                    type="button"
                    aria-pressed={post.likedByMe}
                    onClick={() => handleTogglePostLike(post.id)}
                  >
                    좋아요 {post.likeCount}
                  </button>
                  <span className="meta-pill">댓글 {post.comments.length}</span>
                </div>
              )}
            </article>
          )
        })}

        {!isDetailView && !isLoading && posts.length > POSTS_PER_PAGE && (
          <nav className="pagination" aria-label="게시글 페이지">
            {Array.from({ length: pageCount }, (_, index) => index + 1).map((page) => (
              <button
                key={page}
                type="button"
                className={page === currentPage ? 'active' : undefined}
                aria-current={page === currentPage ? 'page' : undefined}
                onClick={() => dispatch({ type: 'pagination/pageChanged', payload: page })}
              >
                {page}
              </button>
            ))}
          </nav>
        )}
      </section>

      {!isDetailView && (
        <section className="composer composer-bottom" aria-label="게시글 작성">
          <form onSubmit={handleSubmit} onKeyDown={preventEnterSubmit}>
            <div className="composer-input-panel">
              <input
                className="composer-nickname-input"
                value={nickname}
                onChange={(event) => dispatch({ type: 'composer/nicknameChanged', payload: event.target.value })}
                maxLength={40}
                placeholder="익명"
                aria-label="게시글 닉네임"
              />
              <textarea
                className="composer-textarea"
                value={content}
                onChange={handleComposerChange}
                rows={1}
                placeholder="오늘 나누고 싶은 이야기를 적어주세요."
                aria-label="게시글 내용"
              />
              <button type="submit" disabled={isSubmitting}>{isSubmitting ? '등록 중' : '게시하기'}</button>
            </div>
            {errorMessage && <p className="form-error">{errorMessage}</p>}
          </form>
        </section>
      )}

      {pendingDelete && (
        <div className="modal-backdrop">
          <section className="confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="delete-dialog-title">
            <h2 id="delete-dialog-title">삭제할까요?</h2>
            <p>{pendingDelete.target === 'post' ? '이 글과 댓글이 함께 삭제됩니다.' : '이 댓글을 삭제합니다.'}</p>
            <div className="inline-actions">
              <button className="danger-solid-button" type="button" onClick={handleConfirmDelete}>삭제</button>
              <button className="ghost-button" type="button" onClick={() => dispatch({ type: 'delete/canceled' })}>취소</button>
            </div>
          </section>
        </div>
      )}

      {toast && (
        <div className={`toast toast-${toast.tone}`} role="status" aria-live="polite">
          {toast.message}
        </div>
      )}
    </main>
  )
}

export default App
