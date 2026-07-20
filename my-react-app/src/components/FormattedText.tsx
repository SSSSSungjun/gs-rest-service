import type { ReactNode } from 'react'
import { HighlightedText } from './HighlightedText'
import './FormattedText.css'

interface FormattedTextProps {
  text: string
  query: string
}

function renderInline(text: string, query: string, keyPrefix: string): ReactNode[] {
  const inlinePattern = /\[(color|mark)=(#[0-9a-fA-F]{6})\]([^\n]*?)\[\/\1\]|\[size=(small|large)\]([^\n]*?)\[\/size\]|\[u\]([^\n]*?)\[\/u\]|\*\*([^*]+)\*\*|~~([^~]+)~~|_([^_]+)_/g
  const nodes: ReactNode[] = []
  let cursor = 0
  let match: RegExpExecArray | null
  let index = 0
  while ((match = inlinePattern.exec(text)) !== null) {
    if (match.index > cursor) {
      nodes.push(
        <HighlightedText
          key={`${keyPrefix}-plain-${index}`}
          text={text.slice(cursor, match.index)}
          query={query}
        />,
      )
    }

    const key = `${keyPrefix}-format-${index}`
    if (match[1] === 'color') {
      nodes.push(
        <span style={{ color: match[2] }} key={key}>
          {renderInline(match[3], query, key)}
        </span>,
      )
    } else if (match[1] === 'mark') {
      nodes.push(
        <mark style={{ backgroundColor: match[2] }} key={key}>
          {renderInline(match[3], query, key)}
        </mark>,
      )
    } else if (match[4]) {
      nodes.push(
        <span className={`formatted-size-${match[4]}`} key={key}>
          {renderInline(match[5], query, key)}
        </span>,
      )
    } else if (match[6] !== undefined) {
      nodes.push(<u key={key}>{renderInline(match[6], query, key)}</u>)
    } else if (match[7] !== undefined) {
      nodes.push(<strong key={key}>{renderInline(match[7], query, key)}</strong>)
    } else if (match[8] !== undefined) {
      nodes.push(<del key={key}>{renderInline(match[8], query, key)}</del>)
    } else if (match[9] !== undefined) {
      nodes.push(<em key={key}>{renderInline(match[9], query, key)}</em>)
    }

    cursor = inlinePattern.lastIndex
    index += 1
  }

  if (cursor < text.length) {
    nodes.push(
      <HighlightedText
        key={`${keyPrefix}-plain-${index}`}
        text={text.slice(cursor)}
        query={query}
      />,
    )
  }

  return nodes
}

export function FormattedText({ text, query }: FormattedTextProps) {
  const lines = text.split('\n')

  return (
    <span className="formatted-text">
      {lines.map((line, index) => {
        const isHeading = line.startsWith('## ')
        const content = isHeading ? line.slice(3) : line
        return (
          <span className={isHeading ? 'formatted-line formatted-heading' : 'formatted-line'} key={index}>
            {renderInline(content, query, `line-${index}`)}
            {index < lines.length - 1 && <br />}
          </span>
        )
      })}
    </span>
  )
}
