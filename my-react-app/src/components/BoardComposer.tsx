import { useEffect, useRef, useState } from 'react'
import type { ChangeEvent, ClipboardEvent, DragEvent, FormEvent, KeyboardEvent as ReactKeyboardEvent } from 'react'
import type { PostImage } from '../boardApi'
import { handleTextareaKeyDown, preventEnterSubmit, resizeTextarea } from '../boardUi'
import { BarChart3Icon, CameraIcon, PlusIcon, SendIcon, SparklesIcon, Trash2Icon, XIcon } from './Icons'
import { ImageAttachmentFields } from './ImageAttachmentFields'
import '../composerLayout.css'
import './BoardComposer.css'

interface BoardComposerProps {
  nickname: string
  content: string
  images: PostImage[]
  pollOptions: string[]
  showImagesInContent: boolean
  isSubmitting: boolean
  isUploadingImage: boolean
  errorMessage: string
  onNicknameChange: (nickname: string) => void
  onContentChange: (event: ChangeEvent<HTMLTextAreaElement>) => void
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
  onApplyAiDraft: (content: string) => void
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
  nickname,
  content,
  images,
  pollOptions,
  showImagesInContent,
  isSubmitting,
  isUploadingImage,
  errorMessage,
  onNicknameChange,
  onContentChange,
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
  onApplyAiDraft,
  onSubmit,
}: BoardComposerProps) {
  const [isAttachmentMenuOpen, setIsAttachmentMenuOpen] = useState(false)
  const [isAiMode, setIsAiMode] = useState(false)
  const [aiPrompt, setAiPrompt] = useState('')
  const [isGeneratingAiDraft, setIsGeneratingAiDraft] = useState(false)
  const [aiErrorMessage, setAiErrorMessage] = useState('')
  const attachmentShellRef = useRef<HTMLDivElement>(null)
  const contentTextareaRef = useRef<HTMLTextAreaElement>(null)
  const aiRequestRef = useRef<AbortController | null>(null)
  const hasImages = images.length > 0
  const hasPoll = pollOptions.length > 0

  useEffect(() => {
    if (!isAttachmentMenuOpen) return

    const closeOnPointerDown = (event: PointerEvent) => {
      if (attachmentShellRef.current?.contains(event.target as Node)) return
      setIsAttachmentMenuOpen(false)
    }

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsAttachmentMenuOpen(false)
      }
    }

    window.addEventListener('pointerdown', closeOnPointerDown)
    window.addEventListener('keydown', closeOnEscape)
    return () => {
      window.removeEventListener('pointerdown', closeOnPointerDown)
      window.removeEventListener('keydown', closeOnEscape)
    }
  }, [isAttachmentMenuOpen])

  useEffect(() => {
    return () => aiRequestRef.current?.abort()
  }, [])

  const uploadImages = (files: File[]) => {
    if (files.length === 0) return
    onUploadImages(files)
    setIsAttachmentMenuOpen(false)
  }

  const handleFileInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    uploadImages(Array.from(event.target.files ?? []))
    event.currentTarget.value = ''
  }

  const handleStartPoll = () => {
    onStartPoll()
    setIsAttachmentMenuOpen(false)
  }

  const handleStartAiMode = () => {
    setIsAttachmentMenuOpen(false)
    setAiErrorMessage('')
    setIsAiMode(true)
  }

  const handleCancelAiMode = () => {
    aiRequestRef.current?.abort()
    aiRequestRef.current = null
    setIsGeneratingAiDraft(false)
    setAiErrorMessage('')
    setAiPrompt('')
    setIsAiMode(false)
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

      onApplyAiDraft(draft)
      setAiPrompt('')
      setIsAiMode(false)
      requestAnimationFrame(() => {
        if (contentTextareaRef.current) {
          resizeTextarea(contentTextareaRef.current)
          contentTextareaRef.current.focus()
        }
      })
    } catch (error) {
      if (!controller.signal.aborted) {
        setAiErrorMessage('AI 글 생성에 실패했습니다. 잠시 후 다시 시도해주세요.')
        console.error(error)
      }
    } finally {
      if (aiRequestRef.current === controller) {
        aiRequestRef.current = null
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

  const handlePaste = (event: ClipboardEvent<HTMLTextAreaElement>) => {
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

  const handleDragOver = (event: DragEvent<HTMLTextAreaElement>) => {
    if (event.dataTransfer.types.includes('Files') || event.dataTransfer.types.includes('text/uri-list')) {
      event.preventDefault()
    }
  }

  const handleDrop = (event: DragEvent<HTMLTextAreaElement>) => {
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

  return (
    <section className="composer composer-bottom" aria-label="게시글 작성">
      <form onSubmit={onSubmit} onKeyDown={preventEnterSubmit}>
        <div className="composer-draft-box">
          {hasImages && (
            <div className="composer-preview-strip">
              <ImageAttachmentFields
                images={images}
                showImagesInContent={showImagesInContent}
                isUploading={isUploadingImage}
                showSummary={false}
                showFilePicker={false}
                onUploadFiles={onUploadImages}
                onRemoveImage={onRemoveImage}
                onShowImagesInContentChange={onShowImagesInContentChange}
              />
            </div>
          )}

          {hasPoll && (
            <div className="composer-poll-editor">
              <div className="composer-poll-header">
                <strong><BarChart3Icon />투표</strong>
                <button className="text-button icon-text-button" type="button" onClick={onClearPoll}><Trash2Icon />삭제</button>
              </div>
              <div className="composer-poll-options">
                {pollOptions.map((option, index) => (
                  <div className="composer-poll-option-row" key={index}>
                    <input
                      value={option}
                      maxLength={80}
                      placeholder={`선택지 ${index + 1}`}
                      aria-label={`투표 선택지 ${index + 1}`}
                      onChange={(event) => onPollOptionChange(index, event.target.value)}
                    />
                    {pollOptions.length > 2 && (
                      <button className="text-button icon-text-button" type="button" onClick={() => onRemovePollOption(index)}><Trash2Icon />삭제</button>
                    )}
                  </div>
                ))}
              </div>
              {pollOptions.length < 5 && (
                <button className="ghost-button composer-poll-add icon-text-button" type="button" onClick={onAddPollOption}><PlusIcon />선택지 추가</button>
              )}
            </div>
          )}

          {isAiMode ? (
            <div className="composer-ai-mode">
              <div className="composer-ai-header">
                <strong className="composer-ai-title"><SparklesIcon />AI 글쓰기</strong>
                <button
                  className="composer-ai-cancel icon-only-button"
                  type="button"
                  aria-label="AI 글쓰기 취소"
                  title="AI 글쓰기 취소"
                  onClick={handleCancelAiMode}
                >
                  <XIcon />
                </button>
              </div>
              <textarea
                className="composer-ai-prompt"
                value={aiPrompt}
                maxLength={2000}
                rows={3}
                placeholder="어떤 내용과 말투로 글을 쓸지 설명해주세요."
                aria-label="AI 글쓰기 요청"
                onChange={(event) => setAiPrompt(event.target.value)}
                onKeyDown={handleAiPromptKeyDown}
                autoFocus
                disabled={isGeneratingAiDraft}
              />
              {aiErrorMessage && <p className="composer-ai-error" role="alert">{aiErrorMessage}</p>}
              <div className="composer-ai-actions">
                <p className="composer-ai-hint">생성된 글은 게시 전에 자유롭게 고칠 수 있습니다.</p>
                <button
                  className="composer-ai-generate"
                  type="button"
                  onClick={() => void handleGenerateAiDraft()}
                  disabled={isGeneratingAiDraft || !aiPrompt.trim()}
                >
                  <SparklesIcon />
                  {isGeneratingAiDraft ? '작성 중' : '글 생성'}
                </button>
              </div>
            </div>
          ) : (
            <div className="composer-input-shell" ref={attachmentShellRef}>
            <button
              className="composer-attach-button icon-only-button"
              type="button"
              aria-label="첨부 메뉴"
              aria-expanded={isAttachmentMenuOpen}
              onClick={() => setIsAttachmentMenuOpen((isOpen) => !isOpen)}
              disabled={isUploadingImage}
            >
              <PlusIcon />
            </button>
            <input
              className="composer-nickname-input"
              value={nickname}
              onChange={(event) => onNicknameChange(event.target.value)}
              maxLength={40}
              placeholder="익명"
              aria-label="게시글 닉네임"
            />
            <textarea
              ref={contentTextareaRef}
              className="composer-textarea"
              value={content}
              onChange={onContentChange}
              onKeyDown={handleTextareaKeyDown}
              onPaste={handlePaste}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              rows={1}
              placeholder="무슨 일이 있었나요?"
              aria-label="게시글 내용"
            />
            <button className="composer-submit-button icon-only-button" type="submit" disabled={isSubmitting || isUploadingImage} aria-label={isSubmitting ? '게시글 등록 중' : '게시글 등록'}>
              <SendIcon />
            </button>

            {isAttachmentMenuOpen && (
              <div className="composer-attachment-menu" role="menu">
                <label className={`composer-attachment-option ${isUploadingImage ? 'disabled' : ''}`} aria-label="사진 첨부">
                  <CameraIcon />
                  <span>사진</span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/gif,image/webp"
                    multiple
                    onChange={handleFileInputChange}
                    disabled={isUploadingImage}
                  />
                </label>
                <button className="composer-attachment-option" type="button" onClick={handleStartPoll} disabled={hasPoll} aria-label="투표 만들기">
                  <BarChart3Icon />
                  <span>투표</span>
                </button>
                <button className="composer-attachment-option" type="button" onClick={handleStartAiMode} aria-label="AI 글쓰기">
                  <SparklesIcon />
                  <span>AI 글쓰기</span>
                </button>
              </div>
            )}
            </div>
          )}
        </div>

        {errorMessage && <p className="form-error">{errorMessage}</p>}
      </form>
    </section>
  )
}
