export interface Post {
  id: number;
  nickname: string;
  content: string;
  anonymousToken: string; 
  createdAt: any;
}

export interface PostState {
  posts: Post[];
  isLoading: boolean;
  error: string | null;
}

export type PostAction =
  | { type: 'FETCH_START' }
  | { type: 'FETCH_SUCCESS'; payload: Post[] }
  | { type: 'FETCH_FAILURE'; payload: string }
  | { type: 'CREATE_SUCCESS' }
  | { type: 'DELETE_SUCCESS' }
  | { type: 'UPDATE_SUCCESS' };