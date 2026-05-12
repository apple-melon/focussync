'use client'

import { cn } from '@/utils/cn'
import type { TimerControls as TControls, TimerPhase } from '@/types/timer.types'

interface Props {
  isRunning: boolean
  phase: TimerPhase
  controls: TControls
}

export function TimerControls({ isRunning, phase, controls }: Props) {
  return (
    <div className="flex items-center gap-3 mt-6">
      {/* Stop */}
      <button
        onClick={controls.stop}
        className="w-10 h-10 rounded-full bg-[#1C2333] hover:bg-[#242E42] border border-white/10 text-slate-400 hover:text-white transition-colors flex items-center justify-center text-lg"
        title="정지"
      >
        ■
      </button>

      {/* Start / Pause */}
      <button
        onClick={isRunning ? controls.pause : controls.start}
        className={cn(
          'w-16 h-16 rounded-full font-bold text-xl transition-all shadow-lg flex items-center justify-center',
          isRunning
            ? 'bg-[#1C2333] hover:bg-[#242E42] border border-white/10 text-white hover:scale-105'
            : phase === 'focus'
              ? 'bg-[#6366F1] hover:bg-[#4F46E5] text-white hover:scale-105 shadow-[0_0_30px_rgba(99,102,241,0.4)]'
              : 'bg-[#22C55E] hover:bg-green-600 text-white hover:scale-105 shadow-[0_0_25px_rgba(34,197,94,0.4)]',
        )}
        title={isRunning ? '일시정지' : '시작'}
      >
        {isRunning ? '⏸' : '▶'}
      </button>

      {/* Skip */}
      <button
        onClick={controls.skip}
        className="w-10 h-10 rounded-full bg-[#1C2333] hover:bg-[#242E42] border border-white/10 text-slate-400 hover:text-white transition-colors flex items-center justify-center text-lg"
        title="다음 단계"
      >
        ⏭
      </button>
    </div>
  )
}
