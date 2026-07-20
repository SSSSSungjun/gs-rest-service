import type { ReactNode } from 'react'
import { HighlightedText } from './HighlightedText'
import './FormattedText.css'

interface FormattedTextProps {
  text: string
  query: string
}

function renderInline(text: string, query: string, keyPrefix: string) {
  const tokens = text.split(/(\*\*[^*]+\*\*|~~[^~]+~~|_[^_]+_)/g).filter(Boolean)

  return tokens.map((token, index): ReactNode => {
    const key = `${keyPrefix}-${index}`
    if (token.startsWith('**') && token.endsWith('**')) {
      return <strong key={key}><HighlightedText text={token.slice(2, -2)} query={query} /></strong>
    }
    if (token.startsWith('~~') && token.endsWith('~~')) {
      return <del key={key}><HighlightedText text={token.slice(2, -2)} query={query} /></del>
    }
    if (token.startsWith('_') && token.endsWith('_')) {
      return <em key={key}><HighlightedText text={token.slice(1, -1)} query={query} /></em>
    }
    return <HighlightedText key={key} text={token} query={query} />
  })
}

export function FormattedText({ text, query }: FormattedTextProps) {
  return (
    <span className="formatted-text">
      {text.split('\n').map((line, index) => {
        const isHeading = line.startsWith('## ')
        const content = isHeading ? line.slice(3) : line
        return (
          <span className={isHeading ? 'formatted-line formatted-heading' : 'formatted-line'} key={index}>
            {renderInline(content, query, `line-${index}`)}
            {index < text.split('\n').length - 1 && <br />}
          </span>
        )
      })}
    </span>
  )
}
