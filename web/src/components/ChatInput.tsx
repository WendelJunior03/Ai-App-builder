import { useState, useRef, useEffect } from 'react'
import { Send, Square } from 'lucide-react'

interface Props {
  onSend: (message: string) => void
  disabled?: boolean
}

export function ChatInput({ onSend, disabled }: Props) {
  const [input, setInput] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (!disabled && textareaRef.current) {
      textareaRef.current.focus()
    }
  }, [disabled])

  const handleSend = () => {
    if (!input.trim() || disabled) return
    onSend(input.trim())
    setInput('')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="border-t border-zinc-800 p-3 bg-zinc-900">
      <div className="flex items-end gap-2">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Describe the app you want to build..."
          rows={2}
          disabled={disabled}
          className="flex-1 bg-zinc-800 text-zinc-100 rounded-lg px-3 py-2 text-sm resize-none outline-none focus:ring-1 focus:ring-zinc-500 placeholder-zinc-500 disabled:opacity-50"
        />
        <button
          onClick={disabled ? undefined : handleSend}
          disabled={disabled || !input.trim()}
          className="p-2 bg-zinc-700 hover:bg-zinc-600 disabled:opacity-40 rounded-lg transition-colors"
        >
          {disabled ? <Square size={16} /> : <Send size={16} />}
        </button>
      </div>
    </div>
  )
}
