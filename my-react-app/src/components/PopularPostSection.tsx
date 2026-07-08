import type { Post } from '../boardApi'
import { POPULAR_POST_LIKE_THRESHOLD } from '../boardUi'
import { PostImageGallery } from './PostImageGallery'

interface PopularPostSectionProps {
  posts: Post[]
  onOpenPost: (postId: number) => void
}

export function PopularPostSection({ posts, onOpenPost }: PopularPostSectionProps) {
  if (posts.length === 0) return null

  return (
    <section className="popular-section" aria-labelledby="popular-posts-title">
      <div className="section-heading-row">
        <div>
          <h2 id="popular-posts-title">인기글</h2>
          <p>좋아요 {POPULAR_POST_LIKE_THRESHOLD}개 이상 받은 글</p>
        </div>
      </div>
      <div className="popular-post-grid">
        {posts.map((post) => {
          const postImages = post.images ?? []

          return (
            <button className="popular-post-card" type="button" key={post.id} onClick={() => onOpenPost(post.id)}>
              <span className="popular-badge">인기글</span>
              <strong>{post.nickname || '익명'}</strong>
              <span className="popular-post-content">{post.content}</span>
              <PostImageGallery images={postImages} variant="list" />
              <span className="popular-post-meta">좋아요 {post.likeCount} · 댓글 {post.comments.length}</span>
            </button>
          )
        })}
      </div>
    </section>
  )
}
