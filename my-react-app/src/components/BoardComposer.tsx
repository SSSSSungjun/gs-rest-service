import type { ChangeEvent, FormEvent } from 'react'
import type { PostImage } from '../boardApi'
import { handleTextareaKeyDown, preventEnterSubmit } from '../boardUi'
import { ImageAttachmentFields } from './ImageAttachmentFields'

interface BoardComposerProps {
  nickname: string
  content: string
  images: PostImage[]
  showImagesInContent: boolean
  isSubmitting: boolean
  isUploadingImage: boolean
  errorMessage: string
  onNicknameChange: (nickname: string) => void
  onContentChange: (event: ChangeEvent<HTMLTextAreaElement>) => void
  onAddImageUrl: (url: string) => void
  onUploadImages: (files: File[]) => void
  onRemoveImage: (index: number) => void
  onShowImagesInContentChange: (showImagesInContent: boolean) => void
  onSubmit: (event: FormEvent) => void
}

export function BoardComposer({
  nickname,
  content,
  images,
  showImagesInContent,
  isSubmitting,
  isUploadingImage,
  errorMessage,
  onNicknameChange,
  onContentChange,
  onAddImageUrl,
  onUploadImages,
  onRemoveImage,
  onShowImagesInContentChange,
  onSubmit,
}: BoardComposerProps) {
  return (
    <section className="composer composer-bottom" aria-label="게시글 작성">
      <form onSubmit={onSubmit} onKeyDown={preventEnterSubmit}>
        <div className="composer-input-panel">
          <input
            className="composer-nickname-input"
            value={nickname}
            onChange={(event) => onNicknameChange(event.target.value)}
            maxLength={40}
            placeholder="익명"
            aria-label="게시글 닉네임"
          />
          <textarea
            className="composer-textarea"
            value={content}
            onChange={onContentChange}
            onKeyDown={handleTextareaKeyDown}
            rows={1}
            placeholder="오늘 나누고 싶은 이야기를 적어주세요."
            aria-label="게시글 내용"
          />
          <button type="submit" disabled={isSubmitting || isUploadingImage}>{isSubmitting ? '등록 중' : '게시하기'}</button>
        </div>
        <ImageAttachmentFields
          images={images}
          showImagesInContent={showImagesInContent}
          isUploading={isUploadingImage}
          onAddUrl={onAddImageUrl}
          onUploadFiles={onUploadImages}
          onRemoveImage={onRemoveImage}
          onShowImagesInContentChange={onShowImagesInContentChange}
        />
        {errorMessage && <p className="form-error">{errorMessage}</p>}
      </form>
    </section>
  )
}
