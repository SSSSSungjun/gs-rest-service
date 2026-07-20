import type { BoardController } from '../hooks/useBoardController'
import { BoardComposer } from './BoardComposer'
import { BoardFeed } from './BoardFeed'
import { CommentNotificationBar } from './CommentNotificationBar'
import { ConfirmDialog } from './ConfirmDialog'

interface BoardPageProps {
  controller: BoardController
}

export function BoardPage({ controller }: BoardPageProps) {
  const {
    actions,
    dispatch,
    images,
    notifications,
    screen,
    state,
  } = controller
  const hasActivePostEdit = Object.keys(state.editingPosts).length > 0
  const canCompose = !screen.isDetailView && !screen.isNotificationView && !hasActivePostEdit

  return (
    <main className="board-shell">
      <header className="board-hero" aria-labelledby="board-title">
        <div className="board-hero-inner">
          <h1 id="board-title">
            <button
              className="board-title-button"
              type="button"
              onClick={actions.handleBoardTitleClick}
              disabled={state.isLoading}
            >
              대나무숲
            </button>
          </h1>
          <div className="board-header-actions">
            <CommentNotificationBar
              notifications={notifications.items}
              onOpenList={notifications.openList}
            />
          </div>
        </div>
      </header>

      {canCompose && (
        <BoardComposer
          isOpen={screen.isComposerViewOpen}
          nickname={state.nickname}
          content={state.content}
          images={state.images}
          pollOptions={state.pollOptions}
          showImagesInContent={state.showImagesInContent}
          isSubmitting={state.isSubmitting}
          isUploadingImage={images.isUploadingImage}
          errorMessage={state.errorMessage}
          onOpen={screen.openComposer}
          onClose={screen.closeComposer}
          onNicknameChange={(nickname) => dispatch({
            type: 'composer/nicknameChanged',
            payload: nickname,
          })}
          onContentChange={actions.handleComposerChange}
          onAddImageUrl={images.addComposerImageUrl}
          onUploadImages={images.uploadComposerImages}
          onRemoveImage={(index) => dispatch({ type: 'composer/imageRemoved', payload: index })}
          onStartPoll={() => dispatch({ type: 'composer/pollStarted' })}
          onPollOptionChange={(index, content) => dispatch({
            type: 'composer/pollOptionChanged',
            payload: { index, content },
          })}
          onAddPollOption={() => dispatch({ type: 'composer/pollOptionAdded' })}
          onRemovePollOption={(index) => dispatch({
            type: 'composer/pollOptionRemoved',
            payload: index,
          })}
          onClearPoll={() => dispatch({ type: 'composer/pollCleared' })}
          onShowImagesInContentChange={(showImagesInContent) => dispatch({
            type: 'composer/showImagesChanged',
            payload: showImagesInContent,
          })}
          onGenerateAiDraft={actions.generateAiDraft}
          onContentApply={(content) => dispatch({
            type: 'composer/contentChanged',
            payload: content,
          })}
          onSubmit={actions.handleSubmit}
        />
      )}

      <BoardFeed controller={controller} />

      <ConfirmDialog
        pendingDelete={state.pendingDelete}
        onConfirm={actions.handleConfirmDelete}
        onCancel={() => dispatch({ type: 'delete/canceled' })}
      />
    </main>
  )
}