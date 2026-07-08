import type { ChangeEvent, FormEvent } from 'react'
import type { BoardDraft } from '../boardReducer'
import { handleTextareaKeyDown, preventEnterSubmit, resizeTextarea } from '../boardUi'

interface CommentEditFormProps {
  commentId: number
  draft: BoardDraft
  onNicknameChange: (commentId: number, nickname: string) => void
  onContentChange: (commentId: number, content: string) => void
  onSubmit: (event: FormEvent, commentId: number) => void
  onCancel: (commentId: number) => void
}

export function CommentEditForm({
  commentId,
  draft,
  onNicknameChange,
  onContentChange,
  onSubmit,
  onCancel,
}: CommentEditFormProps) {
  const handleContentChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    onContentChange(commentId, event.target.value)
    resizeTextarea(event.currentTarget)
  }

  return (
    <form className="comment-edit-form" onSubmit={(event) => onSubmit(event, commentId)} onKeyDown={preventEnterSubmit}>
      <div className="edit-status-row">댓글 수정 중</div>
      <input
        value={draft.nickname}
        onChange={(event) => onNicknameChange(commentId, event.target.value)}
        maxLength={40}
        placeholder="익명"
        aria-label="댓글 수정 닉네임"
      />
      <textarea
        value={draft.content}
        onChange={handleContentChange}
        onKeyDown={handleTextareaKeyDown}
        rows={1}
        aria-label="댓글 수정 내용"
      />
      <div className="inline-actions">
        <button type="submit">수정 완료</button>
        <button className="ghost-button" type="button" onClick={() => onCancel(commentId)}>취소</button>
      </div>
    </form>
  )
}
