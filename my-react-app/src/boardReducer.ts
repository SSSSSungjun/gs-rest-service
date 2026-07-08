import type { Post } from './boardApi'

export interface CommentDraft {
  nickname: string
  content: string
}

export interface BoardState {
  posts: Post[]
  nickname: string
  content: string
  commentDrafts: Record<number, CommentDraft>
  isLoading: boolean
  isSubmitting: boolean
  errorMessage: string
}

export type BoardAction =
  | { type: 'posts/loadStarted' }
  | { type: 'posts/loadSucceeded'; payload: Post[] }
  | { type: 'posts/loadFailed'; payload: string }
  | { type: 'composer/nicknameChanged'; payload: string }
  | { type: 'composer/contentChanged'; payload: string }
  | { type: 'composer/submitStarted' }
  | { type: 'composer/submitFinished' }
  | { type: 'composer/resetContent' }
  | { type: 'comments/nicknameChanged'; payload: { postId: number; nickname: string } }
  | { type: 'comments/contentChanged'; payload: { postId: number; content: string } }
  | { type: 'comments/draftCleared'; payload: number }
  | { type: 'posts/deleted'; payload: number }
  | { type: 'error/set'; payload: string }
  | { type: 'error/clear' }

export const initialBoardState: BoardState = {
  posts: [],
  nickname: '',
  content: '',
  commentDrafts: {},
  isLoading: true,
  isSubmitting: false,
  errorMessage: '',
}

function getCommentDraft(state: BoardState, postId: number): CommentDraft {
  return state.commentDrafts[postId] ?? { nickname: '', content: '' }
}

export function boardReducer(state: BoardState, action: BoardAction): BoardState {
  switch (action.type) {
    case 'posts/loadStarted':
      return { ...state, isLoading: true, errorMessage: '' }
    case 'posts/loadSucceeded':
      return { ...state, posts: action.payload, isLoading: false, errorMessage: '' }
    case 'posts/loadFailed':
      return { ...state, isLoading: false, errorMessage: action.payload }
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
      const currentDraft = getCommentDraft(state, action.payload.postId)
      return {
        ...state,
        commentDrafts: {
          ...state.commentDrafts,
          [action.payload.postId]: { ...currentDraft, nickname: action.payload.nickname },
        },
      }
    }
    case 'comments/contentChanged': {
      const currentDraft = getCommentDraft(state, action.payload.postId)
      return {
        ...state,
        commentDrafts: {
          ...state.commentDrafts,
          [action.payload.postId]: { ...currentDraft, content: action.payload.content },
        },
      }
    }
    case 'comments/draftCleared': {
      const nextDrafts = { ...state.commentDrafts }
      delete nextDrafts[action.payload]
      return { ...state, commentDrafts: nextDrafts }
    }
    case 'posts/deleted':
      return { ...state, posts: state.posts.filter((post) => post.id !== action.payload) }
    case 'error/set':
      return { ...state, errorMessage: action.payload }
    case 'error/clear':
      return { ...state, errorMessage: '' }
    default:
      return state
  }
}
