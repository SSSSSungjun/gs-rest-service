import type { PollOption } from '../boardApi'
import './PollBlock.css'

interface PollBlockProps {
  postId: number
  options: PollOption[]
  totalVoteCount: number
  variant: 'list' | 'detail'
  onVote: (postId: number, optionId: number) => void
}

function getVotePercent(voteCount: number, totalVoteCount: number) {
  if (totalVoteCount === 0) return 0
  return Math.round((voteCount / totalVoteCount) * 100)
}

export function PollBlock({ postId, options, totalVoteCount, variant, onVote }: PollBlockProps) {
  if (options.length === 0) return null

  const hasVoted = options.some((option) => option.votedByMe)

  return (
    <div className={`poll-block ${variant === 'list' ? 'poll-block-list' : 'poll-block-detail'}`}>
      <div className="poll-block-header">
        <strong>투표</strong>
        <span>{totalVoteCount}명 참여</span>
      </div>
      <div className="poll-options">
        {options.map((option) => {
          const percent = getVotePercent(option.voteCount, totalVoteCount)
          return (
            <button
              className={`poll-option ${option.votedByMe ? 'selected' : ''}`}
              type="button"
              key={option.id}
              onClick={() => onVote(postId, option.id)}
              aria-pressed={option.votedByMe}
            >
              <span className="poll-option-fill" style={{ width: hasVoted ? `${percent}%` : '0%' }} />
              <span className="poll-option-content">{option.content}</span>
              <span className="poll-option-count">{hasVoted ? `${percent}% · ${option.voteCount}` : '투표'}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
