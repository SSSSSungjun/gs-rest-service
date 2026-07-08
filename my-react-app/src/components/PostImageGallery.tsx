import type { PostImage } from '../boardApi'
import { resolveImageUrl } from '../imageUrl'

interface PostImageGalleryProps {
  images: PostImage[]
  variant: 'list' | 'detail'
}

export function PostImageGallery({ images, variant }: PostImageGalleryProps) {
  if (images.length === 0) return null

  const visibleImages = variant === 'list' ? images.slice(0, 2) : images
  const hiddenCount = images.length - visibleImages.length

  return (
    <div className={`post-image-gallery ${variant === 'list' ? 'list-image-gallery' : 'detail-image-gallery'}`}>
      {visibleImages.map((image, index) => (
        <figure className="post-image-frame" key={`${image.url}-${index}`}>
          <img src={resolveImageUrl(image.url)} alt={image.originalFilename || `첨부 이미지 ${index + 1}`} loading="lazy" />
          {variant === 'list' && hiddenCount > 0 && index === visibleImages.length - 1 && (
            <figcaption className="image-count-overlay">+{hiddenCount}</figcaption>
          )}
        </figure>
      ))}
    </div>
  )
}
