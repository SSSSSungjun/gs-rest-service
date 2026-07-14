import type { PostImage } from '../boardApi'
import { resolveImageUrl } from '../imageUrl'

interface PostImageGalleryProps {
  images: PostImage[]
  variant: 'list' | 'detail'
}

export function PostImageGallery({ images, variant }: PostImageGalleryProps) {
  if (images.length === 0) return null

  const visibleImages = variant === 'list' ? images.slice(0, 1) : images
  const galleryClassName = [
    'post-image-gallery',
    variant === 'list' ? 'list-image-gallery single-image-gallery' : 'detail-image-gallery',
  ].join(' ')
  const galleryStyle = variant === 'list'
    ? {
      width: '52px',
      gridTemplateColumns: '52px',
    }
    : undefined

  return (
    <div className={galleryClassName} style={galleryStyle}>
      {visibleImages.map((image, index) => (
        <figure className="post-image-frame" key={`${image.url}-${index}`}>
          <img src={resolveImageUrl(image.url)} alt={image.originalFilename || `첨부 이미지 ${index + 1}`} loading="lazy" />
        </figure>
      ))}
    </div>
  )
}
