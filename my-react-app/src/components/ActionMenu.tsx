import { useEffect, useRef, useState } from 'react'

interface ActionMenuProps {
  label: string
  onEdit: () => void
  onDelete: () => void
}

export function ActionMenu({ label, onEdit, onDelete }: ActionMenuProps) {
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef<HTMLDetailsElement>(null)

  useEffect(() => {
    if (!isOpen) return undefined

    const handlePointerDown = (event: PointerEvent) => {
      if (menuRef.current?.contains(event.target as Node)) return
      setIsOpen(false)
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false)
      }
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen])

  const handleEdit = () => {
    setIsOpen(false)
    onEdit()
  }

  const handleDelete = () => {
    setIsOpen(false)
    onDelete()
  }

  return (
    <details className="action-menu" open={isOpen} ref={menuRef}>
      <summary
        aria-expanded={isOpen}
        aria-label={label}
        onClick={(event) => {
          event.preventDefault()
          setIsOpen((current) => !current)
        }}
      >
        ⋮
      </summary>
      <div className="action-menu-panel">
        <button onClick={handleEdit} type="button">수정</button>
        <button className="danger-menu-button" onClick={handleDelete} type="button">삭제</button>
      </div>
    </details>
  )
}
