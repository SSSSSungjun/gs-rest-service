import { useState } from 'react'
import type { PostImage } from '../boardApi'
import { resolveImageUrl } from '../imageUrl'
import { ImageLightbox } from './ImageLightbox'

interface PostImageGalleryProps {
  images: PostImage[]
  variant: 'list' | 'detail'
}

export function PostImageGallery({ images, variant }: PostImageGalleryProps) {
  const [activeImageIndex, setActiveImageIndex] = useState<number | null>(null)
  if (images.length === 0) return null

  const visibleImages = variant === 'list' ? images.slice(0, 1) : images
  const galleryClassName = [
    'post-image-gallery',
    variant === 'list' ? 'list-image-gallery single-image-gallery' : 'detail-image-gallery',
  ].join(' ')

  return (
    <>
      <div className={galleryClassName}>
        {visibleImages.map((image, index) => (
          <figure className="post-image-frame" key={`${image.url}-${index}`}>
            <button
              className="post-image-open"
              type="button"
              aria-label={`첨부 이미지 ${index + 1} 전체 화면으로 보기`}
              onClick={(event) => {
                event.stopPropagation()
                setActiveImageIndex(index)
              }}
            >
              <img src={resolveImageUrl(image.url)} alt={image.originalFilename || `첨부 이미지 ${index + 1}`} loading="lazy" />
            </button>
          </figure>
        ))}
      </div>
      <ImageLightbox
        images={images}
        activeIndex={activeImageIndex}
        onChange={setActiveImageIndex}
        onClose={() => setActiveImageIndex(null)}
      />
    </>
  )
}
