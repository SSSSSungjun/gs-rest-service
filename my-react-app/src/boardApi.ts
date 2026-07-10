import apiClient from './apiClient'

export type PostImageSourceType = 'URL' | 'UPLOAD'

export interface PostImage {
  id?: number
  sourceType: PostImageSourceType
  url: string
  originalFilename?: string | null
  imageOrder?: number
}

export interface Comment {
  id: number
  parentCommentId?: number | null
  replyToNickname?: string | null
  nickname: string
  content: string
  ownedByMe: boolean
  likeCount: number
  likedByMe: boolean
  createdAt: string
  updatedAt: string | null
}

export interface Post {
  id: number
  nickname: string
  content: string
  ownedByMe: boolean
  likeCount: number
  likedByMe: boolean
  showImagesInContent: boolean
  createdAt: string
  updatedAt: string | null
  images: PostImage[]
  comments: Comment[]
}

export interface BoardWritePayload {
  nickname: string
  content: string
  images?: PostImage[]
  showImagesInContent?: boolean
  parentCommentId?: number | null
}

export const boardApi = {
  async getPosts() {
    const response = await apiClient.get<Post[]>('/posts')
    return response.data
  },

  async createPost(payload: BoardWritePayload) {
    const response = await apiClient.post<Post>('/posts', payload)
    return response.data
  },

  async uploadPostImage(file: File) {
    const formData = new FormData()
    formData.append('file', file)
    const response = await apiClient.post<PostImage>('/posts/images', formData)
    return response.data
  },

  async updatePost(postId: number, payload: BoardWritePayload) {
    const response = await apiClient.patch<Post>(`/posts/${postId}`, payload)
    return response.data
  },

  async deletePost(postId: number) {
    await apiClient.delete(`/posts/${postId}`)
  },

  async togglePostLike(postId: number) {
    await apiClient.post(`/posts/${postId}/likes`)
  },

  async createComment(postId: number, payload: BoardWritePayload) {
    const response = await apiClient.post<Comment>(`/posts/${postId}/comments`, payload)
    return response.data
  },

  async updateComment(commentId: number, payload: BoardWritePayload) {
    const response = await apiClient.patch<Comment>(`/comments/${commentId}`, payload)
    return response.data
  },

  async deleteComment(commentId: number) {
    await apiClient.delete(`/comments/${commentId}`)
  },

  async toggleCommentLike(commentId: number) {
    await apiClient.post(`/comments/${commentId}/likes`)
  },
}