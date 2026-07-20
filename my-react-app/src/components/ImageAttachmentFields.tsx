import { useState } from 'react'
import type { ChangeEvent } from 'react'
import type { PostImage } from '../boardApi'
import { resolveImageUrl } from '../imageUrl'
import { ImageLightbox } from './ImageLightbox'

const MAX_IMAGE_COUNT = 10

interface ImageAttachmentFieldsProps {
  images: PostImage[]
  showImagesInContent: boolean
  isUploading?: boolean
  showSummary?: boolean
  showFilePicker?: boolean
  showPreviewToggle?: boolean
  onUploadFiles: (files: File[]) => void
  onRemoveImage: (index: number) => void
  onShowImagesInContentChange: (showImagesInContent: boolean) => void
}

export function ImageAttachmentFields({
  images,
  showImagesInContent,
  isUploading = false,
  showSummary = true,
  showFilePicker = true,
  showPreviewToggle = true,
  onUploadFiles,
  onRemoveImage,
  onShowImagesInContentChange,
}: ImageAttachmentFieldsProps) {
  const [activeImageIndex, setActiveImageIndex] = useState<number | null>(null)
  const remainingCount = MAX_IMAGE_COUNT - images.length
  const hasImages = images.length > 0

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? [])
    if (files.length > 0) onUploadFiles(files)
    event.currentTarget.value = ''
  }

  const handleReplaceImage = (index: number, event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      onRemoveImage(index)
      onUploadFiles([file])
    }
    event.currentTarget.value = ''
  }

  return (
    <div className="image-attachment-fields">
      {showSummary && (
        <div className="image-attachment-summary">
          <strong>사진 {images.length}/{MAX_IMAGE_COUNT}</strong>
          <span>파일 선택</span>
        </div>
      )}

      {showFilePicker && (
        <div className="image-attachment-controls compact-image-controls">
          <label className={`file-pick-button ${remainingCount <= 0 || isUploading ? 'disabled' : ''}`}>
            <span>{isUploading ? '업로드 중' : '파일 선택'}</span>
            <input
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp"
              multiple
              onChange={handleFileChange}
              disabled={remainingCount <= 0 || isUploading}
            />
          </label>
        </div>
      )}

      {showPreviewToggle && hasImages && (
        <label className="image-preview-toggle">
          <input
            type="checkbox"
            checked={showImagesInContent}
            onChange={(event) => onShowImagesInContentChange(event.target.checked)}
          />
          <span>게시글 본문에 사진 미리보기 표시</span>
        </label>
      )}

      {hasImages && (
        <div className="image-attachment-preview-list">
          {images.map((image, index) => (
            <div className="image-attachment-preview" key={`${image.url}-${index}`}>
              <button
                className="image-attachment-open"
                type="button"
                onClick={() => setActiveImageIndex(index)}
                aria-label={`첨부 이미지 ${index + 1} 전체 화면으로 보기`}
              >
                <img src={resolveImageUrl(image.url)} alt={image.originalFilename || `첨부 이미지 ${index + 1}`} />
              </button>
              <div className="image-attachment-actions">
                <label className={`image-replace-button ${isUploading ? 'disabled' : ''}`}>
                  교체
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/gif,image/webp"
                    onChange={(event) => handleReplaceImage(index, event)}
                    disabled={isUploading}
                    aria-label={`첨부 이미지 ${index + 1} 교체`}
                  />
                </label>
                <button
                  type="button"
                  className="image-delete-button"
                  onClick={() => onRemoveImage(index)}
                  aria-label={`첨부 이미지 ${index + 1} 삭제`}
                >
                  삭제
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <ImageLightbox
        images={images}
        activeIndex={activeImageIndex}
        onChange={setActiveImageIndex}
        onClose={() => setActiveImageIndex(null)}
      />
    </div>
  )
}