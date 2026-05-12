'use client'

import { useEffect, useRef, useState } from 'react'
import type { ChatMessage } from '@/types/room.types'
import { ROOM } from '@/config/constants'
import { cn } from '@/utils/cn'

interface Props {
  messages: ChatMessage[]
  currentUserId: string
  onSend: (content: string) => void
}

const EMOJI_LIST = ['👍', '🔥', '💪', '😊', '🎯', '⚡', '🏆', '❤️']

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
}

function Avatar({ name, avatar, size = 7 }: { name: string; avatar: string | null; size?: number }) {
  const s = `w-${size} h-${size}`
  return (
    <div className={cn(s, 'rounded-full bg-[#242E42] flex items-center justify-center text-xs font-bold flex-shrink-0 overflow-hidden border border-white/10')}>
      {avatar
        ? <img src={avatar} alt={name} className="w-full h-full object-cover" />
        : <span className="text-slate-300">{name?.[0]?.toUpperCase() ?? '?'}</span>}
    </div>
  )
}

export function ChatBox({ messages, currentUserId, onSend }: Props) {
  const [input, setInput] = useState('')
  const [showEmoji, setShowEmoji] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = () => {
    const content = input.trim()
    if (!content || content.length > ROOM.CHAT_MESSAGE_MAX_LENGTH) return
    onSend(content)
    setInput('')
    setShowEmoji(false)
    inputRef.current?.focus()
  }

  const appendEmoji = (emoji: string) => {
    setInput((p) => p + emoji)
    setShowEmoji(false)
    inputRef.current?.focus()
  }

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-1 pb-2">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-slate-600 gap-2">
            <span className="text-3xl">💬</span>
            <p className="text-xs text-center">첫 메시지를 보내보세요!</p>
          </div>
        )}

        {messages.map((msg) => {
          if (msg.is_system) {
            return (
              <div key={msg.id} className="flex items-center gap-2 py-1">
                <div className="flex-1 h-px bg-white/5" />
                <span className="text-xs text-slate-600 px-2 flex-shrink-0">{msg.content}</span>
                <div className="flex-1 h-px bg-white/5" />
              </div>
            )
          }

          const isMe = msg.user_id === currentUserId
          return (
            <div key={msg.id} className={cn('flex gap-2 items-end', isMe && 'flex-row-reverse')}>
              {!isMe && <Avatar name={msg.sender_name} avatar={msg.sender_avatar} />}

              <div className={cn('max-w-[75%] flex flex-col gap-0.5', isMe ? 'items-end' : 'items-start')}>
                {!isMe && (
                  <span className="text-xs text-slate-500 px-1">{msg.sender_name}</span>
                )}
                <div
                  className={cn(
                    'px-3 py-2 rounded-2xl text-sm break-words leading-relaxed',
                    isMe
                      ? 'bg-[#6366F1] text-white rounded-br-sm shadow-[0_2px_12px_rgba(99,102,241,0.3)]'
                      : 'bg-[#242E42] text-slate-200 rounded-bl-sm',
                  )}
                >
                  {msg.content}
                </div>
                <span className="text-[10px] text-slate-600 px-1">
                  {msg.created_at ? formatTime(msg.created_at) : ''}
                </span>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* Emoji picker */}
      {showEmoji && (
        <div className="flex flex-wrap gap-1 p-2 bg-[#0D0F14] rounded-xl border border-white/10 mb-2">
          {EMOJI_LIST.map((e) => (
            <button
              key={e}
              onClick={() => appendEmoji(e)}
              className="text-lg hover:scale-125 transition-transform p-0.5"
            >
              {e}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <button
          onClick={() => setShowEmoji((p) => !p)}
          className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors flex-shrink-0 text-base"
        >
          😊
        </button>
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
          }}
          placeholder="메시지 입력..."
          maxLength={ROOM.CHAT_MESSAGE_MAX_LENGTH}
          className="flex-1 bg-[#0D0F14] border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-[#6366F1] transition-colors min-w-0"
        />
        <button
          onClick={handleSend}
          disabled={!input.trim()}
          className="w-8 h-8 flex items-center justify-center bg-[#6366F1] hover:bg-[#4F46E5] disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl transition-colors flex-shrink-0 text-sm"
        >
          ➤
        </button>
      </div>
    </div>
  )
}
