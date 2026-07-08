import type { ChangeEvent, FormEvent } from 'react'
import type { Post } from '../boardApi'
import type { BoardDraft } from '../boardReducer'
import { formatDate, preventEnterSubmit } from '../boardUi'
import { ActionMenu } from './ActionMenu'
import { CommentEditForm } from './CommentEditForm'
import { PostEditForm } from './PostEditForm'

interface PostDetailProps {
  post: Post
  commentDraft: BoardDraft
  postEditDraft?: BoardDraft
  editingComments: Record<number, BoardDraft>
  onBack: () => void
  onStartEditPost: (post: Post) => void
  onRequestDeletePost: (postId: number) => void
  onTogglePostLike: (postId: number) => void
  onPostEditNicknameChange: (postId: number, nickname: string) => void
  onPostEditContentChange: (postId: number, content: string) => void
  onSubmitPostEdit: (event: FormEvent, postId: number) => void
  onCancelPostEdit: (postId: number) => void
  onStartEditComment: (comment: Post['comments'][number]) => void
  onRequestDeleteComment: (commentId: number) => void
  onToggleCommentLike: (commentId: number) => void
  onCommentEditNicknameChange: (commentId: number, nickname: string) => void
  onCommentEditContentChange: (commentId: number, content: string) => void
  onSubmitCommentEdit: (event: FormEvent, commentId: number) => void
  onCancelCommentEdit: (commentId: number) => void
  onCommentNicknameChange: (postId: number, nickname: string) => void
  onCommentContentChange: (event: ChangeEvent<HTMLTextAreaElement>, postId: number) => void
  onSubmitComment: (event: FormEvent, postId: number) => void
}

export function PostDetail({
  post,
  commentDraft,
  postEditDraft,
  editingComments,
  onBack,
  onStartEditPost,
  onRequestDeletePost,
  onTogglePostLike,
  onPostEditNicknameChange,
  onPostEditContentChange,
  onSubmitPostEdit,
  onCancelPostEdit,
  onStartEditComment,
  onRequestDeleteComment,
  onToggleCommentLike,
  onCommentEditNicknameChange,
  onCommentEditContentChange,
  onSubmitCommentEdit,
  onCancelCommentEdit,
  onCommentNicknameChange,
  onCommentContentChange,
  onSubmitComment,
}: PostDetailProps) {
  return (
    <article className="post-card detail-card" key={post.id}>
      <div className="detail-toolbar">
        <button className="back-button" type="button" onClick={onBack}>목록</button>
      </div>
      <header className="post-header">
        <div>
          <strong>{post.nickname || '익명'}</strong>
          <time dateTime={post.createdAt}>{formatDate(post.createdAt)}</time>
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
        <p className="detail-content">{post.content}</p>
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

      <div className="comments">
        <div className="comments-title">댓글 {post.comments.length}</div>
        {post.comments.map((comment) => {
          const commentEditDraft = editingComments[comment.id]

          return (
            <div className="comment" key={comment.id}>
              {commentEditDraft ? (
                <CommentEditForm
                  commentId={comment.id}
                  draft={commentEditDraft}
                  onNicknameChange={onCommentEditNicknameChange}
                  onContentChange={onCommentEditContentChange}
                  onSubmit={onSubmitCommentEdit}
                  onCancel={onCancelCommentEdit}
                />
              ) : (
                <>
                  <div className="comment-body">
                    <div>
                      <strong>{comment.nickname || '익명'}</strong>
                      <time dateTime={comment.createdAt}>{formatDate(comment.createdAt)}</time>
                      <p>{comment.content}</p>
                    </div>
                    {comment.ownedByMe && (
                      <ActionMenu
                        label="댓글 메뉴"
                        onEdit={() => onStartEditComment(comment)}
                        onDelete={() => onRequestDeleteComment(comment.id)}
                      />
                    )}
                  </div>
                  <button
                    className={`like-button compact-like ${comment.likedByMe ? 'active' : ''}`}
                    type="button"
                    aria-pressed={comment.likedByMe}
                    onClick={() => onToggleCommentLike(comment.id)}
                  >
                    좋아요 {comment.likeCount}
                  </button>
                </>
              )}
            </div>
          )
        })}

        <form className="comment-form" onSubmit={(event) => onSubmitComment(event, post.id)} onKeyDown={preventEnterSubmit}>
          <input
            className="comment-nickname-input"
            value={commentDraft.nickname}
            onChange={(event) => onCommentNicknameChange(post.id, event.target.value)}
            maxLength={40}
            placeholder="익명"
            aria-label="댓글 닉네임"
          />
          <textarea
            value={commentDraft.content}
            onChange={(event) => onCommentContentChange(event, post.id)}
            rows={1}
            placeholder="댓글을 남겨보세요"
            aria-label="댓글 내용"
          />
          <button type="submit">등록</button>
        </form>
      </div>
    </article>
  )
}
