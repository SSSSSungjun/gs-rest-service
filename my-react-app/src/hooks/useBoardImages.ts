import { useCallback, useState } from 'react'
import type { Dispatch } from 'react'
import { boardApi } from '../boardApi'
import type { PostImage } from '../boardApi'
import type { BoardAction, BoardDraft } from '../boardReducer'

const MAX_IMAGE_COUNT = 10

export function useBoardImages(
  composerImages: PostImage[],
  editingPosts: Record<number, BoardDraft>,
  dispatch: Dispatch<BoardAction>,
  showMessage: (message: string) => void,
) {
  const [isUploadingImage, setIsUploadingImage] = useState(false)

  const ensureCanAddImages = useCallback((currentCount: number, nextCount: number) => {
    if (currentCount + nextCount <= MAX_IMAGE_COUNT) return true
    showMessage('이미지는 최대 10장까지 첨부할 수 있습니다.')
    return false
  }, [showMessage])

  const parseImageUrl = useCallback((url: string): PostImage | null => {
    try {
      const parsedUrl = new URL(url)
      if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
        showMessage('이미지 URL은 http 또는 https로 시작해야 합니다.')
        return null
      }
      return { sourceType: 'URL', url: parsedUrl.toString(), originalFilename: null }
    } catch {
      showMessage('이미지 URL 형식이 올바르지 않습니다.')
      return null
    }
  }, [showMessage])

  const addComposerImageUrl = useCallback((url: string) => {
    if (!ensureCanAddImages(composerImages.length, 1)) return
    const image = parseImageUrl(url)
    if (image) dispatch({ type: 'composer/imageAdded', payload: image })
  }, [composerImages.length, dispatch, ensureCanAddImages, parseImageUrl])

  const uploadComposerImages = useCallback(async (files: File[]) => {
    if (!ensureCanAddImages(composerImages.length, files.length)) return
    setIsUploadingImage(true)
    try {
      for (const file of files) {
        const image = await boardApi.uploadPostImage(file)        dispatch({ type: 'composer/imageAdded', payload: image })
      }
    } catch (error) {
      showMessage('이미지 업로드에 실패했습니다.')
      console.error(error)
    } finally {
      setIsUploadingImage(false)
    }
  }, [composerImages.length, dispatch, ensureCanAddImages, showMessage])

  const addPostEditImageUrl = useCallback((postId: number, url: string) => {
    const currentImages = editingPosts[postId]?.images ?? []
    if (!ensureCanAddImages(currentImages.length, 1)) return
    const image = parseImageUrl(url)
    if (image) dispatch({ type: 'posts/editImageAdded', payload: { postId, image } })
  }, [dispatch, editingPosts, ensureCanAddImages, parseImageUrl])

  const uploadPostEditImages = useCallback(async (postId: number, files: File[]) => {
    const currentImages = editingPosts[postId]?.images ?? []
    if (!ensureCanAddImages(currentImages.length, files.length)) return
    setIsUploadingImage(true)
    try {
      for (const file of files) {
        const image = await boardApi.uploadPostImage(file)
        dispatch({ type: 'posts/editImageAdded', payload: { postId, image } })
      }
    } catch (error) {
      showMessage('이미지 업로드에 실패했습니다.')
      console.error(error)
    } finally {
      setIsUploadingImage(false)
    }
  }, [dispatch, editingPosts, ensureCanAddImages, showMessage])

  return {
    isUploadingImage,
    addComposerImageUrl,
    uploadComposerImages,
    addPostEditImageUrl,
    uploadPostEditImages,
  }
}