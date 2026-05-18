'use client'

import { useTrackToggle } from '@livekit/components-react'
import { Track } from 'livekit-client'
import { cn } from '@/utils/cn'

interface IconBtnProps {
  onClick: () => void
  active?: boolean
  icon: string
  inactiveIcon?: string
  title: string
}

function IconBtn({ onClick, active = true, icon, inactiveIcon, title }: IconBtnProps) {
  const shown = active ? icon : (inactiveIcon ?? icon)
  return (
    <button
      onClick={onClick}
      title={title}
      className={cn(
        'w-12 h-12 rounded-xl flex items-center justify-center text-xl transition-all',
        active
          ? 'bg-white/8 hover:bg-white/14 text-white border border-white/10'
          : 'bg-[#242E42] hover:bg-[#2d3748] text-slate-500 border border-white/5',
      )}
    >
      {shown}
    </button>
  )
}

interface Props {
  onChatToggle: () => void
  chatOpen: boolean
  unreadCount?: number
}

export function ConferenceControls({ onChatToggle, chatOpen, unreadCount = 0 }: Props) {
  const cam = useTrackToggle({ source: Track.Source.Camera })
  const mic = useTrackToggle({ source: Track.Source.Microphone })

  return (
    <div className="flex items-center justify-center gap-2 px-4 py-3 bg-[#161B22] border-t border-white/10 flex-shrink-0">
      <IconBtn
        onClick={() => cam.toggle()}
        active={cam.enabled}
        icon="📷"
        inactiveIcon="🚫"
        title={cam.enabled ? '카메라 끄기' : '카메라 켜기'}
      />
      <IconBtn
        onClick={() => mic.toggle()}
        active={mic.enabled}
        icon="🎤"
        inactiveIcon="🔇"
        title={mic.enabled ? '음소거' : '마이크 켜기'}
      />

      <div className="w-px h-8 bg-white/10 mx-1" />

      <div className="relative">
        <IconBtn
          onClick={onChatToggle}
          active={chatOpen}
          icon="💬"
          title="채팅"
        />
        {unreadCount > 0 && !chatOpen && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-[9px] font-bold text-white flex items-center justify-center pointer-events-none">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </div>
    </div>
  )
}
