'use client'

import { useTrackToggle } from '@livekit/components-react'
import { Track } from 'livekit-client'
import { cn } from '@/utils/cn'

interface ControlBtnProps {
  onClick: () => void
  active?: boolean
  danger?: boolean
  label: string
  activeIcon: string
  inactiveIcon?: string
}

function ControlBtn({ onClick, active = true, danger, label, activeIcon, inactiveIcon }: ControlBtnProps) {
  const icon = active ? activeIcon : (inactiveIcon ?? activeIcon)
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex flex-col items-center gap-1 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all',
        danger
          ? 'bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30'
          : active
          ? 'bg-white/8 hover:bg-white/12 text-white border border-white/10'
          : 'bg-[#242E42] hover:bg-[#2d3748] text-slate-500 border border-white/5',
      )}
    >
      <span className="text-xl">{icon}</span>
      <span>{label}</span>
    </button>
  )
}

interface Props {
  onChatToggle: () => void
  chatOpen: boolean
  unreadCount?: number
  onLeave: () => void
}

export function ConferenceControls({ onChatToggle, chatOpen, unreadCount = 0, onLeave }: Props) {
  const cam = useTrackToggle({ source: Track.Source.Camera })
  const mic = useTrackToggle({ source: Track.Source.Microphone })

  return (
    <div className="flex items-center justify-center gap-2 px-4 py-3 bg-[#161B22] border-t border-white/10 flex-shrink-0">
      <ControlBtn
        onClick={() => cam.toggle()}
        active={cam.enabled}
        activeIcon="📷"
        inactiveIcon="🚫"
        label={cam.enabled ? '카메라' : '카메라 꺼짐'}
      />
      <ControlBtn
        onClick={() => mic.toggle()}
        active={mic.enabled}
        activeIcon="🎤"
        inactiveIcon="🔇"
        label={mic.enabled ? '마이크' : '음소거'}
      />

      <div className="w-px h-8 bg-white/10 mx-1" />

      <div className="relative">
        <ControlBtn
          onClick={onChatToggle}
          active={chatOpen}
          activeIcon="💬"
          label="채팅"
        />
        {unreadCount > 0 && !chatOpen && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-[9px] font-bold text-white flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </div>

      <div className="w-px h-8 bg-white/10 mx-1" />

      <ControlBtn
        onClick={onLeave}
        danger
        activeIcon="↩️"
        label="나가기"
      />
    </div>
  )
}
