import type { ReactNode } from 'react'

interface HighlightedTextProps {
  text: string
  query: string
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export function HighlightedText({ text, query }: HighlightedTextProps) {
  const normalizedQuery = query.trim()
  if (!normalizedQuery) return <>{text}</>

  const pattern = new RegExp(`(${escapeRegExp(normalizedQuery)})`, 'gi')
  const parts = text.split(pattern)
  const nodes: ReactNode[] = parts.map((part, index) => {
    if (part.toLocaleLowerCase().includes(normalizedQuery.toLocaleLowerCase()) && part.length === normalizedQuery.length) {
      return <mark className="search-highlight" key={`${part}-${index}`}>{part}</mark>
    }
    return part
  })

  return <>{nodes}</>
}
