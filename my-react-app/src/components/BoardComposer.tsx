import type { ChangeEvent, ClipboardEvent, DragEvent, FormEvent } from 'react'
import type { PostImage } from '../boardApi'
import { handleTextareaKeyDown, preventEnterSubmit } from '../boardUi'
import { ImageAttachmentFields } from './ImageAttachmentFields'
import '../composerLayout.css'

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
  onAddImageUrl: (url: string) => boolean
  onRemoveImageUrlFromContent: (url: string) => void
  onUploadImages: (files: File[]) => void
  onRemoveImage: (index: number) => void
  onShowImagesInContentChange: (showImagesInContent: boolean) => void
  onSubmit: (event: FormEvent) => void
}

function getImageFiles(files: FileList | File[]) {
  return Array.from(files).filter((file) => file.type.startsWith('image/'))
}

function getPastedImageUrl(text: string) {
  const value = text.trim()
  if (!value) return null

  try {
    const parsedUrl = new URL(value)
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) return null
    if (/\.(avif|gif|jpe?g|png|webp)(\?.*)?$/i.test(parsedUrl.href)) {
      return parsedUrl.toString()
    }
  } catch {
    return null
  }

  return null
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
  onRemoveImageUrlFromContent,
  onUploadImages,
  onRemoveImage,
  onShowImagesInContentChange,
  onSubmit,
}: BoardComposerProps) {
  const hasImages = images.length > 0

  const handlePaste = (event: ClipboardEvent<HTMLTextAreaElement>) => {
    const pastedFiles = getImageFiles(event.clipboardData.files)
    if (pastedFiles.length > 0) {
      event.preventDefault()
      onUploadImages(pastedFiles)
      return
    }

    const imageUrl = getPastedImageUrl(event.clipboardData.getData('text'))
    if (imageUrl && onAddImageUrl(imageUrl)) {
      event.preventDefault()
    }
  }

  const handleDrop = (event: DragEvent<HTMLTextAreaElement>) => {
    const droppedFiles = getImageFiles(event.dataTransfer.files)
    if (droppedFiles.length > 0) {
      event.preventDefault()
      onUploadImages(droppedFiles)
      return
    }

    const imageUrl = getPastedImageUrl(event.dataTransfer.getData('text/uri-list') || event.dataTransfer.getData('text/plain'))
    if (imageUrl && onAddImageUrl(imageUrl)) {
      event.preventDefault()
      onRemoveImageUrlFromContent(imageUrl)
    }
  }

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
            onPaste={handlePaste}
            onDrop={handleDrop}
            rows={1}
            placeholder="글을 쓰거나 이미지를 붙여넣어 보세요."
            aria-label="게시글 내용"
          />
          <button type="submit" disabled={isSubmitting || isUploadingImage}>{isSubmitting ? '등록 중' : '게시하기'}</button>
        </div>

        <details className="composer-attachment-panel" open={hasImages || isUploadingImage}>
          <summary aria-label="사진 첨부 옵션 열기">
            <span className="attachment-toggle-icon">+</span>
            <span>사진 {images.length}</span>
          </summary>
          <ImageAttachmentFields
            images={images}
            showImagesInContent={showImagesInContent}
            isUploading={isUploadingImage}
            onUploadFiles={onUploadImages}
            onRemoveImage={onRemoveImage}
            onShowImagesInContentChange={onShowImagesInContentChange}
          />
        </details>

        {errorMessage && <p className="form-error">{errorMessage}</p>}
      </form>
    </section>
  )
}
