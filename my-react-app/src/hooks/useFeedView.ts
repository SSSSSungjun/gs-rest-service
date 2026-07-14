import { useCallback, useMemo, useState } from 'react'
import type { Post } from '../boardApi'
import { POSTS_PER_PAGE } from '../boardUi'
import {
  filterPosts,
  findCommentSearchResults,
  getPageCount,
  normalizeSearchQuery,
  paginate,
  sortPosts,
} from '../feedSelectors'
import type { FeedSort, SearchMode } from '../feedSelectors'

export function useFeedView(
  posts: Post[],
  currentPage: number,
  onPageChange: (page: number) => void,
) {
  const [feedSort, setFeedSort] = useState<FeedSort>('latest')
  const [searchMode, setSearchMode] = useState<SearchMode>('posts')
  const [appliedSearchMode, setAppliedSearchMode] = useState<SearchMode>('posts')
  const [searchInput, setSearchInput] = useState('')
  const [searchQuery, setSearchQuery] = useState('')

  const normalizedSearchQuery = normalizeSearchQuery(searchQuery)
  const sortedPosts = useMemo(() => sortPosts(posts, feedSort), [feedSort, posts])
  const isCommentSearch = appliedSearchMode === 'comments' && Boolean(normalizedSearchQuery)
  const filteredPosts = useMemo(
    () => filterPosts(sortedPosts, normalizedSearchQuery, appliedSearchMode),
    [appliedSearchMode, normalizedSearchQuery, sortedPosts],
  )
  const commentSearchResults = useMemo(
    () => isCommentSearch ? findCommentSearchResults(sortedPosts, normalizedSearchQuery) : [],
    [isCommentSearch, normalizedSearchQuery, sortedPosts],
  )
  const searchResultCount = isCommentSearch ? commentSearchResults.length : filteredPosts.length
  const pageCount = getPageCount(searchResultCount, POSTS_PER_PAGE)
  const visiblePosts = useMemo(
    () => paginate(filteredPosts, currentPage, POSTS_PER_PAGE),
    [currentPage, filteredPosts],
  )
  const visibleCommentResults = useMemo(
    () => paginate(commentSearchResults, currentPage, POSTS_PER_PAGE),
    [commentSearchResults, currentPage],
  )

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
    searchResultCount,
    pageCount,
    visiblePosts,
    visibleCommentResults,
    setSearchMode,
    setSearchInput,
    changeFeedSort,
    submitSearch,
    resetFeed,
  }
}
