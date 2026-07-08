import type { ChangeEvent, FormEvent } from 'react'
import type { BoardDraft } from '../boardReducer'
import { handleTextareaKeyDown, preventEnterSubmit, resizeTextarea } from '../boardUi'

interface PostEditFormProps {
  postId: number
  draft: BoardDraft
  onNicknameChange: (postId: number, nickname: string) => void
  onContentChange: (postId: number, content: string) => void
  onSubmit: (event: FormEvent, postId: number) => void
  onCancel: (postId: number) => void
}

export function PostEditForm({
  postId,
  draft,
  onNicknameChange,
  onContentChange,
  onSubmit,
  onCancel,
}: PostEditFormProps) {
  const handleContentChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    onContentChange(postId, event.target.value)
    resizeTextarea(event.currentTarget)
  }

  return (
    <form className="edit-form post-edit-form" onSubmit={(event) => onSubmit(event, postId)} onKeyDown={preventEnterSubmit}>
      <div className="edit-status-row">게시글 수정 중</div>
      <input
        value={draft.nickname}
        onChange={(event) => onNicknameChange(postId, event.target.value)}
        maxLength={40}
        placeholder="익명"
        aria-label="게시글 수정 닉네임"
      />
      <textarea
        value={draft.content}
        onChange={handleContentChange}
        onKeyDown={handleTextareaKeyDown}
        rows={3}
        aria-label="게시글 수정 내용"
      />
      <div className="inline-actions">
        <button type="submit">수정 완료</button>
        <button className="ghost-button" type="button" onClick={() => onCancel(postId)}>취소</button>
      </div>
    </form>
  )
}
