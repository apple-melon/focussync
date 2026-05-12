'use client'

import { useEffect, useState } from 'react'
import type { Achievement } from '@/types/user.types'

interface Props {
  achievement: Achievement | null
  onDismiss: () => void
}

export function AchievementToast({ achievement, onDismiss }: Props) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!achievement) return
    setVisible(true)
    const t = setTimeout(() => {
      setVisible(false)
      setTimeout(onDismiss, 300)
    }, 4000)
    return () => clearTimeout(t)
  }, [achievement, onDismiss])

  if (!achievement) return null

  return (
    <div
      className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl border border-[#EAB308]/30 bg-[#1C2333] shadow-[0_0_20px_rgba(234,179,8,0.3)] transition-all duration-300 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
    >
      <span className="text-3xl">{achievement.icon}</span>
      <div>
        <p className="text-xs text-[#EAB308] font-semibold uppercase tracking-wide">업적 달성!</p>
        <p className="text-sm text-white font-bold">{achievement.name}</p>
        <p className="text-xs text-slate-400">+{achievement.xp_reward} XP</p>
      </div>
      <button onClick={() => { setVisible(false); setTimeout(onDismiss, 300) }} className="ml-2 text-slate-500 hover:text-white text-lg">✕</button>
    </div>
  )
}
