import type { PendingDelete } from '../boardReducer'

interface ConfirmDialogProps {
  pendingDelete: PendingDelete | null
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({ pendingDelete, onConfirm, onCancel }: ConfirmDialogProps) {
  if (!pendingDelete) return null

  return (
    <div className="modal-backdrop">
      <section className="confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="delete-dialog-title">
        <h2 id="delete-dialog-title">삭제할까요?</h2>
        <p>{pendingDelete.target === 'post' ? '이 글과 댓글이 함께 삭제됩니다.' : '이 댓글을 삭제합니다.'}</p>
        <div className="inline-actions">
          <button className="danger-solid-button" type="button" onClick={onConfirm}>삭제</button>
          <button className="ghost-button" type="button" onClick={onCancel}>취소</button>
        </div>
      </section>
    </div>
  )
}
