'use client'

import { cn } from '@/utils/cn'
import type { TimerPhase } from '@/types/timer.types'

const RADIUS = 88
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

const PHASE_COLORS: Record<TimerPhase, { stroke: string; glow: string; text: string }> = {
  focus:       { stroke: '#6366F1', glow: 'drop-shadow(0 0 12px rgba(99,102,241,0.7))', text: 'text-[#6366F1]' },
  short_break: { stroke: '#22C55E', glow: 'drop-shadow(0 0 12px rgba(34,197,94,0.7))',  text: 'text-[#22C55E]' },
  long_break:  { stroke: '#F59E0B', glow: 'drop-shadow(0 0 12px rgba(245,158,11,0.7))', text: 'text-[#F59E0B]' },
}

const SKIN_FOCUS: Record<string, { stroke: string; glow: string; text: string; icon: string }> = {
  timer_flame:  { stroke: '#F97316', glow: 'drop-shadow(0 0 14px rgba(249,115,22,0.8))', text: 'text-orange-400', icon: '🔥' },
  timer_ocean:  { stroke: '#06B6D4', glow: 'drop-shadow(0 0 14px rgba(6,182,212,0.8))',  text: 'text-cyan-400',   icon: '🌊' },
  timer_sakura: { stroke: '#EC4899', glow: 'drop-shadow(0 0 14px rgba(236,72,153,0.8))', text: 'text-pink-400',   icon: '🌸' },
}

const PHASE_LABELS: Record<TimerPhase, string> = {
  focus: '집중',
  short_break: '짧은 휴식',
  long_break: '긴 휴식',
}

interface Props {
  phase: TimerPhase
  timeLeft: number
  totalSeconds: number
  isRunning: boolean
  sessionCount: number
  skin?: string
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export function TimerRing({ phase, timeLeft, totalSeconds, isRunning, sessionCount, skin }: Props) {
  const pct = totalSeconds > 0 ? timeLeft / totalSeconds : 1
  const offset = CIRCUMFERENCE * (1 - pct)

  const skinData = skin && phase === 'focus' ? SKIN_FOCUS[skin] : null
  const color = skinData ?? PHASE_COLORS[phase]

  return (
    <div className="relative flex items-center justify-center" style={{ width: 224, height: 224 }}>
      {isRunning && (
        <div
          className="absolute inset-0 rounded-full animate-ping"
          style={{ border: `2px solid ${color.stroke}`, opacity: 0.2, animationDuration: '2s' }}
        />
      )}

      <svg width={224} height={224} className="-rotate-90">
        <circle cx={112} cy={112} r={RADIUS} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={10} />
        <circle
          cx={112} cy={112} r={RADIUS}
          fill="none"
          stroke={color.stroke}
          strokeWidth={10}
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.5s ease, stroke 0.3s ease', filter: color.glow }}
        />
      </svg>

      <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
        {skinData && phase === 'focus' && (
          <span className="text-xl leading-none mb-0.5 animate-pulse">{skinData.icon}</span>
        )}
        <span className={cn('font-mono text-5xl font-bold tabular-nums', color.text)}>
          {formatTime(Math.ceil(timeLeft))}
        </span>
        <span className="text-sm text-slate-400">{PHASE_LABELS[phase]}</span>
        <span className="text-xs text-slate-500">{sessionCount}회 완료</span>
      </div>
    </div>
  )
}
