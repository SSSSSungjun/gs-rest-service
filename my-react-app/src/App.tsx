import { useCallback, useEffect, useMemo, useReducer } from 'react'
import type { FormEvent } from 'react'
import './App.css'
import { boardApi } from './boardApi'
import { boardReducer, initialBoardState } from './boardReducer'

function formatDate(value: string) {
  if (!value) return ''

  return new Intl.DateTimeFormat('ko-KR', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

function App() {
  const [state, dispatch] = useReducer(boardReducer, initialBoardState)
  const { posts, nickname, content, commentDrafts, isLoading, isSubmitting, errorMessage } = state

  const totalComments = useMemo(
    () => posts.reduce((total, post) => total + post.comments.length, 0),
    [posts],
  )

  const fetchPosts = useCallback(async () => {
    dispatch({ type: 'posts/loadStarted' })
    try {
      const data = await boardApi.getPosts()
      dispatch({ type: 'posts/loadSucceeded', payload: data })
    } catch (error) {
      dispatch({ type: 'posts/loadFailed', payload: '게시글을 불러오지 못했습니다.' })
      console.error(error)
    }
  }, [])

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!content.trim()) {
      dispatch({ type: 'error/set', payload: '내용을 입력해주세요.' })
      return
    }

    dispatch({ type: 'composer/submitStarted' })
    try {
      await boardApi.createPost({ nickname, content })
      dispatch({ type: 'composer/resetContent' })
      await fetchPosts()
    } catch (error) {
      dispatch({ type: 'error/set', payload: '게시글 등록에 실패했습니다.' })
      console.error(error)
    } finally {
      dispatch({ type: 'composer/submitFinished' })
    }
  }

  const handleDeletePost = async (postId: number) => {
    dispatch({ type: 'error/clear' })
    try {
      await boardApi.deletePost(postId)
      dispatch({ type: 'posts/deleted', payload: postId })
    } catch (error) {
      dispatch({ type: 'error/set', payload: '내가 작성한 글만 삭제할 수 있습니다.' })
      console.error(error)
    }
  }

  const handleCreateComment = async (event: FormEvent, postId: number) => {
    event.preventDefault()
    const draft = commentDrafts[postId] ?? { nickname: '', content: '' }
    if (!draft.content.trim()) return

    dispatch({ type: 'error/clear' })
    try {
      await boardApi.createComment(postId, { nickname: draft.nickname, content: draft.content })
      dispatch({ type: 'comments/draftCleared', payload: postId })
      await fetchPosts()
    } catch (error) {
      dispatch({ type: 'error/set', payload: '댓글 등록에 실패했습니다.' })
      console.error(error)
    }
  }

  const handleDeleteComment = async (commentId: number) => {
    dispatch({ type: 'error/clear' })
    try {
      await boardApi.deleteComment(commentId)
      await fetchPosts()
    } catch (error) {
      dispatch({ type: 'error/set', payload: '내가 작성한 댓글만 삭제할 수 있습니다.' })
      console.error(error)
    }
  }

  useEffect(() => {
    fetchPosts()
  }, [fetchPosts])

  return (
    <main className="board-shell">
      <section className="board-hero" aria-labelledby="board-title">
        <div>
          <p className="eyebrow">Bamboo forest</p>
          <h1 id="board-title">대나무숲</h1>
          <p className="hero-copy">가입 없이 남기고, 내가 쓴 글과 댓글은 이 브라우저에서 바로 삭제할 수 있습니다.</p>
        </div>
        <dl className="board-stats" aria-label="게시판 현황">
          <div>
            <dt>Posts</dt>
            <dd>{posts.length}</dd>
          </div>
          <div>
            <dt>Comments</dt>
            <dd>{totalComments}</dd>
          </div>
        </dl>
      </section>

      <section className="composer" aria-label="게시글 작성">
        <form onSubmit={handleSubmit}>
          <div className="field-row">
            <label>
              <span>닉네임</span>
              <input
                value={nickname}
                onChange={(event) => dispatch({ type: 'composer/nicknameChanged', payload: event.target.value })}
                maxLength={40}
                placeholder="익명"
              />
            </label>
          </div>
          <label>
            <span>내용</span>
            <textarea
              value={content}
              onChange={(event) => dispatch({ type: 'composer/contentChanged', payload: event.target.value })}
              rows={5}
              placeholder="오늘 나누고 싶은 이야기를 적어주세요."
            />
          </label>
          <div className="form-actions">
            {errorMessage && <p className="form-error">{errorMessage}</p>}
            <button type="submit" disabled={isSubmitting}>{isSubmitting ? '등록 중' : '게시하기'}</button>
          </div>
        </form>
      </section>

      <section className="feed" aria-label="게시글 목록">
        {isLoading && <p className="empty-state">게시글을 불러오는 중입니다.</p>}
        {!isLoading && posts.length === 0 && <p className="empty-state">아직 게시글이 없습니다.</p>}

        {posts.map((post) => {
          const commentDraft = commentDrafts[post.id] ?? { nickname: '', content: '' }

          return (
            <article className="post-card" key={post.id}>
              <header className="post-header">
                <div>
                  <strong>{post.nickname || '익명'}</strong>
                  <time dateTime={post.createdAt}>{formatDate(post.createdAt)}</time>
                </div>
                {post.ownedByMe && (
                  <button className="ghost-button" onClick={() => handleDeletePost(post.id)} type="button">
                    삭제
                  </button>
                )}
              </header>

              <p className="post-content">{post.content}</p>

              <div className="comments">
                <div className="comments-title">댓글 {post.comments.length}</div>
                {post.comments.map((comment) => (
                  <div className="comment" key={comment.id}>
                    <div>
                      <strong>{comment.nickname || '익명'}</strong>
                      <time dateTime={comment.createdAt}>{formatDate(comment.createdAt)}</time>
                      <p>{comment.content}</p>
                    </div>
                    {comment.ownedByMe && (
                      <button className="text-button" onClick={() => handleDeleteComment(comment.id)} type="button">
                        삭제
                      </button>
                    )}
                  </div>
                ))}

                <form className="comment-form" onSubmit={(event) => handleCreateComment(event, post.id)}>
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
                  <input
                    value={commentDraft.content}
                    onChange={(event) => dispatch({
                      type: 'comments/contentChanged',
                      payload: { postId: post.id, content: event.target.value },
                    })}
                    placeholder="댓글을 남겨보세요"
                    aria-label="댓글 내용"
                  />
                  <button type="submit">등록</button>
                </form>
              </div>
            </article>
          )
        })}
      </section>
    </main>
  )
}

export default App
