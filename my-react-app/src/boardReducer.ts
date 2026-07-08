import type { Comment, Post } from './boardApi'

export interface BoardDraft {
  nickname: string
  content: string
}

export interface ToastState {
  message: string
  tone: 'success' | 'error'
}

export interface PendingDelete {
  target: 'post' | 'comment'
  id: number
}

export interface BoardState {
  posts: Post[]
  nickname: string
  content: string
  commentDrafts: Record<number, BoardDraft>
  editingPosts: Record<number, BoardDraft>
  editingComments: Record<number, BoardDraft>
  expandedPostId: number | null
  pendingDelete: PendingDelete | null
  toast: ToastState | null
  currentPage: number
  isLoading: boolean
  isSubmitting: boolean
  errorMessage: string
}

export type BoardAction =
  | { type: 'posts/loadStarted' }
  | { type: 'posts/loadSucceeded'; payload: Post[] }
  | { type: 'posts/loadFailed'; payload: string }
  | { type: 'posts/toggled'; payload: number }
  | { type: 'posts/detailOpened'; payload: number }
  | { type: 'posts/detailClosed' }
  | { type: 'composer/nicknameChanged'; payload: string }
  | { type: 'composer/contentChanged'; payload: string }
  | { type: 'composer/submitStarted' }
  | { type: 'composer/submitFinished' }
  | { type: 'composer/resetContent' }
  | { type: 'comments/nicknameChanged'; payload: { postId: number; nickname: string } }
  | { type: 'comments/contentChanged'; payload: { postId: number; content: string } }
  | { type: 'comments/draftCleared'; payload: number }
  | { type: 'posts/editStarted'; payload: Post }
  | { type: 'posts/editNicknameChanged'; payload: { postId: number; nickname: string } }
  | { type: 'posts/editContentChanged'; payload: { postId: number; content: string } }
  | { type: 'posts/editCanceled'; payload: number }
  | { type: 'comments/editStarted'; payload: Comment }
  | { type: 'comments/editNicknameChanged'; payload: { commentId: number; nickname: string } }
  | { type: 'comments/editContentChanged'; payload: { commentId: number; content: string } }
  | { type: 'comments/editCanceled'; payload: number }
  | { type: 'delete/requested'; payload: PendingDelete }
  | { type: 'delete/canceled' }
  | { type: 'pagination/pageChanged'; payload: number }
  | { type: 'posts/deleted'; payload: number }
  | { type: 'toast/show'; payload: ToastState }
  | { type: 'toast/hidden' }
  | { type: 'error/set'; payload: string }
  | { type: 'error/clear' }

export const initialBoardState: BoardState = {
  posts: [],
  nickname: '',
  content: '',
  commentDrafts: {},
  editingPosts: {},
  editingComments: {},
  expandedPostId: null,
  pendingDelete: null,
  toast: null,
  currentPage: 1,
  isLoading: true,
  isSubmitting: false,
  errorMessage: '',
}

function getDraft(drafts: Record<number, BoardDraft>, id: number): BoardDraft {
  return drafts[id] ?? { nickname: '', content: '' }
}

function removeDraft(drafts: Record<number, BoardDraft>, id: number): Record<number, BoardDraft> {
  const nextDrafts = { ...drafts }
  delete nextDrafts[id]
  return nextDrafts
}

export function boardReducer(state: BoardState, action: BoardAction): BoardState {
  switch (action.type) {
    case 'posts/loadStarted':
      return { ...state, isLoading: true, errorMessage: '' }
    case 'posts/loadSucceeded': {
      const expandedPostExists = state.expandedPostId === null
        || action.payload.some((post) => post.id === state.expandedPostId)
      return {
        ...state,
        posts: action.payload,
        expandedPostId: expandedPostExists ? state.expandedPostId : null,
        isLoading: false,
        errorMessage: '',
      }
    }
    case 'posts/loadFailed':
      return { ...state, isLoading: false, errorMessage: action.payload }
    case 'posts/toggled':
      return { ...state, expandedPostId: state.expandedPostId === action.payload ? null : action.payload }
    case 'posts/detailOpened':
      return { ...state, expandedPostId: action.payload }
    case 'posts/detailClosed':
      return { ...state, expandedPostId: null }
    case 'composer/nicknameChanged':
      return { ...state, nickname: action.payload }
    case 'composer/contentChanged':
      return { ...state, content: action.payload }
    case 'composer/submitStarted':
      return { ...state, isSubmitting: true, errorMessage: '' }
    case 'composer/submitFinished':
      return { ...state, isSubmitting: false }
    case 'composer/resetContent':
      return { ...state, content: '' }
    case 'comments/nicknameChanged': {
      const currentDraft = getDraft(state.commentDrafts, action.payload.postId)
      return {
        ...state,
        commentDrafts: {
          ...state.commentDrafts,
          [action.payload.postId]: { ...currentDraft, nickname: action.payload.nickname },
        },
      }
    }
    case 'comments/contentChanged': {
      const currentDraft = getDraft(state.commentDrafts, action.payload.postId)
      return {
        ...state,
        commentDrafts: {
          ...state.commentDrafts,
          [action.payload.postId]: { ...currentDraft, content: action.payload.content },
        },
      }
    }
    case 'comments/draftCleared':
      return { ...state, commentDrafts: removeDraft(state.commentDrafts, action.payload) }
    case 'posts/editStarted':
      return {
        ...state,
        editingPosts: {
          ...state.editingPosts,
          [action.payload.id]: { nickname: action.payload.nickname, content: action.payload.content },
        },
      }
    case 'posts/editNicknameChanged': {
      const currentDraft = getDraft(state.editingPosts, action.payload.postId)
      return {
        ...state,
        editingPosts: {
          ...state.editingPosts,
          [action.payload.postId]: { ...currentDraft, nickname: action.payload.nickname },
        },
      }
    }
    case 'posts/editContentChanged': {
      const currentDraft = getDraft(state.editingPosts, action.payload.postId)
      return {
        ...state,
        editingPosts: {
          ...state.editingPosts,
          [action.payload.postId]: { ...currentDraft, content: action.payload.content },
        },
      }
    }
    case 'posts/editCanceled':
      return { ...state, editingPosts: removeDraft(state.editingPosts, action.payload) }
    case 'comments/editStarted':
      return {
        ...state,
        editingComments: {
          ...state.editingComments,
          [action.payload.id]: { nickname: action.payload.nickname, content: action.payload.content },
        },
      }
    case 'comments/editNicknameChanged': {
      const currentDraft = getDraft(state.editingComments, action.payload.commentId)
      return {
        ...state,
        editingComments: {
          ...state.editingComments,
          [action.payload.commentId]: { ...currentDraft, nickname: action.payload.nickname },
        },
      }
    }
    case 'comments/editContentChanged': {
      const currentDraft = getDraft(state.editingComments, action.payload.commentId)
      return {
        ...state,
        editingComments: {
          ...state.editingComments,
          [action.payload.commentId]: { ...currentDraft, content: action.payload.content },
        },
      }
    }
    case 'comments/editCanceled':
      return { ...state, editingComments: removeDraft(state.editingComments, action.payload) }
    case 'delete/requested':
      return { ...state, pendingDelete: action.payload }
    case 'delete/canceled':
      return { ...state, pendingDelete: null }
    case 'pagination/pageChanged':
      return { ...state, currentPage: action.payload, expandedPostId: null }
    case 'posts/deleted':
      return {
        ...state,
        posts: state.posts.filter((post) => post.id !== action.payload),
        expandedPostId: state.expandedPostId === action.payload ? null : state.expandedPostId,
        pendingDelete: null,
      }
    case 'toast/show':
      return { ...state, toast: action.payload }
    case 'toast/hidden':
      return { ...state, toast: null }
    case 'error/set':
      return { ...state, errorMessage: action.payload }
    case 'error/clear':
      return { ...state, errorMessage: '' }
    default:
      return state
  }
}
