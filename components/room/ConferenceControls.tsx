'use client'

import { useTrackToggle, useLocalParticipant } from '@livekit/components-react'
import { Track } from 'livekit-client'
import { useRouter } from 'next/navigation'
import { cn } from '@/utils/cn'

interface ControlBtnProps {
  onClick: () => void
  active?: boolean
  danger?: boolean
  label: string
  icon: string
  iconOff?: string
}

function ControlBtn({ onClick, active = true, danger, label, icon, iconOff }: ControlBtnProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex flex-col items-center gap-1 px-3 py-2 rounded-xl text-xs font-semibold transition-all',
        danger
          ? 'bg-red-500/20 hover:bg-red-500/30 text-red-400'
          : active
          ? 'bg-white/8 hover:bg-white/12 text-white'
          : 'bg-[#242E42] hover:bg-[#2d3748] text-slate-500',
      )}
    >
      <span className="text-xl">{active ? icon : (iconOff ?? icon)}</span>
      <span>{label}</span>
    </button>
  )
}

interface Props {
  onChatToggle: () => void
  chatOpen: boolean
  unreadCount?: number
}

export function ConferenceControls({ onChatToggle, chatOpen, unreadCount = 0 }: Props) {
  const router = useRouter()
  const { localParticipant } = useLocalParticipant()

  const cam = useTrackToggle({ source: Track.Source.Camera })
  const mic = useTrackToggle({ source: Track.Source.Microphone })
  const screen = useTrackToggle({ source: Track.Source.ScreenShare })

  return (
    <div className="flex items-center justify-center gap-2 px-4 py-3 bg-[#161B22] border-t border-white/10 flex-shrink-0">
      <ControlBtn
        onClick={() => cam.toggle()}
        active={cam.enabled}
        icon="📷"
        iconOff="🚫"
        label="카메라"
      />
      <ControlBtn
        onClick={() => mic.toggle()}
        active={mic.enabled}
        icon="🎤"
        iconOff="🔇"
        label="마이크"
      />
      <ControlBtn
        onClick={() => screen.toggle?.()}
        active={screen.enabled}
        icon="🖥️"
        label="화면공유"
      />

      <div className="w-px h-8 bg-white/10 mx-1" />

      <div className="relative">
        <ControlBtn
          onClick={onChatToggle}
          active={chatOpen}
          icon="💬"
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
        onClick={() => router.push('/dashboard')}
        danger
        icon="↩️"
        label="나가기"
      />
    </div>
  )
}
