'use client'

import { useState, useEffect } from 'react'
import type { TimerSettings as TSettings, TimerControls } from '@/types/timer.types'
import { TIMER_LIMITS } from '@/config/constants'

interface Props {
  settings: TSettings
  controls: TimerControls
}

interface SliderProps {
  label: string
  value: number
  min: number
  max: number
  onChange: (v: number) => void
  unit?: string
}

function Slider({ label, value, min, max, onChange, unit = '분' }: SliderProps) {
  const [inputStr, setInputStr] = useState(String(value))

  useEffect(() => { setInputStr(String(value)) }, [value])

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    setInputStr(e.target.value)
    const n = Number(e.target.value)
    if (!isNaN(n) && n >= min && n <= max) onChange(n)
  }

  function handleInputBlur() {
    const n = Math.max(min, Math.min(max, Number(inputStr) || min))
    setInputStr(String(n))
    onChange(n)
  }

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="text-slate-400">{label}</span>
        <div className="flex items-center gap-1.5">
          <input
            type="number"
            min={min}
            max={max}
            value={inputStr}
            onChange={handleInputChange}
            onBlur={handleInputBlur}
            className="w-12 bg-[#0D0F14] border border-white/10 rounded-lg px-2 py-0.5 text-white font-mono text-sm text-center focus:outline-none focus:border-[#6366F1] transition-colors"
          />
          <span className="text-slate-400 text-sm">{unit}</span>
        </div>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => {
          const n = Number(e.target.value)
          setInputStr(String(n))
          onChange(n)
        }}
        className="w-full accent-[#6366F1]"
      />
    </div>
  )
}

interface ToggleProps {
  label: string
  value: boolean
  onChange: (v: boolean) => void
}

function Toggle({ label, value, onChange }: ToggleProps) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-slate-400">{label}</span>
      <button
        onClick={() => onChange(!value)}
        className={`w-11 h-6 rounded-full transition-colors ${value ? 'bg-[#6366F1]' : 'bg-[#242E42]'}`}
      >
        <span className={`block w-4 h-4 rounded-full bg-white transition-transform mx-1 ${value ? 'translate-x-5' : 'translate-x-0'}`} />
      </button>
    </div>
  )
}

export function TimerSettings({ settings, controls }: Props) {
  const [open, setOpen] = useState(false)

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="text-slate-500 hover:text-slate-300 transition-colors text-sm mt-2"
      >
        ⚙ 설정
      </button>
    )
  }

  return (
    <div className="mt-4 w-72 bg-[#1C2333] border border-white/10 rounded-xl p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white">타이머 설정</h3>
        <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-white text-lg">✕</button>
      </div>

      <Slider
        label="집중 시간"
        value={settings.focusMinutes}
        min={TIMER_LIMITS.FOCUS_MIN}
        max={TIMER_LIMITS.FOCUS_MAX}
        onChange={(v) => controls.updateSettings({ focusMinutes: v })}
      />
      <Slider
        label="짧은 휴식"
        value={settings.shortBreakMinutes}
        min={TIMER_LIMITS.SHORT_BREAK_MIN}
        max={TIMER_LIMITS.SHORT_BREAK_MAX}
        onChange={(v) => controls.updateSettings({ shortBreakMinutes: v })}
      />
      <Slider
        label="긴 휴식"
        value={settings.longBreakMinutes}
        min={TIMER_LIMITS.LONG_BREAK_MIN}
        max={TIMER_LIMITS.LONG_BREAK_MAX}
        onChange={(v) => controls.updateSettings({ longBreakMinutes: v })}
      />

      <Toggle
        label="휴식 자동 시작"
        value={settings.autoStartBreak}
        onChange={(v) => controls.updateSettings({ autoStartBreak: v })}
      />
      <Toggle
        label="집중 자동 시작"
        value={settings.autoStartFocus}
        onChange={(v) => controls.updateSettings({ autoStartFocus: v })}
      />
      <Toggle
        label="타이머 공유"
        value={settings.broadcastTimer}
        onChange={(v) => controls.updateSettings({ broadcastTimer: v })}
      />
    </div>
  )
}
