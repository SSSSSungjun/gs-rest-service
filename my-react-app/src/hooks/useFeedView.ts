import { useCallback, useState } from 'react'
import type { CommentSearchResult, Post, PostPageResponse } from '../boardApi'
import { normalizeSearchQuery } from '../feedSelectors'
import type { FeedSort, SearchMode } from '../feedSelectors'

interface ServerPageState {
  commentResults: CommentSearchResult[]
  totalElements: number
  totalPages: number
}

export function useFeedView(
  posts: Post[],
  onPageChange: (page: number) => void,
) {
  const [feedSort, setFeedSort] = useState<FeedSort>('latest')
  const [searchMode, setSearchMode] = useState<SearchMode>('posts')
  const [appliedSearchMode, setAppliedSearchMode] = useState<SearchMode>('posts')
  const [searchInput, setSearchInput] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [serverPage, setServerPage] = useState<ServerPageState>({
    commentResults: [],
    totalElements: 0,
    totalPages: 1,
  })

  const normalizedSearchQuery = normalizeSearchQuery(searchQuery)
  const isCommentSearch = appliedSearchMode === 'comments' && Boolean(normalizedSearchQuery)

  const applyPage = useCallback((response: PostPageResponse) => {
    setServerPage({
      commentResults: response.commentResults,
      totalElements: response.totalElements,
      totalPages: response.totalPages,
    })
  }, [])

  const changeFeedSort = useCallback((nextSort: FeedSort) => {
    setFeedSort(nextSort)
    onPageChange(1)
  }, [onPageChange])

  const submitSearch = useCallback(() => {
    const nextQuery = searchInput.trim()
    setSearchInput(nextQuery)
    setSearchQuery(nextQuery)
    setAppliedSearchMode(searchMode)
    onPageChange(1)
  }, [onPageChange, searchInput, searchMode])

  const resetFeed = useCallback(() => {
    setFeedSort('latest')
    setSearchMode('posts')
    setAppliedSearchMode('posts')
    setSearchInput('')
    setSearchQuery('')
    onPageChange(1)
  }, [onPageChange])

  return {
    feedSort,
    searchMode,
    appliedSearchMode,
    searchInput,
    searchQuery,
    normalizedSearchQuery,
    isCommentSearch,
    searchResultCount: serverPage.totalElements,
    pageCount: serverPage.totalPages,
    visiblePosts: isCommentSearch ? [] : posts,
    visibleCommentResults: isCommentSearch ? serverPage.commentResults : [],
    setSearchMode,
    setSearchInput,
    applyPage,
    changeFeedSort,
    submitSearch,
    resetFeed,
  }
}