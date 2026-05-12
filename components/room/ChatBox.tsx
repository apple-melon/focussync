'use client'

import { useEffect, useRef, useState } from 'react'
import type { ChatMessage } from '@/types/room.types'
import { ROOM } from '@/config/constants'

interface Props {
  messages: ChatMessage[]
  currentUserId: string
  onSend: (content: string) => void
}

export function ChatBox({ messages, currentUserId, onSend }: Props) {
  const [input, setInput] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = () => {
    const content = input.trim()
    if (!content || content.length > ROOM.CHAT_MESSAGE_MAX_LENGTH) return
    onSend(content)
    setInput('')
  }

  return (
    <div className="flex flex-col h-full">
      <h3 className="text-xs text-slate-500 uppercase tracking-widest font-semibold px-1 pb-2 flex-shrink-0">채팅</h3>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-2 pr-1">
        {messages.map((msg) =>
          msg.isSystem ? (
            <p key={msg.id} className="text-xs text-slate-500 text-center py-1">{msg.content}</p>
          ) : (
            <div key={msg.id} className={`flex gap-2 ${msg.userId === currentUserId ? 'flex-row-reverse' : ''}`}>
              <div className="w-6 h-6 rounded-full bg-[#242E42] flex items-center justify-center text-xs font-bold flex-shrink-0">
                {msg.senderName[0]?.toUpperCase()}
              </div>
              <div className={`max-w-[80%] ${msg.userId === currentUserId ? 'items-end' : 'items-start'} flex flex-col gap-0.5`}>
                <span className="text-xs text-slate-500">{msg.senderName}</span>
                <div className={`px-3 py-1.5 rounded-xl text-sm break-words ${msg.userId === currentUserId ? 'bg-[#6366F1] text-white rounded-tr-sm' : 'bg-[#1C2333] text-slate-200 rounded-tl-sm'}`}>
                  {msg.content}
                </div>
              </div>
            </div>
          ),
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="flex gap-2 mt-3 flex-shrink-0">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
          placeholder="메시지 입력..."
          maxLength={ROOM.CHAT_MESSAGE_MAX_LENGTH}
          className="flex-1 bg-[#0D0F14] border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-[#6366F1] transition-colors"
        />
        <button
          onClick={handleSend}
          disabled={!input.trim()}
          className="px-3 py-1.5 bg-[#6366F1] hover:bg-[#4F46E5] disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg text-sm transition-colors"
        >
          전송
        </button>
      </div>
    </div>
  )
}
