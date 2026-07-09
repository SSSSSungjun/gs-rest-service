import type { FormEvent, MouseEvent } from 'react'
import type { Post } from '../boardApi'
import type { BoardDraft } from '../boardReducer'
import { formatDate, isInteractiveClick, isPopularPost, wasEdited } from '../boardUi'
import { ActionMenu } from './ActionMenu'
import { PostEditForm } from './PostEditForm'
import { PostImageGallery } from './PostImageGallery'

interface PostListProps {
  posts: Post[]
  editingPosts: Record<number, BoardDraft>
  isUploadingImage: boolean
  onOpenPost: (postId: number) => void
  onStartEditPost: (post: Post) => void
  onRequestDeletePost: (postId: number) => void
  onTogglePostLike: (postId: number) => void
  onPostEditNicknameChange: (postId: number, nickname: string) => void
  onPostEditContentChange: (postId: number, content: string) => void
  onPostEditAddImageUrl: (postId: number, url: string) => void
  onPostEditUploadImages: (postId: number, files: File[]) => void
  onPostEditRemoveImage: (postId: number, index: number) => void
  onPostEditShowImagesInContentChange: (postId: number, showImagesInContent: boolean) => void
  onSubmitPostEdit: (event: FormEvent, postId: number) => void
  onCancelPostEdit: (postId: number) => void
}

export function PostList({
  posts,
  editingPosts,
  isUploadingImage,
  onOpenPost,
  onStartEditPost,
  onRequestDeletePost,
  onTogglePostLike,
  onPostEditNicknameChange,
  onPostEditContentChange,
  onPostEditAddImageUrl,
  onPostEditUploadImages,
  onPostEditRemoveImage,
  onPostEditShowImagesInContentChange,
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
        const postImages = post.images ?? []
        const isPopular = isPopularPost(post.likeCount)

        return (
          <article
            className={`post-card ${postEditDraft ? '' : 'clickable-card'} ${isPopular ? 'popular-post' : ''}`}
            key={post.id}
            onClick={(event) => handleCardClick(event, post.id)}
          >
            <header className="post-header">
              <div>
                <div className="post-title-row">
                  <strong>{post.nickname || '익명'}</strong>
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
              <div className={`post-list-preview ${postImages.length > 0 ? 'has-images' : ''}`} aria-label="게시글 상세 보기">
                {postImages.length > 0 && <PostImageGallery images={postImages} variant="list" />}
                <div className="post-list-copy">
                  <span className="post-content">{post.content}</span>
                  <div className="post-card-meta-row">
                    <button
                      className={`like-button ${post.likedByMe ? 'active' : ''}`}
                      type="button"
                      aria-label={`좋아요 ${post.likeCount}개`}
                      aria-pressed={post.likedByMe}
                      onClick={() => onTogglePostLike(post.id)}
                    >
                      좋아요 {post.likeCount}
                    </button>
                    <span className="meta-pill" aria-label={`댓글 ${post.comments.length}개`}>댓글 {post.comments.length}</span>
                    {postImages.length > 0 && (
                      <span className="meta-pill" aria-label={`사진 ${postImages.length}장`}>사진 {postImages.length}</span>
                    )}
                  </div>
                </div>
              </div>
            )}
          </article>
        )
      })}
    </>
  )
}
