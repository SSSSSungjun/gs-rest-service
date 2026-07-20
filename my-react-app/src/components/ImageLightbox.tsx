import { useEffect } from 'react'
import type { PostImage } from '../boardApi'
import { resolveImageUrl } from '../imageUrl'
import { ChevronLeftIcon, ChevronRightIcon, XIcon } from './Icons'
import './ImageLightbox.css'

interface ImageLightboxProps {
  images: PostImage[]
  activeIndex: number | null
  onChange: (index: number) => void
  onClose: () => void
}

export function ImageLightbox({ images, activeIndex, onChange, onClose }: ImageLightboxProps) {
  useEffect(() => {
    if (activeIndex === null) return

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
      if (event.key === 'ArrowLeft') {
        onChange((activeIndex - 1 + images.length) % images.length)
      }
      if (event.key === 'ArrowRight') {
        onChange((activeIndex + 1) % images.length)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = previousOverflow
    }
  }, [activeIndex, images.length, onChange, onClose])

  if (activeIndex === null || !images[activeIndex]) return null

  const image = images[activeIndex]
  const showNavigation = images.length > 1

  return (
    <div
      className="image-lightbox"
      role="dialog"
      aria-modal="true"
      aria-label="첨부 이미지 전체 화면 보기"
      onClick={(event) => event.stopPropagation()}
      onMouseDown={(event) => {
        if (event.currentTarget === event.target) onClose()
      }}
    >
      <button className="image-lightbox-close" type="button" onClick={onClose} aria-label="이미지 닫기">
        <XIcon />
      </button>
      {showNavigation && (
        <button
          className="image-lightbox-navigation previous"
          type="button"
          onClick={() => onChange((activeIndex - 1 + images.length) % images.length)}
          aria-label="이전 이미지"
        >
          <ChevronLeftIcon />
        </button>
      )}
      <figure className="image-lightbox-figure">
        <img src={resolveImageUrl(image.url)} alt={image.originalFilename || `첨부 이미지 ${activeIndex + 1}`} />
        {showNavigation && <figcaption>{activeIndex + 1} / {images.length}</figcaption>}
      </figure>
      {showNavigation && (
        <button
          className="image-lightbox-navigation next"
          type="button"
          onClick={() => onChange((activeIndex + 1) % images.length)}
          aria-label="다음 이미지"
        >
          <ChevronRightIcon />
        </button>
      )}
    </div>
  )
}
