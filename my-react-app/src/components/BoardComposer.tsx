import { useEffect, useRef, useState } from 'react'
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
  onAddImageUrl: (url: string) => void
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
  onUploadImages,
  onRemoveImage,
  onShowImagesInContentChange,
  onSubmit,
}: BoardComposerProps) {
  const [isAttachmentMenuOpen, setIsAttachmentMenuOpen] = useState(false)
  const attachmentShellRef = useRef<HTMLDivElement>(null)
  const hasImages = images.length > 0

  useEffect(() => {
    if (!isAttachmentMenuOpen) return

    const closeOnPointerDown = (event: PointerEvent) => {
      if (attachmentShellRef.current?.contains(event.target as Node)) return
      setIsAttachmentMenuOpen(false)
    }

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsAttachmentMenuOpen(false)
      }
    }

    window.addEventListener('pointerdown', closeOnPointerDown)
    window.addEventListener('keydown', closeOnEscape)
    return () => {
      window.removeEventListener('pointerdown', closeOnPointerDown)
      window.removeEventListener('keydown', closeOnEscape)
    }
  }, [isAttachmentMenuOpen])

  const uploadImages = (files: File[]) => {
    if (files.length === 0) return
    onUploadImages(files)
    setIsAttachmentMenuOpen(false)
  }

  const handleFileInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    uploadImages(Array.from(event.target.files ?? []))
    event.currentTarget.value = ''
  }

  const handlePaste = (event: ClipboardEvent<HTMLTextAreaElement>) => {
    const pastedFiles = getImageFiles(event.clipboardData.files)
    if (pastedFiles.length > 0) {
      event.preventDefault()
      uploadImages(pastedFiles)
      return
    }

    const imageUrl = getPastedImageUrl(event.clipboardData.getData('text'))
    if (imageUrl) {
      event.preventDefault()
      onAddImageUrl(imageUrl)
    }
  }

  const handleDragOver = (event: DragEvent<HTMLTextAreaElement>) => {
    if (event.dataTransfer.types.includes('Files') || event.dataTransfer.types.includes('text/uri-list')) {
      event.preventDefault()
    }
  }

  const handleDrop = (event: DragEvent<HTMLTextAreaElement>) => {
    const droppedFiles = getImageFiles(event.dataTransfer.files)
    if (droppedFiles.length > 0) {
      event.preventDefault()
      uploadImages(droppedFiles)
      return
    }

    const imageUrl = getPastedImageUrl(event.dataTransfer.getData('text/uri-list') || event.dataTransfer.getData('text/plain'))
    if (imageUrl) {
      event.preventDefault()
      onAddImageUrl(imageUrl)
    }
  }

  return (
    <section className="composer composer-bottom" aria-label="게시글 작성">
      <form onSubmit={onSubmit} onKeyDown={preventEnterSubmit}>
        <div className="composer-draft-box">
          {hasImages && (
            <div className="composer-preview-strip">
              <ImageAttachmentFields
                images={images}
                showImagesInContent={showImagesInContent}
                isUploading={isUploadingImage}
                showSummary={false}
                showFilePicker={false}
                onUploadFiles={onUploadImages}
                onRemoveImage={onRemoveImage}
                onShowImagesInContentChange={onShowImagesInContentChange}
              />
            </div>
          )}

          <div className="composer-input-shell" ref={attachmentShellRef}>
            <button
              className="composer-attach-button"
              type="button"
              aria-label="사진 첨부 메뉴"
              aria-expanded={isAttachmentMenuOpen}
              onClick={() => setIsAttachmentMenuOpen((isOpen) => !isOpen)}
              disabled={isUploadingImage}
            >
              +
            </button>
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
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              rows={1}
              placeholder="무슨 일이 있었나요?"
              aria-label="게시글 내용"
            />
            <button className="composer-submit-button" type="submit" disabled={isSubmitting || isUploadingImage}>
              {isSubmitting ? '등록 중' : '게시'}
            </button>

            {isAttachmentMenuOpen && (
              <div className="composer-attachment-menu" role="menu">
                <label className={`composer-attachment-option ${isUploadingImage ? 'disabled' : ''}`}>
                  <span>사진 첨부하기</span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/gif,image/webp"
                    multiple
                    onChange={handleFileInputChange}
                    disabled={isUploadingImage}
                  />
                </label>
              </div>
            )}
          </div>
        </div>

        {errorMessage && <p className="form-error">{errorMessage}</p>}
      </form>
    </section>
  )
}
