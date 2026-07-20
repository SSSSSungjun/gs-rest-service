import { useEffect, useRef, useState } from 'react'
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
    .replace(/\[(color|mark)=(#[0-9a-f]{6})\]([\s\S]*?)\[\/\1\]/gi, (_, type, color, text) => (
      type.toLowerCase() === 'color'
        ? `<span style="color: ${color}">${text}</span>`
        : `<mark style="background-color: ${color}">${text}</mark>`
    ))
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

function normalizeCssColor(value: string | null) {
  if (!value) return null
  const normalized = value.trim().toLowerCase()

  if (/^#[0-9a-f]{6}$/.test(normalized)) return normalized
  if (/^#[0-9a-f]{3}$/.test(normalized)) {
    return `#${normalized.slice(1).split('').map((character) => character.repeat(2)).join('')}`
  }

  const rgb = normalized.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/)
  if (!rgb) return null

  return `#${rgb.slice(1, 4)
    .map((channel) => Math.min(255, Number(channel)).toString(16).padStart(2, '0'))
    .join('')}`
}

function wrapInline(tagName: string, content: string, element: HTMLElement) {
  let result = content

  if (tagName === 'STRONG' || tagName === 'B') return `**${result}**`
  if (tagName === 'EM' || tagName === 'I') return `_${result}_`
  if (tagName === 'U') return `[u]${result}[/u]`
  if (tagName === 'S' || tagName === 'STRIKE' || tagName === 'DEL') return `~~${result}~~`

  if (tagName === 'FONT') {
    const size = element.getAttribute('size')
    if (size === '1' || size === '2') result = `[size=small]${result}[/size]`
    if (size === '4' || size === '5' || size === '6' || size === '7') {
      result = `[size=large]${result}[/size]`
    }

    const color = normalizeCssColor(element.getAttribute('color') || element.style.color)
    if (color) result = `[color=${color}]${result}[/color]`
  }

  if (tagName === 'SPAN' || tagName === 'MARK') {
    const fontSize = element.style.fontSize
    if (fontSize && Number.parseFloat(fontSize) <= 13) result = `[size=small]${result}[/size]`
    if (fontSize && Number.parseFloat(fontSize) >= 20) result = `[size=large]${result}[/size]`

    const color = normalizeCssColor(element.style.color)
    if (color) result = `[color=${color}]${result}[/color]`

    const highlight = normalizeCssColor(element.style.backgroundColor)
    if (highlight) result = `[mark=${highlight}]${result}[/mark]`
  }

  return result
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
  const [textColor, setTextColor] = useState('#e5484d')
  const [highlightColor, setHighlightColor] = useState('#fff3a3')

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

    editor.focus({ preventScroll: true })
    restoreSelection()

    const isColorCommand = command === 'foreColor' || command === 'hiliteColor'
    if (isColorCommand) document.execCommand('styleWithCSS', false, 'true')

    const applied = document.execCommand(command, false, commandValue)
    if (command === 'hiliteColor' && !applied) {
      document.execCommand('backColor', false, commandValue)
    }

    if (isColorCommand) document.execCommand('styleWithCSS', false, 'false')
    emitValue()
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

  useEffect(() => {
    const trackEditorSelection = () => {
      const editor = editorRef.current
      const selection = window.getSelection()
      if (!editor || !selection || selection.rangeCount === 0) return

      const range = selection.getRangeAt(0)
      if (editor.contains(range.commonAncestorContainer)) {
        savedRangeRef.current = range.cloneRange()
      }
    }

    document.addEventListener('selectionchange', trackEditorSelection)
    return () => document.removeEventListener('selectionchange', trackEditorSelection)
  }, [])

  return (
    <div className="rich-text-editor-shell">
      <div className="composer-format-toolbar" role="toolbar" aria-label="글자 서식">
        <button type="button" onPointerDown={(event) => { event.preventDefault(); applyCommand('bold') }} aria-label="굵게">
          <span className="rich-text-format-glyph rich-text-format-bold" aria-hidden="true">가</span>
        </button>
        <button type="button" onPointerDown={(event) => { event.preventDefault(); applyCommand('underline') }} aria-label="밑줄">
          <span className="rich-text-format-glyph rich-text-format-underline" aria-hidden="true">가</span>
        </button>
        <label className="rich-text-color-control" aria-label="글자색 선택">
          <span className="rich-text-format-glyph rich-text-color-letter" style={{ color: textColor }} aria-hidden="true">가</span>
          <input
            type="color"
            value={textColor}
            aria-label="글자색 선택"
            onPointerDown={saveSelection}
            onChange={(event) => {
              setTextColor(event.target.value)
              applyCommand('foreColor', event.target.value)
            }}
          />
        </label>
        <label className="rich-text-color-control rich-text-highlight-control" aria-label="형광펜 색상 선택">
          <span className="rich-text-format-glyph rich-text-highlight-letter" style={{ backgroundColor: highlightColor }} aria-hidden="true">가</span>
          <input
            type="color"
            value={highlightColor}
            aria-label="형광펜 색상 선택"
            onPointerDown={saveSelection}
            onChange={(event) => {
              setHighlightColor(event.target.value)
              applyCommand('hiliteColor', event.target.value)
            }}
          />
        </label>
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
        onPointerUp={saveSelection}
        onKeyDown={handleKeyDown}
        onPaste={onPaste}
        onDragOver={onDragOver}
        onDrop={onDrop}
      />
    </div>
  )
}
