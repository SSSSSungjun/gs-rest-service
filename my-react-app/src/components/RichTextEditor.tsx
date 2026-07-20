import { useEffect, useRef } from 'react'
import type { ClipboardEvent, DragEvent, KeyboardEvent } from 'react'
import './RichTextEditor.css'

interface RichTextEditorProps {
  value: string
  placeholder: string
  onChange: (value: string) => void
  onPaste: (event: ClipboardEvent<HTMLDivElement>) => void
  onDragOver: (event: DragEvent<HTMLDivElement>) => void
  onDrop: (event: DragEvent<HTMLDivElement>) => void
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
}

function renderInline(value: string) {
  return escapeHtml(value)
    .replace(/\[size=(small|large)\]([\s\S]*?)\[\/size\]/g, '<span class="rich-text-size-$1">$2</span>')
    .replace(/\[u\]([\s\S]*?)\[\/u\]/g, '<u>$1</u>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/~~([^~]+)~~/g, '<s>$1</s>')
    .replace(/_([^_]+)_/g, '<em>$1</em>')
}

function valueToHtml(value: string) {
  if (!value) return ''

  return value.split('\n').map((line) => {
    const isHeading = line.startsWith('## ')
    const content = renderInline(isHeading ? line.slice(3) : line) || '<br>'
    return isHeading ? `<h2>${content}</h2>` : `<div>${content}</div>`
  }).join('')
}

function wrapInline(tagName: string, content: string, element: HTMLElement) {
  if (tagName === 'STRONG' || tagName === 'B') return `**${content}**`
  if (tagName === 'EM' || tagName === 'I') return `_${content}_`
  if (tagName === 'U') return `[u]${content}[/u]`
  if (tagName === 'S' || tagName === 'STRIKE' || tagName === 'DEL') return `~~${content}~~`

  if (tagName === 'FONT') {
    const size = element.getAttribute('size')
    if (size === '1' || size === '2') return `[size=small]${content}[/size]`
    if (size === '4' || size === '5' || size === '6' || size === '7') {
      return `[size=large]${content}[/size]`
    }
  }

  if (tagName === 'SPAN') {
    const fontSize = element.style.fontSize
    if (fontSize && Number.parseFloat(fontSize) <= 13) return `[size=small]${content}[/size]`
    if (fontSize && Number.parseFloat(fontSize) >= 20) return `[size=large]${content}[/size]`
  }

  return content
}

function serializeNode(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) return (node.textContent ?? '').replaceAll('\u00a0', ' ')
  if (!(node instanceof HTMLElement)) return ''

  const tagName = node.tagName
  if (tagName === 'BR') return '\n'

  const content = Array.from(node.childNodes).map(serializeNode).join('')
  if (tagName === 'H1' || tagName === 'H2' || tagName === 'H3') return `## ${content}\n`
  if (tagName === 'DIV' || tagName === 'P') return `${content}\n`

  return wrapInline(tagName, content, node)
}

function editorToValue(editor: HTMLDivElement) {
  return Array.from(editor.childNodes)
    .map(serializeNode)
    .join('')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/\n$/, '')
}

export function RichTextEditor({
  value,
  placeholder,
  onChange,
  onPaste,
  onDragOver,
  onDrop,
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null)
  const savedRangeRef = useRef<Range | null>(null)

  const saveSelection = () => {
    const editor = editorRef.current
    const selection = window.getSelection()
    if (!editor || !selection || selection.rangeCount === 0) return

    const range = selection.getRangeAt(0)
    if (editor.contains(range.commonAncestorContainer)) {
      savedRangeRef.current = range.cloneRange()
    }
  }

  const restoreSelection = () => {
    const selection = window.getSelection()
    if (!selection || !savedRangeRef.current) return

    selection.removeAllRanges()
    selection.addRange(savedRangeRef.current)
  }

  const emitValue = () => {
    const editor = editorRef.current
    if (!editor) return
    const nextValue = editorToValue(editor)
    if (nextValue !== value) onChange(nextValue)
    saveSelection()
  }

  const applyCommand = (command: string, commandValue?: string) => {
    const editor = editorRef.current
    if (!editor) return

    editor.focus()
    restoreSelection()
    document.execCommand(command, false, commandValue)
    emitValue()
  }

  const toggleHeading = () => {
    const currentBlock = String(document.queryCommandValue('formatBlock')).toLowerCase()
    applyCommand('formatBlock', currentBlock === 'h2' ? 'div' : 'h2')
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    event.stopPropagation()
    if (event.key !== 'Tab') return
    event.preventDefault()
    applyCommand('insertText', '\t')
  }

  useEffect(() => {
    const editor = editorRef.current
    if (!editor || editorToValue(editor) === value) return
    editor.innerHTML = valueToHtml(value)
  }, [value])

  useEffect(() => {
    editorRef.current?.focus()
  }, [])

  return (
    <div className="rich-text-editor-shell">
      <div className="composer-format-toolbar" role="toolbar" aria-label="글자 서식">
        <button type="button" onMouseDown={(event) => { event.preventDefault(); toggleHeading() }} aria-label="제목 서식" title="제목">Tt</button>
        <label className="rich-text-size-control">
          <span className="sr-only">글씨 크기</span>
          <select
            defaultValue="3"
            aria-label="글씨 크기"
            title="글씨 크기"
            onMouseDown={saveSelection}
            onChange={(event) => applyCommand('fontSize', event.target.value)}
          >
            <option value="2">작게</option>
            <option value="3">보통</option>
            <option value="5">크게</option>
          </select>
        </label>
        <button type="button" onMouseDown={(event) => { event.preventDefault(); applyCommand('bold') }} aria-label="굵게" title="굵게"><strong>B</strong></button>
        <button type="button" onMouseDown={(event) => { event.preventDefault(); applyCommand('italic') }} aria-label="기울임" title="기울임"><em>I</em></button>
        <button type="button" onMouseDown={(event) => { event.preventDefault(); applyCommand('underline') }} aria-label="밑줄" title="밑줄"><u>U</u></button>
        <button type="button" onMouseDown={(event) => { event.preventDefault(); applyCommand('strikeThrough') }} aria-label="취소선" title="취소선"><s>S</s></button>
      </div>
      <div
        ref={editorRef}
        className="rich-text-editor"
        contentEditable
        suppressContentEditableWarning
        role="textbox"
        aria-label="게시글 내용"
        aria-multiline="true"
        data-placeholder={placeholder}
        onInput={emitValue}
        onBlur={emitValue}
        onKeyUp={saveSelection}
        onMouseUp={saveSelection}
        onKeyDown={handleKeyDown}
        onPaste={onPaste}
        onDragOver={onDragOver}
        onDrop={onDrop}
      />
    </div>
  )
}