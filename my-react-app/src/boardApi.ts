import apiClient from './apiClient'

export interface Comment {
  id: number
  nickname: string
  content: string
  ownedByMe: boolean
  createdAt: string
}

export interface Post {
  id: number
  nickname: string
  content: string
  ownedByMe: boolean
  createdAt: string
  comments: Comment[]
}

export interface BoardWritePayload {
  nickname: string
  content: string
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

  async deletePost(postId: number) {
    await apiClient.delete(`/posts/${postId}`)
  },

  async createComment(postId: number, payload: BoardWritePayload) {
    const response = await apiClient.post<Comment>(`/posts/${postId}/comments`, payload)
    return response.data
  },

  async deleteComment(commentId: number) {
    await apiClient.delete(`/comments/${commentId}`)
  },
}
