'use client'

import type { Participant } from '@/types/room.types'
import { LevelBadge } from '@/components/dashboard/LevelBadge'

const STATUS_COLORS = {
  focusing:  'bg-[#22C55E]',
  on_break:  'bg-[#F59E0B]',
  idle:      'bg-slate-500',
}

const STATUS_LABELS = {
  focusing:  '집중 중',
  on_break:  '휴식 중',
  idle:      '대기 중',
}

interface Props {
  participants: Participant[]
  currentUserId: string
}

export function ParticipantList({ participants, currentUserId }: Props) {
  return (
    <div className="space-y-2">
      <h3 className="text-xs text-slate-500 uppercase tracking-widest font-semibold px-1">
        참여자 {participants.length}명
      </h3>
      <div className="space-y-1">
        {participants.map((p) => (
          <div
            key={p.userId}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${p.userId === currentUserId ? 'bg-[#6366F1]/10 border border-[#6366F1]/20' : 'bg-[#1C2333] hover:bg-[#242E42]'}`}
          >
            {/* Avatar */}
            <div className="relative flex-shrink-0">
              <div className="w-8 h-8 rounded-full bg-[#242E42] flex items-center justify-center text-sm font-bold text-white overflow-hidden">
                {p.avatarUrl
                  ? <img src={p.avatarUrl} alt={p.displayName} className="w-full h-full object-cover" />
                  : p.displayName[0]?.toUpperCase()}
              </div>
              <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-[#161B22] ${STATUS_COLORS[p.status]}`} />
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <p className="text-sm text-white truncate font-medium">
                {p.displayName}{p.userId === currentUserId && <span className="text-xs text-slate-500 ml-1">(나)</span>}
              </p>
              <p className="text-xs text-slate-500">{STATUS_LABELS[p.status]}</p>
            </div>

            <LevelBadge level={p.level} size="sm" />
          </div>
        ))}
      </div>
    </div>
  )
}
