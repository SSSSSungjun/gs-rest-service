interface ActionMenuProps {
  label: string
  onEdit: () => void
  onDelete: () => void
}

export function ActionMenu({ label, onEdit, onDelete }: ActionMenuProps) {
  return (
    <details className="action-menu">
      <summary aria-label={label}>⋮</summary>
      <div className="action-menu-panel">
        <button onClick={onEdit} type="button">수정</button>
        <button className="danger-menu-button" onClick={onDelete} type="button">삭제</button>
      </div>
    </details>
  )
}
