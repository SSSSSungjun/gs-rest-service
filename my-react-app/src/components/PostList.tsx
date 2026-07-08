import type { FormEvent, MouseEvent } from 'react'
import type { Post } from '../boardApi'
import type { BoardDraft } from '../boardReducer'
import { formatDate, isInteractiveClick, wasEdited } from '../boardUi'
import { ActionMenu } from './ActionMenu'
import { PostEditForm } from './PostEditForm'

interface PostListProps {
  posts: Post[]
  editingPosts: Record<number, BoardDraft>
  onOpenPost: (postId: number) => void
  onStartEditPost: (post: Post) => void
  onRequestDeletePost: (postId: number) => void
  onTogglePostLike: (postId: number) => void
  onPostEditNicknameChange: (postId: number, nickname: string) => void
  onPostEditContentChange: (postId: number, content: string) => void
  onSubmitPostEdit: (event: FormEvent, postId: number) => void
  onCancelPostEdit: (postId: number) => void
}

export function PostList({
  posts,
  editingPosts,
  onOpenPost,
  onStartEditPost,
  onRequestDeletePost,
  onTogglePostLike,
  onPostEditNicknameChange,
  onPostEditContentChange,
  onSubmitPostEdit,
  onCancelPostEdit,
}: PostListProps) {
  const handleCardClick = (event: MouseEvent<HTMLElement>, postId: number) => {
    if (isInteractiveClick(event)) return
    onOpenPost(postId)
  }

  return (
    <>
      {posts.map((post) => {
        const postEditDraft = editingPosts[post.id]

        return (
          <article
            className={`post-card ${postEditDraft ? '' : 'clickable-card'}`}
            key={post.id}
            onClick={(event) => handleCardClick(event, post.id)}
          >
            <header className="post-header">
              <div>
                <strong>{post.nickname || '익명'}</strong>
                <time dateTime={post.createdAt}>
                  {formatDate(post.createdAt)}
                  {wasEdited(post.createdAt, post.updatedAt) && <span className="edited-label">(수정됨)</span>}
                </time>
              </div>
              {post.ownedByMe && !postEditDraft && (
                <ActionMenu
                  label="게시글 메뉴"
                  onEdit={() => onStartEditPost(post)}
                  onDelete={() => onRequestDeletePost(post.id)}
                />
              )}
            </header>

            {postEditDraft ? (
              <PostEditForm
                postId={post.id}
                draft={postEditDraft}
                onNicknameChange={onPostEditNicknameChange}
                onContentChange={onPostEditContentChange}
                onSubmit={onSubmitPostEdit}
                onCancel={onCancelPostEdit}
              />
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
                  onClick={() => onTogglePostLike(post.id)}
                >
                  좋아요 {post.likeCount}
                </button>
                <span className="meta-pill">댓글 {post.comments.length}</span>
              </div>
            )}
          </article>
        )
      })}
    </>
  )
}
