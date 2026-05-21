import type { Message } from '../types'

interface Props {
  message: Message
}

export function MessageBubble({ message }: Props) {
  const isUser = message.role === 'user'

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[85%] rounded-lg px-3.5 py-2 text-sm leading-relaxed ${
          isUser
            ? 'bg-zinc-700 text-zinc-100'
            : 'bg-zinc-800/50 text-zinc-300 border border-zinc-700/50'
        }`}
      >
        <div className="whitespace-pre-wrap break-words">{message.content || (isUser ? '' : '...')}</div>
        <div className={`text-[10px] mt-1 ${isUser ? 'text-zinc-400 text-right' : 'text-zinc-500'}`}>
          {new Date(message.timestamp).toLocaleTimeString()}
        </div>
      </div>
    </div>
  )
}
