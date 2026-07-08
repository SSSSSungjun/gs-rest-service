import type { ChangeEvent, FormEvent } from 'react'
import type { BoardDraft } from '../boardReducer'
import { handleTextareaKeyDown, preventEnterSubmit, resizeTextarea } from '../boardUi'
import { ImageAttachmentFields } from './ImageAttachmentFields'

interface PostEditFormProps {
  postId: number
  draft: BoardDraft
  isUploadingImage: boolean
  onNicknameChange: (postId: number, nickname: string) => void
  onContentChange: (postId: number, content: string) => void
  onAddImageUrl: (postId: number, url: string) => void
  onUploadImages: (postId: number, files: File[]) => void
  onRemoveImage: (postId: number, index: number) => void
  onShowImagesInContentChange: (postId: number, showImagesInContent: boolean) => void
  onSubmit: (event: FormEvent, postId: number) => void
  onCancel: (postId: number) => void
}

export function PostEditForm({
  postId,
  draft,
  isUploadingImage,
  onNicknameChange,
  onContentChange,
  onAddImageUrl,
  onUploadImages,
  onRemoveImage,
  onShowImagesInContentChange,
  onSubmit,
  onCancel,
}: PostEditFormProps) {
  const handleContentChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    onContentChange(postId, event.target.value)
    resizeTextarea(event.currentTarget)
  }

  return (
    <form className="edit-form post-edit-form" onSubmit={(event) => onSubmit(event, postId)} onKeyDown={preventEnterSubmit}>
      <div className="edit-status-row">게시글 수정 중</div>
      <input
        value={draft.nickname}
        onChange={(event) => onNicknameChange(postId, event.target.value)}
        maxLength={40}
        placeholder="익명"
        aria-label="게시글 수정 닉네임"
      />
      <textarea
        value={draft.content}
        onChange={handleContentChange}
        onKeyDown={handleTextareaKeyDown}
        rows={3}
        aria-label="게시글 수정 내용"
      />
      <ImageAttachmentFields
        images={draft.images ?? []}
        showImagesInContent={draft.showImagesInContent ?? true}
        isUploading={isUploadingImage}
        onAddUrl={(url) => onAddImageUrl(postId, url)}
        onUploadFiles={(files) => onUploadImages(postId, files)}
        onRemoveImage={(index) => onRemoveImage(postId, index)}
        onShowImagesInContentChange={(showImagesInContent) => onShowImagesInContentChange(postId, showImagesInContent)}
      />
      <div className="inline-actions">
        <button type="submit" disabled={isUploadingImage}>수정 완료</button>
        <button className="ghost-button" type="button" onClick={() => onCancel(postId)}>취소</button>
      </div>
    </form>
  )
}
