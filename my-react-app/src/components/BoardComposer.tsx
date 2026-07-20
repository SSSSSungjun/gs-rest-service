import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { ChangeEvent, ClipboardEvent, DragEvent, FormEvent, KeyboardEvent as ReactKeyboardEvent } from 'react'
import type { PostImage } from '../boardApi'
import { preventEnterSubmit } from '../boardUi'
import {
  ArrowLeftIcon,
  BarChart3Icon,
  CameraIcon,
  PlusIcon,
  SparklesIcon,
  XIcon,
} from './Icons'
import { ImageAttachmentFields } from './ImageAttachmentFields'
import { RichTextEditor } from './RichTextEditor'
import { getComposerAvatarToken } from './avatarToken'
import '../composerLayout.css'
import './BoardComposer.css'
import './BoardComposerResponsive.css'
import './ComposerRefresh.css'

interface BoardComposerProps {
  mode?: 'create' | 'edit'
  preservedPollOptionCount?: number
  isOpen: boolean
  nickname: string
  content: string
  images: PostImage[]
  pollOptions: string[]
  showImagesInContent: boolean
  isSubmitting: boolean
  isUploadingImage: boolean
  errorMessage: string
  onOpen: () => void
  onClose: () => void
  onNicknameChange: (nickname: string) => void
  onContentChange?: (event: ChangeEvent<HTMLTextAreaElement>) => void
  onAddImageUrl: (url: string) => void
  onUploadImages: (files: File[]) => void
  onRemoveImage: (index: number) => void
  onStartPoll: () => void
  onPollOptionChange: (index: number, content: string) => void
  onAddPollOption: () => void
  onRemovePollOption: (index: number) => void
  onClearPoll: () => void
  onShowImagesInContentChange: (showImagesInContent: boolean) => void
  onGenerateAiDraft: (prompt: string, signal: AbortSignal) => Promise<string>
  onContentApply: (content: string) => void
  onSubmit: (event: FormEvent) => void
}
function getImageFiles(files: FileList | File[]) {
  return Array.from(files).filter((file) => file.type.startsWith('image/'))
}

function getPastedImageUrl(text: string) {
  const value = text.trim()
  if (!value) return null

  try {
    const parsedUrl = new URL(value)
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) return null
    if (/\.(avif|gif|jpe?g|png|webp)(\?.*)?$/i.test(parsedUrl.href)) {
      return parsedUrl.toString()
    }
  } catch {
    return null
  }

  return null
}

export function BoardComposer({
  mode = 'create',
  preservedPollOptionCount = 0,
  isOpen,
  nickname,
  content,
  images,
  pollOptions,
  showImagesInContent,
  isSubmitting,
  isUploadingImage,
  errorMessage,
  onOpen,
  onClose,
  onNicknameChange,
  onAddImageUrl,
  onUploadImages,
  onRemoveImage,
  onStartPoll,
  onPollOptionChange,
  onAddPollOption,
  onRemovePollOption,
  onClearPoll,
  onShowImagesInContentChange,
  onGenerateAiDraft,
  onContentApply,
  onSubmit,
}: BoardComposerProps) {
  const [isAiMode, setIsAiMode] = useState(false)  const [aiPrompt, setAiPrompt] = useState('')
  const [isGeneratingAiDraft, setIsGeneratingAiDraft] = useState(false)
  const [aiGenerationSeconds, setAiGenerationSeconds] = useState(0)
  const [aiErrorMessage, setAiErrorMessage] = useState('')
  const launcherRef = useRef<HTMLElement>(null)
  const aiRequestRef = useRef<AbortController | null>(null)
  const hasImages = images.length > 0
  const hasPoll = pollOptions.length > 0
  const composerAvatar = getComposerAvatarToken()

  const resetAiMode = () => {
    aiRequestRef.current?.abort()
    aiRequestRef.current = null
    setIsGeneratingAiDraft(false)
    setAiErrorMessage('')
    setAiPrompt('')
    setIsAiMode(false)
  }

  const handleCloseComposer = () => {
    resetAiMode()
    onClose()
  }

  useEffect(() => {
    return () => aiRequestRef.current?.abort()
  }, [])

  useEffect(() => {
    if (!isOpen) {
      aiRequestRef.current?.abort()
      aiRequestRef.current = null
      setIsGeneratingAiDraft(false)
      setAiErrorMessage('')
      setAiPrompt('')
      setIsAiMode(false)
      return
    }

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      if (isAiMode) {
        resetAiMode()
      } else {
        handleCloseComposer()
      }
    }
    window.addEventListener('keydown', closeOnEscape)    return () => {
      window.removeEventListener('keydown', closeOnEscape)
      document.body.style.overflow = previousOverflow
    }
  }, [isAiMode, isOpen])

  useEffect(() => {
    if (!isGeneratingAiDraft) {
      setAiGenerationSeconds(0)
      return
    }
    const startedAt = Date.now()
    const timer = window.setInterval(() => {
      setAiGenerationSeconds(Math.max(1, Math.floor((Date.now() - startedAt) / 1000)))
    }, 1000)

    return () => window.clearInterval(timer)
  }, [isGeneratingAiDraft])

  useLayoutEffect(() => {
    if (isOpen) return

    const launcher = launcherRef.current
    const boardShell = launcher?.closest<HTMLElement>('.board-shell')
    if (!launcher || !boardShell) return

    const syncReservedHeight = () => {
      boardShell.style.setProperty(
        '--composer-reserved-height',
        `${Math.ceil(launcher.getBoundingClientRect().height)}px`,
      )
    }

    syncReservedHeight()
    const observer = new ResizeObserver(syncReservedHeight)
    observer.observe(launcher)
    window.addEventListener('resize', syncReservedHeight)

    return () => {
      observer.disconnect()
      window.removeEventListener('resize', syncReservedHeight)
      boardShell.style.removeProperty('--composer-reserved-height')
    }
  }, [isOpen])

  const uploadImages = (files: File[]) => {
    if (files.length === 0) return
    onUploadImages(files)
  }
  const handleFileInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    uploadImages(Array.from(event.target.files ?? []))
    event.currentTarget.value = ''
  }

  const handleLauncherFileInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? [])
    if (files.length > 0) {
      onOpen()
      uploadImages(files)
    }
    event.currentTarget.value = ''
  }

  const handleStartAiMode = () => {
    setAiErrorMessage('')
    setIsAiMode(true)
  }

  const handleGenerateAiDraft = async () => {
    const prompt = aiPrompt.trim()
    if (!prompt) {
      setAiErrorMessage('어떤 글을 쓸지 입력해주세요.')
      return
    }

    const controller = new AbortController()
    aiRequestRef.current?.abort()
    aiRequestRef.current = controller
    setIsGeneratingAiDraft(true)
    setAiErrorMessage('')

    try {
      const draft = (await onGenerateAiDraft(prompt, controller.signal)).trim()
      if (controller.signal.aborted) return
      if (!draft) {
        setAiErrorMessage('생성된 글이 비어 있습니다. 요청을 조금 더 구체적으로 적어주세요.')
        return
      }

      onContentApply(draft)
      setAiPrompt('')
      setIsAiMode(false)
    } catch (error) {
      if (!controller.signal.aborted) {
        setAiErrorMessage('AI 글 생성에 실패했습니다. 잠시 후 다시 시도해주세요.')
        console.error(error)
      }
    } finally {
      if (aiRequestRef.current === controller) {        aiRequestRef.current = null
        setIsGeneratingAiDraft(false)
      }
    }
  }

  const handleAiPromptKeyDown = (event: ReactKeyboardEvent<HTMLTextAreaElement>) => {
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
      event.preventDefault()
      void handleGenerateAiDraft()
    }
  }

  const handlePaste = (event: ClipboardEvent<HTMLDivElement>) => {
    const pastedFiles = getImageFiles(event.clipboardData.files)
    if (pastedFiles.length > 0) {
      event.preventDefault()
      uploadImages(pastedFiles)
      return
    }

    const imageUrl = getPastedImageUrl(event.clipboardData.getData('text'))
    if (imageUrl) {
      event.preventDefault()
      onAddImageUrl(imageUrl)
    }
  }

  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    if (event.dataTransfer.types.includes('Files') || event.dataTransfer.types.includes('text/uri-list')) {
      event.preventDefault()
    }
  }

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    const droppedFiles = getImageFiles(event.dataTransfer.files)
    if (droppedFiles.length > 0) {
      event.preventDefault()
      uploadImages(droppedFiles)
      return
    }

    const imageUrl = getPastedImageUrl(event.dataTransfer.getData('text/uri-list') || event.dataTransfer.getData('text/plain'))
    if (imageUrl) {
      event.preventDefault()
      onAddImageUrl(imageUrl)
    }
  }

  if (!isOpen) {    return (
      <section ref={launcherRef} className="composer-launcher composer-bottom" aria-label="게시글 작성 열기">
        <span
          className={`composer-launcher-avatar post-avatar post-avatar-tone-${composerAvatar.tone}`}
          aria-hidden="true"
        >
          {composerAvatar.symbol}
        </span>
        <div className="composer-launcher-panel">
          <button className="composer-launcher-button" type="button" onClick={onOpen}>
            <span className="composer-launcher-placeholder">익명님, 어떤 이야기를 나누고 싶나요?</span>
          </button>
          <div className="composer-launcher-tools" aria-label="글쓰기 빠른 도구">
            <label className={`composer-launcher-tool ${isUploadingImage ? 'disabled' : ''}`} title="사진 첨부">
              <CameraIcon />
              <input
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp"
                multiple
                onChange={handleLauncherFileInputChange}
                disabled={isUploadingImage}
                aria-label="사진을 첨부하며 글쓰기 열기"
              />
            </label>
            <button
              className="composer-launcher-tool"
              type="button"
              onClick={() => {
                onStartPoll()
                onOpen()
              }}
              aria-label="투표를 만들며 글쓰기 열기"
              title="투표 만들기"
            >
              <BarChart3Icon />
            </button>
            <button
              className="composer-launcher-tool"
              type="button"
              onClick={() => {
                handleStartAiMode()
                onOpen()
              }}
              aria-label="AI 글쓰기로 열기"
              title="AI 글쓰기"
            >
              <SparklesIcon />
            </button>
          </div>
        </div>      </section>
    )
  }

  return (
    <section className="composer-screen" aria-label={mode === 'edit' ? '게시글 수정' : '게시글 작성'}>
      <form className="composer-screen-form" onSubmit={onSubmit} onKeyDown={preventEnterSubmit}>
        <header className="composer-screen-header">
          <button
            className="composer-screen-back icon-only-button"
            type="button"
            aria-label={mode === 'edit' ? '수정 화면 닫기' : '작성 화면 닫기'}
            title={mode === 'edit' ? '수정 화면 닫기' : '작성 화면 닫기'}
            onClick={handleCloseComposer}
          >
            <span className="composer-close-mobile"><ArrowLeftIcon /></span>
            <span className="composer-close-desktop"><XIcon /></span>
          </button>
          <strong>{mode === 'edit' ? '글 수정' : '글쓰기'}</strong>
        </header>

        <div className="composer-screen-scroll">
          <div className="composer-author-line">
            <input
              className="composer-screen-nickname"
              value={nickname}
              onChange={(event) => onNicknameChange(event.target.value)}
              maxLength={40}
              placeholder="익명"
              aria-label="게시글 닉네임"
            />
          </div>

          <RichTextEditor
            value={content}
            placeholder="무슨 일이 있었나요?"
            onChange={onContentApply}
            onPaste={handlePaste}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          />

          {hasImages && (
            <section className="composer-screen-section" aria-label="첨부한 사진">
              <ImageAttachmentFields
                images={images}
                showImagesInContent={showImagesInContent}
                isUploading={isUploadingImage}
                showSummary={false}
                showFilePicker={false}                showPreviewToggle={false}
                onUploadFiles={onUploadImages}
                onRemoveImage={onRemoveImage}
                onShowImagesInContentChange={onShowImagesInContentChange}
              />
            </section>
          )}

          {hasPoll && (
            <section className="composer-poll-editor" aria-label="투표 만들기">
              <div className="composer-poll-header">
                <button
                  className="composer-panel-close icon-only-button"
                  type="button"
                  onClick={onClearPoll}
                  aria-label="투표 삭제"
                  title="투표 삭제"
                >
                  <XIcon />
                </button>
              </div>
              <div className="composer-poll-options">
                {pollOptions.map((option, index) => (
                  <div className="composer-poll-option-row" key={index}>
                    <input
                      value={option}
                      maxLength={80}
                      placeholder={`선택지 ${index + 1}`}
                      aria-label={`투표 선택지 ${index + 1}`}
                      autoFocus={index === 0}
                      onChange={(event) => onPollOptionChange(index, event.target.value)}
                    />
                    {pollOptions.length > 2 && (
                      <button
                        className="text-button icon-only-button"
                        type="button"
                        aria-label={`선택지 ${index + 1} 삭제`}
                        title="선택지 삭제"
                        onClick={() => onRemovePollOption(index)}
                      >
                        <XIcon />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              {pollOptions.length < 5 && (
                <button className="ghost-button composer-poll-add icon-text-button" type="button" onClick={onAddPollOption}>
                  <PlusIcon />선택지 추가
                </button>              )}
            </section>
          )}

          {mode === 'edit' && preservedPollOptionCount > 0 && (
            <section className="composer-preserved-poll" aria-label="기존 투표 유지">
              <BarChart3Icon />
              <strong>기존 투표 유지</strong>
              <span>{preservedPollOptionCount}개 선택지</span>
            </section>
          )}

          {isAiMode && (
            <section className="composer-ai-mode" aria-label="AI 글쓰기">
              <div className="composer-ai-header">
                <button
                  className="composer-ai-cancel icon-only-button"
                  type="button"
                  aria-label="AI 글쓰기 취소"
                  title="AI 글쓰기 취소"
                  onClick={resetAiMode}
                >
                  <XIcon />
                </button>
              </div>
              <div className="composer-ai-prompt-shell">
                <textarea
                  className="composer-ai-prompt"
                  value={aiPrompt}
                  maxLength={2000}
                  rows={4}
                  placeholder="AI 글쓰기입니다. 원하는 내용과 말투를 자유롭게 적어주세요."
                  aria-label="AI 글쓰기 요청"
                  aria-busy={isGeneratingAiDraft}
                  onChange={(event) => setAiPrompt(event.target.value)}
                  onKeyDown={handleAiPromptKeyDown}
                  autoFocus
                  disabled={isGeneratingAiDraft}
                />
                {isGeneratingAiDraft && (
                  <div className="composer-ai-thinking" role="status" aria-live="polite">
                    <span className="composer-ai-spinner" aria-hidden="true" />
                    <span>
                      초안을 생각하고 있어요
                      {aiGenerationSeconds > 0 ? ` · ${aiGenerationSeconds}초` : '...'}
                    </span>
                  </div>
                )}
              </div>
              {aiErrorMessage && <p className="composer-ai-error" role="alert">{aiErrorMessage}</p>}              <div className="composer-ai-actions">
                <button
                  className="composer-ai-generate"
                  type="button"
                  onClick={() => void handleGenerateAiDraft()}
                  disabled={isGeneratingAiDraft || !aiPrompt.trim()}
                  aria-label={isGeneratingAiDraft ? 'AI 글 작성 중' : 'AI 글 생성'}
                  title={isGeneratingAiDraft ? 'AI 글 작성 중' : 'AI 글 생성'}
                >
                  <span className="composer-ai-submit-arrow" aria-hidden="true">↑</span>
                </button>
              </div>
            </section>
          )}

          {errorMessage && <p className="form-error" role="alert">{errorMessage}</p>}
        </div>

        <footer className="composer-screen-toolbar" aria-label="게시글 도구">
          <label
            className={`composer-tool-button ${isUploadingImage ? 'disabled' : ''}`}
            aria-label={isUploadingImage ? '사진 올리는 중' : '사진 첨부'}
            title={isUploadingImage ? '사진 올리는 중' : '사진 첨부'}
          >
            <CameraIcon />
            <input
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp"
              multiple
              onChange={handleFileInputChange}
              disabled={isUploadingImage}
            />
          </label>
          {mode === 'create' && (
            <button
              className={`composer-tool-button ${hasPoll ? 'active' : ''}`}
              type="button"
              aria-pressed={hasPoll}
              aria-label="투표 만들기"
              title="투표 만들기"
              onClick={onStartPoll}
            >
              <BarChart3Icon />
            </button>
          )}
          <button
            className={`composer-tool-button ${isAiMode ? 'active' : ''}`}
            type="button"
            aria-pressed={isAiMode}
            aria-label="AI 글쓰기"
            title="AI 글쓰기"
            onClick={handleStartAiMode}
          >
            <SparklesIcon />
          </button>        </footer>

        <footer className="composer-screen-actions">
          {hasImages && (
            <label className="composer-footer-preview-toggle">
              <input
                type="checkbox"
                checked={showImagesInContent}
                onChange={(event) => onShowImagesInContentChange(event.target.checked)}
              />
              <span>게시글 본문에서 사진 미리보기 표시</span>
            </label>
          )}
          <button
            className="composer-screen-submit"
            type="submit"
            disabled={isSubmitting || isUploadingImage || !content.trim()}
          >
            {isSubmitting ? '저장 중' : mode === 'edit' ? '수정' : '게시'}
          </button>
        </footer>
      </form>
    </section>
  )
}