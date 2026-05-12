'use client'

import { getLevelTier } from '@/lib/xp/formulas'

interface Props {
  xp: number
  level: number
  current: number
  required: number
  pct: number
}

export function XPBar({ xp, level, current, required, pct }: Props) {
  const tier = getLevelTier(level)

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="font-semibold" style={{ color: tier.color }}>
          레벨 {level} <span className="text-xs font-normal text-slate-500">({tier.name})</span>
        </span>
        <span className="text-slate-400 font-mono text-xs">
          {current.toLocaleString()} / {required.toLocaleString()} XP
        </span>
      </div>
      <div className="h-2 bg-[#242E42] rounded-full overflow-hidden">
        <div
          className={`h-full bg-gradient-to-r ${tier.gradient} rounded-full transition-all duration-700`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-xs text-slate-500 text-right">총 {xp.toLocaleString()} XP</p>
    </div>
  )
}
