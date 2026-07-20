import type { FormEvent } from 'react'
import type { BoardDraft } from '../boardReducer'
import { BoardComposer } from './BoardComposer'

interface PostEditFormProps {
  postId: number
  draft: BoardDraft
  pollOptionCount: number
  isUploadingImage: boolean
  onNicknameChange: (postId: number, nickname: string) => void
  onContentChange: (postId: number, content: string) => void
  onAddImageUrl: (postId: number, url: string) => void
  onUploadImages: (postId: number, files: File[]) => void
  onRemoveImage: (postId: number, index: number) => void
  onShowImagesInContentChange: (postId: number, showImagesInContent: boolean) => void
  onGenerateAiDraft: (prompt: string, signal: AbortSignal) => Promise<string>
  onSubmit: (event: FormEvent, postId: number) => void
  onCancel: (postId: number) => void
}

export function PostEditForm({
  postId,
  draft,
  pollOptionCount,
  isUploadingImage,
  onNicknameChange,
  onContentChange,
  onAddImageUrl,
  onUploadImages,
  onRemoveImage,
  onShowImagesInContentChange,
  onGenerateAiDraft,
  onSubmit,
  onCancel,
}: PostEditFormProps) {
  return (
    <BoardComposer
      mode="edit"
      preservedPollOptionCount={pollOptionCount}
      isOpen
      nickname={draft.nickname}
      content={draft.content}
      images={draft.images ?? []}
      pollOptions={[]}
      showImagesInContent={draft.showImagesInContent ?? true}
      isSubmitting={false}
      isUploadingImage={isUploadingImage}
      errorMessage=""
      onOpen={() => undefined}
      onClose={() => onCancel(postId)}
      onNicknameChange={(nickname) => onNicknameChange(postId, nickname)}
      onContentChange={(event) => onContentChange(postId, event.target.value)}
      onAddImageUrl={(url) => onAddImageUrl(postId, url)}
      onUploadImages={(files) => onUploadImages(postId, files)}
      onRemoveImage={(index) => onRemoveImage(postId, index)}
      onStartPoll={() => undefined}
      onPollOptionChange={() => undefined}
      onAddPollOption={() => undefined}
      onRemovePollOption={() => undefined}
      onClearPoll={() => undefined}
      onShowImagesInContentChange={(showImagesInContent) => (
        onShowImagesInContentChange(postId, showImagesInContent)
      )}
      onGenerateAiDraft={onGenerateAiDraft}
      onContentApply={(content) => onContentChange(postId, content)}
      onSubmit={(event) => onSubmit(event, postId)}
    />
  )
}