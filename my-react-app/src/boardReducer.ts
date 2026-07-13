import type { Comment, Post, PostImage } from './boardApi'

export interface BoardDraft {
  nickname: string
  content: string
  images?: PostImage[]
  showImagesInContent?: boolean
}

export interface PendingDelete {
  target: 'post' | 'comment'
  id: number
}

export interface BoardState {
  posts: Post[]
  nickname: string
  content: string
  images: PostImage[]
  pollOptions: string[]
  showImagesInContent: boolean
  commentDrafts: Record<number, BoardDraft>
  replyDrafts: Record<number, BoardDraft>
  replyTargets: Record<number, number>
  editingPosts: Record<number, BoardDraft>
  editingComments: Record<number, BoardDraft>
  expandedPostId: number | null
  pendingDelete: PendingDelete | null
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
  | { type: 'posts/viewCountIncremented'; payload: number }
  | { type: 'posts/viewCountIncrementRolledBack'; payload: number }
  | { type: 'composer/nicknameChanged'; payload: string }
  | { type: 'composer/contentChanged'; payload: string }
  | { type: 'composer/imageAdded'; payload: PostImage }
  | { type: 'composer/imageRemoved'; payload: number }
  | { type: 'composer/pollStarted' }
  | { type: 'composer/pollOptionChanged'; payload: { index: number; content: string } }
  | { type: 'composer/pollOptionAdded' }
  | { type: 'composer/pollOptionRemoved'; payload: number }
  | { type: 'composer/pollCleared' }
  | { type: 'composer/showImagesChanged'; payload: boolean }
  | { type: 'composer/submitStarted' }
  | { type: 'composer/submitFinished' }
  | { type: 'composer/resetContent' }
  | { type: 'comments/nicknameChanged'; payload: { postId: number; nickname: string } }
  | { type: 'comments/contentChanged'; payload: { postId: number; content: string } }
  | { type: 'comments/draftCleared'; payload: number }
  | { type: 'comments/replyStarted'; payload: { postId: number; commentId: number } }
  | { type: 'comments/replyCanceled'; payload: { postId: number; commentId: number } }
  | { type: 'comments/replyNicknameChanged'; payload: { commentId: number; nickname: string } }
  | { type: 'comments/replyContentChanged'; payload: { commentId: number; content: string } }
  | { type: 'comments/replyDraftCleared'; payload: { postId: number; commentId: number } }
  | { type: 'posts/editStarted'; payload: Post }
  | { type: 'posts/editNicknameChanged'; payload: { postId: number; nickname: string } }
  | { type: 'posts/editContentChanged'; payload: { postId: number; content: string } }
  | { type: 'posts/editImageAdded'; payload: { postId: number; image: PostImage } }
  | { type: 'posts/editImageRemoved'; payload: { postId: number; index: number } }
  | { type: 'posts/editShowImagesChanged'; payload: { postId: number; showImagesInContent: boolean } }
  | { type: 'posts/editCanceled'; payload: number }
  | { type: 'comments/editStarted'; payload: Comment }
  | { type: 'comments/editNicknameChanged'; payload: { commentId: number; nickname: string } }
  | { type: 'comments/editContentChanged'; payload: { commentId: number; content: string } }
  | { type: 'comments/editCanceled'; payload: number }
  | { type: 'delete/requested'; payload: PendingDelete }
  | { type: 'delete/canceled' }
  | { type: 'pagination/pageChanged'; payload: number }
  | { type: 'posts/deleted'; payload: number }
  | { type: 'error/set'; payload: string }
  | { type: 'error/clear' }

export const initialBoardState: BoardState = {
  posts: [],
  nickname: '',
  content: '',
  images: [],
  pollOptions: [],
  showImagesInContent: true,
  commentDrafts: {},
  replyDrafts: {},
  replyTargets: {},
  editingPosts: {},
  editingComments: {},
  expandedPostId: null,
  pendingDelete: null,
  currentPage: 1,
  isLoading: true,
  isSubmitting: false,
  errorMessage: '',
}

function getDraft(drafts: Record<number, BoardDraft>, id: number): BoardDraft {
  return drafts[id] ?? { nickname: '', content: '', images: [], showImagesInContent: true }
}

function removeDraft(drafts: Record<number, BoardDraft>, id: number): Record<number, BoardDraft> {
  const nextDrafts = { ...drafts }
  delete nextDrafts[id]
  return nextDrafts
}

function removeReplyTarget(replyTargets: Record<number, number>, postId: number): Record<number, number> {
  const nextReplyTargets = { ...replyTargets }
  delete nextReplyTargets[postId]
  return nextReplyTargets
}

function removeImage(images: PostImage[] | undefined, index: number): PostImage[] {
  return (images ?? []).filter((_, imageIndex) => imageIndex !== index)
}

function removePollOption(options: string[], index: number): string[] {
  return options.filter((_, optionIndex) => optionIndex !== index)
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
    case 'posts/viewCountIncremented':
      return {
        ...state,
        posts: state.posts.map((post) => post.id === action.payload
          ? { ...post, viewCount: post.viewCount + 1 }
          : post),
      }
    case 'posts/viewCountIncrementRolledBack':
      return {
        ...state,
        posts: state.posts.map((post) => post.id === action.payload
          ? { ...post, viewCount: Math.max(0, post.viewCount - 1) }
          : post),
      }
    case 'composer/nicknameChanged':
      return { ...state, nickname: action.payload }
    case 'composer/contentChanged':
      return { ...state, content: action.payload }
    case 'composer/imageAdded':
      return { ...state, images: [...state.images, action.payload] }
    case 'composer/imageRemoved':
      return { ...state, images: removeImage(state.images, action.payload) }
    case 'composer/pollStarted':
      return { ...state, pollOptions: state.pollOptions.length === 0 ? ['', ''] : state.pollOptions }
    case 'composer/pollOptionChanged':
      return {
        ...state,
        pollOptions: state.pollOptions.map((option, index) => (
          index === action.payload.index ? action.payload.content : option
        )),
      }
    case 'composer/pollOptionAdded':
      return { ...state, pollOptions: state.pollOptions.length >= 5 ? state.pollOptions : [...state.pollOptions, ''] }
    case 'composer/pollOptionRemoved':
      return { ...state, pollOptions: removePollOption(state.pollOptions, action.payload) }
    case 'composer/pollCleared':
      return { ...state, pollOptions: [] }
    case 'composer/showImagesChanged':
      return { ...state, showImagesInContent: action.payload }
    case 'composer/submitStarted':
      return { ...state, isSubmitting: true, errorMessage: '' }
    case 'composer/submitFinished':
      return { ...state, isSubmitting: false }
    case 'composer/resetContent':
      return { ...state, content: '', images: [], pollOptions: [], showImagesInContent: true }
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
    case 'comments/replyStarted':
      return {
        ...state,
        replyTargets: {
          ...state.replyTargets,
          [action.payload.postId]: action.payload.commentId,
        },
      }
    case 'comments/replyCanceled':
      return {
        ...state,
        replyTargets: removeReplyTarget(state.replyTargets, action.payload.postId),
        replyDrafts: removeDraft(state.replyDrafts, action.payload.commentId),
      }
    case 'comments/replyNicknameChanged': {
      const currentDraft = getDraft(state.replyDrafts, action.payload.commentId)
      return {
        ...state,
        replyDrafts: {
          ...state.replyDrafts,
          [action.payload.commentId]: { ...currentDraft, nickname: action.payload.nickname },
        },
      }
    }
    case 'comments/replyContentChanged': {
      const currentDraft = getDraft(state.replyDrafts, action.payload.commentId)
      return {
        ...state,
        replyDrafts: {
          ...state.replyDrafts,
          [action.payload.commentId]: { ...currentDraft, content: action.payload.content },
        },
      }
    }
    case 'comments/replyDraftCleared':
      return {
        ...state,
        replyTargets: removeReplyTarget(state.replyTargets, action.payload.postId),
        replyDrafts: removeDraft(state.replyDrafts, action.payload.commentId),
      }
    case 'posts/editStarted':
      return {
        ...state,
        editingPosts: {
          ...state.editingPosts,
          [action.payload.id]: {
            nickname: action.payload.nickname,
            content: action.payload.content,
            images: action.payload.images,
            showImagesInContent: action.payload.showImagesInContent,
          },
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
    case 'posts/editImageAdded': {
      const currentDraft = getDraft(state.editingPosts, action.payload.postId)
      return {
        ...state,
        editingPosts: {
          ...state.editingPosts,
          [action.payload.postId]: {
            ...currentDraft,
            images: [...(currentDraft.images ?? []), action.payload.image],
          },
        },
      }
    }
    case 'posts/editImageRemoved': {
      const currentDraft = getDraft(state.editingPosts, action.payload.postId)
      return {
        ...state,
        editingPosts: {
          ...state.editingPosts,
          [action.payload.postId]: {
            ...currentDraft,
            images: removeImage(currentDraft.images, action.payload.index),
          },
        },
      }
    }
    case 'posts/editShowImagesChanged': {
      const currentDraft = getDraft(state.editingPosts, action.payload.postId)
      return {
        ...state,
        editingPosts: {
          ...state.editingPosts,
          [action.payload.postId]: {
            ...currentDraft,
            showImagesInContent: action.payload.showImagesInContent,
          },
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
    case 'error/set':
      return { ...state, errorMessage: action.payload }
    case 'error/clear':
      return { ...state, errorMessage: '' }
    default:
      return state
  }
}