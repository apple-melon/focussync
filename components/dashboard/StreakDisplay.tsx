'use client'

interface Props {
  streakDays: number
  isAtRisk: boolean
}

export function StreakDisplay({ streakDays, isAtRisk }: Props) {
  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${isAtRisk ? 'border-red-500/30 bg-red-500/10' : 'border-white/10 bg-[#1C2333]'}`}>
      <span className="text-xl">{streakDays > 0 ? '🔥' : '💤'}</span>
      <div>
        <p className="text-sm font-bold text-white">{streakDays}일 연속</p>
        {isAtRisk && (
          <p className="text-xs text-red-400">오늘 공부 안 하면 스트릭이 끊겨요!</p>
        )}
      </div>
    </div>
  )
}
