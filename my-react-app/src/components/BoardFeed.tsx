import type { FormEvent } from 'react'
import type { BoardController } from '../hooks/useBoardController'
import type { FeedSort, SearchMode } from '../feedSelectors'
import { CommentNotificationList } from './CommentNotificationBar'
import { CommentSearchResults } from './CommentSearchResults'
import { PlusIcon, RefreshCwIcon, SearchIcon } from './Icons'
import { Pagination } from './Pagination'
import { PostDetail } from './PostDetail'
import { PostList } from './PostList'

interface BoardFeedProps {
  controller: BoardController
}

function getFeedLabel(controller: BoardController) {
  const { feed, screen } = controller
  if (screen.isDetailView) return '게시글 상세'
  if (screen.isNotificationView) return '댓글 알림'
  if (feed.isCommentSearch) return '댓글 검색 결과'
  if (feed.normalizedSearchQuery) return '게시글 검색 결과'
  return '전체 글'
}

export function FeedToolbar({ controller }: BoardFeedProps) {
  const { actions, feed, screen, state } = controller
  const showsFeedControls = !screen.isDetailView && !screen.isNotificationView
  const hasActivePostEdit = Object.keys(state.editingPosts).length > 0
  const canCompose = showsFeedControls && !hasActivePostEdit
  const showsContextHeading = screen.isDetailView
    || screen.isNotificationView
    || feed.isCommentSearch
    || Boolean(feed.normalizedSearchQuery)

  const handleSearchSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    actions.submitSearch()
  }

  return (
    <div className={`feed-toolbar ${showsFeedControls ? 'feed-toolbar-list' : ''}`}>
      {showsContextHeading && (
        <div className="feed-toolbar-heading">
          <strong>{getFeedLabel(controller)}</strong>
        </div>
      )}

      {showsFeedControls && (
        <div className="feed-toolbar-controls">
          <div className="feed-sort-tabs" role="group" aria-label="게시글 정렬">
            {([
              ['latest', '최신순'],
              ['oldest', '오래된순'],
              ['popular', '인기순'],
            ] as const).map(([value, label]) => (
              <button
                key={value}
                type="button"
                className={feed.feedSort === value ? 'active' : undefined}
                aria-pressed={feed.feedSort === value}
                onClick={() => actions.changeFeedSort(value as FeedSort)}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="feed-toolbar-actions">
            <form className="feed-search-field" role="search" onSubmit={handleSearchSubmit}>
              <div className="feed-search-control">
                <select
                  className="feed-search-target"
                  value={feed.searchMode}
                  onChange={(event) => feed.setSearchMode(event.target.value as SearchMode)}
                  aria-label="검색 대상"
                >
                  <option value="posts">게시글</option>
                  <option value="comments">댓글</option>
                </select>
                <input
                  value={feed.searchInput}
                  onChange={(event) => feed.setSearchInput(event.target.value)}
                  placeholder="검색어를 입력해 주세요"
                  aria-label={feed.searchMode === 'comments' ? '댓글 검색어' : '게시글 검색어'}
                />
                <button
                  className="feed-search-button"
                  type="submit"
                  aria-label={feed.searchMode === 'comments' ? '댓글 검색 실행' : '게시글 검색 실행'}
                >
                  <SearchIcon />
                </button>
              </div>
            </form>
            <button
              className="refresh-button icon-only-button mobile-refresh-button"
              type="button"
              onClick={() => void actions.fetchPosts(false)}
              disabled={state.isLoading}
              aria-label="게시글 새로고침"
            >
              <RefreshCwIcon />
            </button>
            {canCompose && (
              <button
                className="desktop-compose-button toolbar-compose-button"
                type="button"
                onClick={screen.openComposer}
              >
                <PlusIcon />
                글쓰기
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export function FeedResults({ controller }: BoardFeedProps) {
  const {
    actions,
    dispatch,
    feed,
    images,
    notifications,
    screen,
    state,
  } = controller
  const selectedPost = screen.selectedPost
  const hasVisibleResults = feed.isCommentSearch
    ? feed.visibleCommentResults.length > 0
    : feed.visiblePosts.length > 0

  return (
    <div className="feed-scroll-region">
      {state.isLoading
        && !hasVisibleResults
        && !screen.isDetailView
        && !screen.isNotificationView && (
          <p className="empty-state">게시글을 불러오는 중입니다.</p>
        )}
      {!state.isLoading
        && feed.searchResultCount === 0
        && !screen.isDetailView
        && !screen.isNotificationView && (
          <p className="empty-state">
            {feed.normalizedSearchQuery ? '검색 결과가 없습니다.' : '아직 게시글이 없습니다.'}
          </p>
        )}

      {screen.isNotificationView ? (
        <CommentNotificationList
          notifications={notifications.items}
          onOpenPost={notifications.openPost}
          onDismiss={notifications.dismiss}
          onBack={screen.closeNotificationView}
        />
      ) : selectedPost ? (
        <PostDetail
          post={selectedPost}
          searchQuery={feed.searchQuery}
          searchMode={feed.appliedSearchMode}
          commentDraft={state.commentDrafts[selectedPost.id] ?? { nickname: '', content: '' }}
          replyDrafts={state.replyDrafts}
          activeReplyCommentId={state.replyTargets[selectedPost.id] ?? null}
          postEditDraft={state.editingPosts[selectedPost.id]}
          editingComments={state.editingComments}
          isUploadingImage={images.isUploadingImage}
          onBack={screen.closePostDetail}
          onStartEditPost={(post) => dispatch({ type: 'posts/editStarted', payload: post })}
          onRequestDeletePost={(postId) => dispatch({
            type: 'delete/requested',
            payload: { target: 'post', id: postId },
          })}
          onTogglePostLike={actions.handleTogglePostLike}
          onVotePollOption={actions.handleVotePollOption}
          onPostEditNicknameChange={(postId, nickname) => dispatch({
            type: 'posts/editNicknameChanged',
            payload: { postId, nickname },
          })}
          onPostEditContentChange={(postId, content) => dispatch({
            type: 'posts/editContentChanged',
            payload: { postId, content },
          })}
          onPostEditAddImageUrl={images.addPostEditImageUrl}
          onPostEditUploadImages={images.uploadPostEditImages}
          onPostEditRemoveImage={(postId, index) => dispatch({
            type: 'posts/editImageRemoved',
            payload: { postId, index },
          })}
          onPostEditShowImagesInContentChange={(postId, showImagesInContent) => dispatch({
            type: 'posts/editShowImagesChanged',
            payload: { postId, showImagesInContent },
          })}
          onGenerateAiDraft={actions.generateAiDraft}
          onSubmitPostEdit={actions.handleUpdatePost}
          onCancelPostEdit={(postId) => dispatch({ type: 'posts/editCanceled', payload: postId })}
          onStartEditComment={(comment) => dispatch({ type: 'comments/editStarted', payload: comment })}
          onRequestDeleteComment={(commentId) => dispatch({
            type: 'delete/requested',
            payload: { target: 'comment', id: commentId },
          })}
          onToggleCommentLike={actions.handleToggleCommentLike}
          onCommentEditNicknameChange={(commentId, nickname) => dispatch({
            type: 'comments/editNicknameChanged',
            payload: { commentId, nickname },
          })}
          onCommentEditContentChange={(commentId, content) => dispatch({
            type: 'comments/editContentChanged',
            payload: { commentId, content },
          })}
          onSubmitCommentEdit={actions.handleUpdateComment}
          onCancelCommentEdit={(commentId) => dispatch({
            type: 'comments/editCanceled',
            payload: commentId,
          })}
          onCommentNicknameChange={(postId, nickname) => dispatch({
            type: 'comments/nicknameChanged',
            payload: { postId, nickname },
          })}
          onCommentContentChange={actions.handleCommentChange}
          onSubmitComment={actions.handleCreateComment}
          onStartReply={(postId, commentId) => dispatch({
            type: 'comments/replyStarted',
            payload: { postId, commentId },
          })}
          onCancelReply={(postId, commentId) => dispatch({
            type: 'comments/replyCanceled',
            payload: { postId, commentId },
          })}
          onReplyNicknameChange={(commentId, nickname) => dispatch({
            type: 'comments/replyNicknameChanged',
            payload: { commentId, nickname },
          })}
          onReplyContentChange={actions.handleReplyChange}
          onSubmitReply={actions.handleCreateComment}
        />
      ) : feed.isCommentSearch ? (
        <CommentSearchResults
          results={feed.visibleCommentResults}
          query={feed.searchQuery}
          onOpenPost={screen.openPostDetail}
        />
      ) : (
        <PostList
          posts={feed.visiblePosts}
          searchQuery={feed.appliedSearchMode === 'posts' ? feed.searchQuery : ''}
          editingPosts={state.editingPosts}
          isUploadingImage={images.isUploadingImage}
          onOpenPost={screen.openPostDetail}
          onStartEditPost={(post) => dispatch({ type: 'posts/editStarted', payload: post })}
          onRequestDeletePost={(postId) => dispatch({
            type: 'delete/requested',
            payload: { target: 'post', id: postId },
          })}
          onTogglePostLike={actions.handleTogglePostLike}
          onVotePollOption={actions.handleVotePollOption}
          onPostEditNicknameChange={(postId, nickname) => dispatch({
            type: 'posts/editNicknameChanged',
            payload: { postId, nickname },
          })}
          onPostEditContentChange={(postId, content) => dispatch({
            type: 'posts/editContentChanged',
            payload: { postId, content },
          })}
          onPostEditAddImageUrl={images.addPostEditImageUrl}
          onPostEditUploadImages={images.uploadPostEditImages}
          onPostEditRemoveImage={(postId, index) => dispatch({
            type: 'posts/editImageRemoved',
            payload: { postId, index },
          })}
          onPostEditShowImagesInContentChange={(postId, showImagesInContent) => dispatch({
            type: 'posts/editShowImagesChanged',
            payload: { postId, showImagesInContent },
          })}
          onGenerateAiDraft={actions.generateAiDraft}
          onSubmitPostEdit={actions.handleUpdatePost}
          onCancelPostEdit={(postId) => dispatch({ type: 'posts/editCanceled', payload: postId })}
        />
      )}

      {!screen.isDetailView
        && !screen.isNotificationView
        && !state.isLoading
        && feed.searchResultCount > 0 && (
          <Pagination
            pageCount={feed.pageCount}
            currentPage={state.currentPage}
            onPageChange={(page) => dispatch({ type: 'pagination/pageChanged', payload: page })}
          />
        )}
    </div>
  )
}

export function BoardFeed({ controller }: BoardFeedProps) {
  const { feed, screen } = controller

  return (
    <section
      className="feed"
      aria-label={screen.isDetailView
        ? '게시글 상세'
        : screen.isNotificationView
          ? '댓글 알림'
          : feed.isCommentSearch
            ? '댓글 검색 결과'
            : '게시글 목록'}
    >
      <FeedToolbar controller={controller} />
      <FeedResults controller={controller} />
    </section>
  )
}
