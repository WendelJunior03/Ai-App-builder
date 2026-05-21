import { useEffect, useRef } from 'react'
import { useAppStore } from '../stores/appStore'
import { useAppBuilder } from '../hooks/useAppBuilder'
import { MessageBubble } from './MessageBubble'
import { ChatInput } from './ChatInput'
import { ApprovalCard } from './ApprovalCard'

export function Chat() {
  const messages = useAppStore((s) => s.messages)
  const pendingApproval = useAppStore((s) => s.pendingApproval)
  const isStreaming = useAppStore((s) => s.isStreaming)
  const { sendMessage, approve } = useAppBuilder()
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, pendingApproval])

  return (
    <div className="h-full flex flex-col bg-zinc-900">
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <div className="flex items-center justify-center h-full text-zinc-500 text-sm">
            <div className="text-center space-y-2">
              <p className="text-lg font-medium text-zinc-400">AI App Builder</p>
              <p>Describe the app you want to build</p>
              <p className="text-xs text-zinc-600">e.g., "Create a sales dashboard with Recharts"</p>
            </div>
          </div>
        )}
        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}
        {pendingApproval && (
          <ApprovalCard request={pendingApproval} onApprove={(id) => approve(id, true)} onReject={(id) => approve(id, false)} />
        )}
        <div ref={bottomRef} />
      </div>
      <ChatInput onSend={sendMessage} disabled={isStreaming} />
    </div>
  )
}
