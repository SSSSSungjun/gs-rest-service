import type { Comment } from '../boardApi'
import { formatDate, wasEdited } from '../boardUi'
import { HighlightedText } from './HighlightedText'

export interface CommentSearchResult {
  postId: number
  postContent: string
  comment: Comment
}

interface CommentSearchResultsProps {
  results: CommentSearchResult[]
  query: string
  onOpenPost: (postId: number) => void
}

function makePostPreview(content: string) {
  const compactContent = content.trim().replace(/\s+/g, ' ')
  if (compactContent.length <= 80) return compactContent
  return `${compactContent.slice(0, 80)}...`
}

export function CommentSearchResults({ results, query, onOpenPost }: CommentSearchResultsProps) {
  return (
    <div className="comment-search-results" aria-label="댓글 검색 결과">
      {results.map(({ postId, postContent, comment }) => (
        <article className="comment-search-result" key={comment.id}>
          <button
            className="comment-search-result-button"
            type="button"
            onClick={() => onOpenPost(postId)}
          >
            <div className="comment-search-meta">
              <strong><HighlightedText text={comment.nickname || '익명'} query={query} /></strong>
              <time dateTime={comment.createdAt}>
                {formatDate(comment.createdAt)}
                {wasEdited(comment.createdAt, comment.updatedAt) && <span className="edited-label">(수정됨)</span>}
              </time>
            </div>
            <div className="comment-search-content">
              <HighlightedText text={comment.content} query={query} />
            </div>
            <div className="comment-search-origin">
              <span>원문</span>{makePostPreview(postContent)}
            </div>
          </button>
        </article>
      ))}
    </div>
  )
}
