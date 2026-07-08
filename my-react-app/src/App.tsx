import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import './App.css'
import { boardApi, type Post } from './boardApi'

type Drafts = Record<number, string>

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
  const [posts, setPosts] = useState<Post[]>([])
  const [nickname, setNickname] = useState('')
  const [content, setContent] = useState('')
  const [commentDrafts, setCommentDrafts] = useState<Drafts>({})
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const totalComments = useMemo(
    () => posts.reduce((total, post) => total + post.comments.length, 0),
    [posts],
  )

  const fetchPosts = async () => {
    try {
      setErrorMessage('')
      const data = await boardApi.getPosts()
      setPosts(data)
    } catch (error) {
      setErrorMessage('게시글을 불러오지 못했습니다.')
      console.error(error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!content.trim()) {
      setErrorMessage('내용을 입력해주세요.')
      return
    }

    try {
      setIsSubmitting(true)
      setErrorMessage('')
      await boardApi.createPost({ nickname, content })
      setContent('')
      await fetchPosts()
    } catch (error) {
      setErrorMessage('게시글 등록에 실패했습니다.')
      console.error(error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeletePost = async (postId: number) => {
    try {
      setErrorMessage('')
      await boardApi.deletePost(postId)
      setPosts((current) => current.filter((post) => post.id !== postId))
    } catch (error) {
      setErrorMessage('내가 작성한 글만 삭제할 수 있습니다.')
      console.error(error)
    }
  }

  const handleCreateComment = async (event: FormEvent, postId: number) => {
    event.preventDefault()
    const draft = commentDrafts[postId] ?? ''
    if (!draft.trim()) return

    try {
      setErrorMessage('')
      await boardApi.createComment(postId, { nickname, content: draft })
      setCommentDrafts((current) => ({ ...current, [postId]: '' }))
      await fetchPosts()
    } catch (error) {
      setErrorMessage('댓글 등록에 실패했습니다.')
      console.error(error)
    }
  }

  const handleDeleteComment = async (commentId: number) => {
    try {
      setErrorMessage('')
      await boardApi.deleteComment(commentId)
      await fetchPosts()
    } catch (error) {
      setErrorMessage('내가 작성한 댓글만 삭제할 수 있습니다.')
      console.error(error)
    }
  }

  useEffect(() => {
    fetchPosts()
  }, [])

  return (
    <main className="board-shell">
      <section className="board-hero" aria-labelledby="board-title">
        <div>
          <p className="eyebrow">Anonymous board</p>
          <h1 id="board-title">사내 익명 게시판</h1>
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
                onChange={(event) => setNickname(event.target.value)}
                maxLength={40}
                placeholder="익명"
              />
            </label>
          </div>
          <label>
            <span>내용</span>
            <textarea
              value={content}
              onChange={(event) => setContent(event.target.value)}
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

        {posts.map((post) => (
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
                  value={commentDrafts[post.id] ?? ''}
                  onChange={(event) => setCommentDrafts((current) => ({ ...current, [post.id]: event.target.value }))}
                  placeholder="댓글을 남겨보세요"
                />
                <button type="submit">등록</button>
              </form>
            </div>
          </article>
        ))}
      </section>
    </main>
  )
}

export default App
