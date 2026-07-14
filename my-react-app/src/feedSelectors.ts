import type { Comment, Post } from './boardApi'

export type FeedSort = 'latest' | 'oldest' | 'popular'
export type SearchMode = 'posts' | 'comments'

export interface CommentSearchResult {
  postId: number
  postContent: string
  comment: Comment
}

export function normalizeSearchQuery(query: string) {
  return query.trim().toLocaleLowerCase()
}

export function sortPosts(posts: Post[], sort: FeedSort) {
  return [...posts].sort((first, second) => {
    if (sort === 'oldest') {
      return new Date(first.createdAt).getTime() - new Date(second.createdAt).getTime()
    }
    if (sort === 'popular') {
      if (second.likeCount !== first.likeCount) {
        return second.likeCount - first.likeCount
      }
      return new Date(second.createdAt).getTime() - new Date(first.createdAt).getTime()
    }
    return new Date(second.createdAt).getTime() - new Date(first.createdAt).getTime()
  })
}

export function filterPosts(posts: Post[], query: string, mode: SearchMode) {
  if (!query) return posts
  if (mode === 'comments') return []

  return posts.filter((post) => [post.nickname, post.content]
    .join('\n')
    .toLocaleLowerCase()
    .includes(query))
}

export function findCommentSearchResults(posts: Post[], query: string): CommentSearchResult[] {
  if (!query) return []

  return posts.flatMap((post) => post.comments
    .filter((comment) => [comment.nickname, comment.content]
      .join('\n')
      .toLocaleLowerCase()
      .includes(query))
    .map((comment) => ({
      postId: post.id,
      postContent: post.content,
      comment,
    })))
}

export function paginate<T>(items: T[], currentPage: number, pageSize: number) {
  const startIndex = (currentPage - 1) * pageSize
  return items.slice(startIndex, startIndex + pageSize)
}

export function getPageCount(itemCount: number, pageSize: number) {
  return Math.max(1, Math.ceil(itemCount / pageSize))
}
