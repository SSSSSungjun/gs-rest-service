import type { ChangeEvent, FormEvent } from 'react'
import type { Post } from '../boardApi'
import type { BoardDraft } from '../boardReducer'
import { formatDate, handleTextareaKeyDown, isPopularPost, preventEnterSubmit, wasEdited } from '../boardUi'
import { ActionMenu } from './ActionMenu'
import { CommentEditForm } from './CommentEditForm'
import { ArrowLeftIcon, BarChart3Icon, EyeIcon, HeartIcon, ImageIcon, MessageCircleIcon, ReplyIcon } from './Icons'
import { HighlightedText } from './HighlightedText'
import { PollBlock } from './PollBlock'
import { PostEditForm } from './PostEditForm'
import { PostImageGallery } from './PostImageGallery'
import './PostDetail.css'

interface PostDetailProps {
  post: Post
  searchQuery: string
  commentDraft: BoardDraft
  replyDrafts: Record<number, BoardDraft>
  activeReplyCommentId: number | null
  postEditDraft?: BoardDraft
  editingComments: Record<number, BoardDraft>
  isUploadingImage: boolean
  onBack: () => void
  onStartEditPost: (post: Post) => void
  onRequestDeletePost: (postId: number) => void
  onTogglePostLike: (postId: number) => void
  onVotePollOption: (postId: number, optionId: number) => void
  onPostEditNicknameChange: (postId: number, nickname: string) => void
  onPostEditContentChange: (postId: number, content: string) => void
  onPostEditAddImageUrl: (postId: number, url: string) => void
  onPostEditUploadImages: (postId: number, files: File[]) => void
  onPostEditRemoveImage: (postId: number, index: number) => void
  onPostEditShowImagesInContentChange: (postId: number, showImagesInContent: boolean) => void
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
  onStartReply: (postId: number, commentId: number) => void
  onCancelReply: (postId: number, commentId: number) => void
  onReplyNicknameChange: (commentId: number, nickname: string) => void
  onReplyContentChange: (event: ChangeEvent<HTMLTextAreaElement>, commentId: number) => void
  onSubmitReply: (event: FormEvent, postId: number, parentCommentId: number) => void
}

export function PostDetail({
  post,
  searchQuery,
  commentDraft,
  replyDrafts,
  activeReplyCommentId,
  postEditDraft,
  editingComments,
  isUploadingImage,
  onBack,
  onStartEditPost,
  onRequestDeletePost,
  onTogglePostLike,
  onVotePollOption,
  onPostEditNicknameChange,
  onPostEditContentChange,
  onPostEditAddImageUrl,
  onPostEditUploadImages,
  onPostEditRemoveImage,
  onPostEditShowImagesInContentChange,
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
  onStartReply,
  onCancelReply,
  onReplyNicknameChange,
  onReplyContentChange,
  onSubmitReply,
}: PostDetailProps) {
  const postImages = post.images ?? []
  const pollOptions = post.pollOptions ?? []
  const isPopular = isPopularPost(post.likeCount)

  return (
    <article className={`post-card detail-card ${isPopular ? 'popular-post' : ''}`} key={post.id}>
      <div className="detail-toolbar">
        <button className="back-button icon-text-button" type="button" onClick={onBack}><ArrowLeftIcon />목록</button>
      </div>
      <header className="post-header">
        <div>
          <div className="post-title-row">
            <strong><HighlightedText text={post.nickname || '익명'} query={searchQuery} /></strong>
            {isPopular && <span className="popular-badge">인기</span>}
          </div>
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
          isUploadingImage={isUploadingImage}
          onNicknameChange={onPostEditNicknameChange}
          onContentChange={onPostEditContentChange}
          onAddImageUrl={onPostEditAddImageUrl}
          onUploadImages={onPostEditUploadImages}
          onRemoveImage={onPostEditRemoveImage}
          onShowImagesInContentChange={onPostEditShowImagesInContentChange}
          onSubmit={onSubmitPostEdit}
          onCancel={onCancelPostEdit}
        />
      ) : (
        <>
          <p className="detail-content"><HighlightedText text={post.content} query={searchQuery} /></p>
          {post.showImagesInContent && <PostImageGallery images={postImages} variant="detail" />}
          {pollOptions.length > 0 && (
            <PollBlock
              postId={post.id}
              options={pollOptions}
              totalVoteCount={post.pollTotalVoteCount ?? 0}
              variant="detail"
              onVote={onVotePollOption}
            />
          )}
        </>
      )}

      {!postEditDraft && (
        <div className="post-card-meta-row">
          <button
            className={`like-button ${post.likedByMe ? 'active' : ''}`}
            type="button"
            aria-label={`좋아요 ${post.likeCount}개`}
            aria-pressed={post.likedByMe}
            onClick={() => onTogglePostLike(post.id)}
          >
            <HeartIcon /> {post.likeCount}
          </button>
          <span className="meta-pill" aria-label={`조회수 ${post.viewCount ?? 0}회`}><EyeIcon /> {post.viewCount ?? 0}</span>
          <span className="meta-pill" aria-label={`댓글 ${post.comments.length}개`}><MessageCircleIcon /> {post.comments.length}</span>
          {postImages.length > 0 && (
            <span className="meta-pill" aria-label={`사진 ${postImages.length}장`}><ImageIcon /> {postImages.length}</span>
          )}
          {pollOptions.length > 0 && (
            <span className="meta-pill" aria-label={`투표 ${post.pollTotalVoteCount ?? 0}표`}><BarChart3Icon /> {post.pollTotalVoteCount ?? 0}</span>
          )}
        </div>
      )}

      <div className="comments">
        <div className="comments-title">댓글 {post.comments.length}</div>

        {post.comments.map((comment) => {
          const commentEditDraft = editingComments[comment.id]
          const replyDraft = replyDrafts[comment.id] ?? { nickname: '', content: '' }
          const isReply = comment.parentCommentId !== null && comment.parentCommentId !== undefined
          const replyToNickname = comment.replyToNickname || '삭제된 댓글'

          return (
            <div className={`comment ${isReply ? 'reply-comment' : ''}`} key={comment.id}>
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
                      <time dateTime={comment.createdAt}>
                        {formatDate(comment.createdAt)}
                        {wasEdited(comment.createdAt, comment.updatedAt) && <span className="edited-label">(수정됨)</span>}
                      </time>
                      {isReply && <span className="reply-target-label">@{replyToNickname}에게</span>}
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
                  <div className="comment-action-row">
                    <button
                      className={`like-button compact-like ${comment.likedByMe ? 'active' : ''}`}
                      type="button"
                      aria-label={`댓글 좋아요 ${comment.likeCount}개`}
                      aria-pressed={comment.likedByMe}
                      onClick={() => onToggleCommentLike(comment.id)}
                    >
                      <HeartIcon /> {comment.likeCount}
                    </button>
                    <button
                      className="text-button reply-button icon-text-button"
                      type="button"
                      onClick={() => onStartReply(post.id, comment.id)}
                    >
                      <ReplyIcon />답글
                    </button>
                  </div>
                  {activeReplyCommentId === comment.id && (
                    <form
                      className="comment-form reply-form"
                      onSubmit={(event) => onSubmitReply(event, post.id, comment.id)}
                      onKeyDown={preventEnterSubmit}
                    >
                      <input
                        className="comment-nickname-input"
                        value={replyDraft.nickname}
                        onChange={(event) => onReplyNicknameChange(comment.id, event.target.value)}
                        maxLength={40}
                        placeholder="익명"
                        aria-label="답글 닉네임"
                      />
                      <textarea
                        value={replyDraft.content}
                        onChange={(event) => onReplyContentChange(event, comment.id)}
                        onKeyDown={handleTextareaKeyDown}
                        rows={1}
                        placeholder={`${comment.nickname || '익명'}에게 답글`}
                        aria-label="답글 내용"
                      />
                      <div className="reply-form-actions">
                        <button type="submit">등록</button>
                        <button className="ghost-button" type="button" onClick={() => onCancelReply(post.id, comment.id)}>취소</button>
                      </div>
                    </form>
                  )}
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
            onKeyDown={handleTextareaKeyDown}
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
