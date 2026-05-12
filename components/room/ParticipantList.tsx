'use client'

import type { Participant } from '@/types/room.types'
import { LevelBadge } from '@/components/dashboard/LevelBadge'

const STATUS_CONFIG = {
  focusing:  { color: 'bg-[#22C55E]', label: '집중 중',  ring: 'shadow-[0_0_6px_rgba(34,197,94,0.8)]' },
  on_break:  { color: 'bg-[#F59E0B]', label: '휴식 중',  ring: 'shadow-[0_0_6px_rgba(245,158,11,0.8)]' },
  idle:      { color: 'bg-slate-500',  label: '대기 중',  ring: '' },
}

interface Props {
  participants: Participant[]
  currentUserId: string
}

export function ParticipantList({ participants, currentUserId }: Props) {
  const focusing = participants.filter((p) => p.status === 'focusing').length
  const onBreak  = participants.filter((p) => p.status === 'on_break').length

  return (
    <div className="space-y-3 h-full flex flex-col">
      {/* Status summary */}
      <div className="flex gap-2">
        <div className="flex-1 bg-[#22C55E]/10 border border-[#22C55E]/20 rounded-xl px-3 py-2 text-center">
          <p className="text-lg font-bold text-[#22C55E]">{focusing}</p>
          <p className="text-xs text-slate-400">집중 중</p>
        </div>
        <div className="flex-1 bg-[#F59E0B]/10 border border-[#F59E0B]/20 rounded-xl px-3 py-2 text-center">
          <p className="text-lg font-bold text-[#F59E0B]">{onBreak}</p>
          <p className="text-xs text-slate-400">휴식 중</p>
        </div>
        <div className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-center">
          <p className="text-lg font-bold text-slate-400">{participants.length - focusing - onBreak}</p>
          <p className="text-xs text-slate-400">대기 중</p>
        </div>
      </div>

      {/* Participant list */}
      <div className="flex-1 overflow-y-auto space-y-1.5">
        {participants.map((p) => {
          const cfg = STATUS_CONFIG[p.status]
          const isMe = p.userId === currentUserId
          return (
            <div
              key={p.userId}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition-colors ${
                isMe ? 'bg-[#6366F1]/10 border border-[#6366F1]/20' : 'bg-[#0D0F14] hover:bg-[#242E42]'
              }`}
            >
              {/* Avatar with status ring */}
              <div className="relative flex-shrink-0">
                <div className="w-9 h-9 rounded-full bg-[#242E42] flex items-center justify-center text-sm font-bold overflow-hidden border border-white/10">
                  {p.avatarUrl
                    ? <img src={p.avatarUrl} alt={p.displayName} className="w-full h-full object-cover" />
                    : <span className="text-slate-300">{p.displayName[0]?.toUpperCase()}</span>}
                </div>
                <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#161B22] ${cfg.color} ${cfg.ring}`} />
              </div>

              {/* Name + status */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate leading-tight">
                  {p.displayName}
                  {isMe && <span className="text-xs text-slate-500 ml-1">(나)</span>}
                </p>
                <p className={`text-xs ${p.status === 'focusing' ? 'text-[#22C55E]' : p.status === 'on_break' ? 'text-[#F59E0B]' : 'text-slate-500'}`}>
                  {cfg.label}
                </p>
              </div>

              <LevelBadge level={p.level} size="sm" />
            </div>
          )
        })}
      </div>
    </div>
  )
}
