import { useState } from 'react'
import type { ChangeEvent } from 'react'
import type { PostImage } from '../boardApi'
import { resolveImageUrl } from '../imageUrl'

const MAX_IMAGE_COUNT = 10

interface ImageAttachmentFieldsProps {
  images: PostImage[]
  showImagesInContent: boolean
  isUploading?: boolean
  onAddUrl: (url: string) => void
  onUploadFiles: (files: File[]) => void
  onRemoveImage: (index: number) => void
  onShowImagesInContentChange: (showImagesInContent: boolean) => void
}

export function ImageAttachmentFields({
  images,
  showImagesInContent,
  isUploading = false,
  onAddUrl,
  onUploadFiles,
  onRemoveImage,
  onShowImagesInContentChange,
}: ImageAttachmentFieldsProps) {
  const [imageUrl, setImageUrl] = useState('')
  const remainingCount = MAX_IMAGE_COUNT - images.length
  const hasImages = images.length > 0

  const handleAddUrl = () => {
    const nextUrl = imageUrl.trim()
    if (!nextUrl) return
    onAddUrl(nextUrl)
    setImageUrl('')
  }

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? [])
    if (files.length > 0) {
      onUploadFiles(files)
    }
    event.currentTarget.value = ''
  }

  return (
    <div className="image-attachment-fields">
      <div className="image-attachment-summary">
        <strong>사진 {images.length}/{MAX_IMAGE_COUNT}</strong>
        {hasImages && <span>첨부됨</span>}
      </div>

      <div className="image-attachment-controls">
        <input
          value={imageUrl}
          onChange={(event) => setImageUrl(event.target.value)}
          placeholder="이미지 URL 붙여넣기"
          aria-label="이미지 URL"
          disabled={remainingCount <= 0}
        />
        <button type="button" className="ghost-button" onClick={handleAddUrl} disabled={remainingCount <= 0 || !imageUrl.trim()}>
          URL 추가
        </button>
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

      {hasImages && (
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
              <img src={resolveImageUrl(image.url)} alt={image.originalFilename || `첨부 이미지 ${index + 1}`} />
              <button type="button" className="image-remove-button" onClick={() => onRemoveImage(index)} aria-label="첨부 이미지 삭제">
                삭제
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
