import type { FormEvent, MouseEvent } from 'react'
import type { Post } from '../boardApi'
import type { BoardDraft } from '../boardReducer'
import { formatDate, isInteractiveClick, isPopularPost, wasEdited } from '../boardUi'
import { ActionMenu } from './ActionMenu'
import { HeartIcon, MessageCircleIcon } from './Icons'
import { HighlightedText } from './HighlightedText'
import { PollBlock } from './PollBlock'
import { PostEditForm } from './PostEditForm'
import { PostImageGallery } from './PostImageGallery'

const AVATAR_TOKENS = ['🌱', '🍀', '🌿', '🍃', '🌼', '🎋']

function getAvatarToken(postId: number, nickname: string) {
  const nicknameHash = Array.from(nickname || '익명').reduce(
    (hash, character) => ((hash * 31) + (character.codePointAt(0) ?? 0)) | 0,
    0,
  )
  const tokenIndex = Math.abs(nicknameHash + (postId * 17)) % AVATAR_TOKENS.length

  return {
    symbol: AVATAR_TOKENS[tokenIndex],
    tone: tokenIndex + 1,
  }
}

interface PostListProps {
  posts: Post[]
  searchQuery: string
  editingPosts: Record<number, BoardDraft>
  isUploadingImage: boolean
  onOpenPost: (postId: number) => void
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
  onGenerateAiDraft: (prompt: string, signal: AbortSignal) => Promise<string>
  onSubmitPostEdit: (event: FormEvent, postId: number) => void
  onCancelPostEdit: (postId: number) => void
}

export function PostList({
  posts,
  searchQuery,
  editingPosts,
  isUploadingImage,
  onOpenPost,
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
  onGenerateAiDraft,
  onSubmitPostEdit,
  onCancelPostEdit,
}: PostListProps) {
  const handleCardClick = (event: MouseEvent<HTMLElement>, postId: number) => {
    if (isInteractiveClick(event)) return
    onOpenPost(postId)
  }

  return (
    <div className="post-list">
      {posts.map((post) => {
        const postEditDraft = editingPosts[post.id]
        const postImages = post.images ?? []
        const pollOptions = post.pollOptions ?? []
        const isPopular = isPopularPost(post.likeCount)
        const avatarToken = getAvatarToken(post.id, post.nickname)

        return (
          <article
            className={`post-card ${postEditDraft ? '' : 'clickable-card'} ${isPopular ? 'popular-post' : ''}`}
            key={post.id}
            onClick={(event) => handleCardClick(event, post.id)}
          >
            <header className="post-header post-list-header">
              <div className="post-author-row">
                <span
                  className={`post-avatar post-avatar-tone-${avatarToken.tone}`}
                  aria-hidden="true"
                >
                  {avatarToken.symbol}
                </span>
                <div className="post-list-heading">
                  <div className="post-title-row">
                    {isPopular && <span className="popular-badge">인기</span>}
                    <strong><HighlightedText text={post.nickname || '익명'} query={searchQuery} /></strong>
                  </div>
                  <div className="post-author-meta-row">
                    <time dateTime={post.createdAt}>
                      {formatDate(post.createdAt)}
                      {wasEdited(post.createdAt, post.updatedAt) && <span className="edited-label">(수정됨)</span>}
                    </time>
                    {postImages.length > 0 && (
                      <span className="post-image-count">· 사진 {postImages.length}개</span>
                    )}
                  </div>
                </div>
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
                pollOptionCount={pollOptions.length}
                isUploadingImage={isUploadingImage}
                onNicknameChange={onPostEditNicknameChange}
                onContentChange={onPostEditContentChange}
                onAddImageUrl={onPostEditAddImageUrl}
                onUploadImages={onPostEditUploadImages}
                onRemoveImage={onPostEditRemoveImage}
                onShowImagesInContentChange={onPostEditShowImagesInContentChange}
                onGenerateAiDraft={onGenerateAiDraft}
                onSubmit={onSubmitPostEdit}
                onCancel={onCancelPostEdit}
              />
            ) : (
              <>
                <div className={`post-list-preview ${postImages.length > 0 ? 'has-images' : ''}`} aria-label="게시글 상세 보기">
                  {postImages.length > 0 && <PostImageGallery images={postImages} variant="list" />}
                  <span className="post-content"><HighlightedText text={post.content} query={searchQuery} /></span>
                </div>
                {pollOptions.length > 0 && (
                  <PollBlock
                    postId={post.id}
                    options={pollOptions}
                    totalVoteCount={post.pollTotalVoteCount ?? 0}
                    variant="list"
                    onVote={onVotePollOption}
                  />
                )}
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
                  <span className="meta-pill comment-count" aria-label={`댓글 ${post.comments.length}개`}>
                    <MessageCircleIcon />
                    {post.comments.length}
                  </span>
                </div>
              </>
            )}
          </article>
        )
      })}
    </div>
  )
}