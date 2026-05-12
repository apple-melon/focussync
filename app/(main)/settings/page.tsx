'use client'

import { useState } from 'react'
import { logout } from '@/app/(auth)/login/actions'
import { TIMER_DEFAULTS } from '@/config/constants'

type Tab = 'general' | 'notification' | 'game'

const TABS: { key: Tab; label: string }[] = [
  { key: 'general',      label: '일반' },
  { key: 'notification', label: '알림' },
  { key: 'game',         label: '게임' },
]

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!value)}
      className={`w-11 h-6 rounded-full transition-colors flex-shrink-0 relative ${value ? 'bg-[#6366F1]' : 'bg-[#242E42]'}`}
    >
      <span className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${value ? 'left-6' : 'left-1'}`} />
    </button>
  )
}

function Row({ label, desc, children }: { label: string; desc?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-white/5 last:border-0">
      <div>
        <p className="text-sm text-white font-medium">{label}</p>
        {desc && <p className="text-xs text-slate-500 mt-0.5">{desc}</p>}
      </div>
      {children}
    </div>
  )
}

export default function SettingsPage() {
  const [tab, setTab] = useState<Tab>('general')
  const [settings, setSettings] = useState({
    darkMode: true,
    focusMinutes: TIMER_DEFAULTS.FOCUS_MINUTES,
    breakMinutes: TIMER_DEFAULTS.SHORT_BREAK_MINUTES,
    soundEnabled: true,
    roomJoinAlert: true,
    achievementAlert: true,
    streakReminder: true,
    showXPGain: true,
    publicProfile: true,
    autoStartBreak: TIMER_DEFAULTS.AUTO_START_BREAK,
  })

  function set(key: keyof typeof settings, value: boolean | number) {
    setSettings((p) => ({ ...p, [key]: value }))
  }

  return (
    <div className="p-6 space-y-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-white">설정</h1>

      {/* Tab bar */}
      <div className="flex bg-[#161B22] border border-white/10 rounded-xl p-1 gap-1 w-fit">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === t.key ? 'bg-[#6366F1] text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="bg-[#161B22] border border-white/10 rounded-2xl p-5 space-y-1">
        {tab === 'general' && (
          <>
            <h3 className="text-xs text-slate-500 uppercase tracking-widest font-semibold mb-3">화면</h3>
            <Row label="다크 모드" desc="어두운 테마 사용">
              <Toggle value={settings.darkMode} onChange={(v) => set('darkMode', v)} />
            </Row>
            <Row label="공개 프로필" desc="다른 사용자가 내 프로필을 볼 수 있어요">
              <Toggle value={settings.publicProfile} onChange={(v) => set('publicProfile', v)} />
            </Row>

            <h3 className="text-xs text-slate-500 uppercase tracking-widest font-semibold mt-5 mb-3">타이머 기본값</h3>
            <Row label="집중 시간" desc={`현재: ${settings.focusMinutes}분`}>
              <select
                value={settings.focusMinutes}
                onChange={(e) => set('focusMinutes', Number(e.target.value))}
                className="bg-[#0D0F14] border border-white/10 text-white text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:border-[#6366F1]"
              >
                {[15, 20, 25, 30, 45, 50, 60].map((v) => <option key={v} value={v}>{v}분</option>)}
              </select>
            </Row>
            <Row label="휴식 시간" desc={`현재: ${settings.breakMinutes}분`}>
              <select
                value={settings.breakMinutes}
                onChange={(e) => set('breakMinutes', Number(e.target.value))}
                className="bg-[#0D0F14] border border-white/10 text-white text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:border-[#6366F1]"
              >
                {[3, 5, 7, 10, 15].map((v) => <option key={v} value={v}>{v}분</option>)}
              </select>
            </Row>
            <Row label="휴식 자동 시작">
              <Toggle value={settings.autoStartBreak} onChange={(v) => set('autoStartBreak', v)} />
            </Row>
          </>
        )}

        {tab === 'notification' && (
          <>
            <h3 className="text-xs text-slate-500 uppercase tracking-widest font-semibold mb-3">알림</h3>
            <Row label="알림 소리" desc="타이머 종료 시 소리 재생">
              <Toggle value={settings.soundEnabled} onChange={(v) => set('soundEnabled', v)} />
            </Row>
            <Row label="방 입장 알림" desc="친구가 집중방에 입장했을 때">
              <Toggle value={settings.roomJoinAlert} onChange={(v) => set('roomJoinAlert', v)} />
            </Row>
            <Row label="업적 알림" desc="새 업적 달성 시">
              <Toggle value={settings.achievementAlert} onChange={(v) => set('achievementAlert', v)} />
            </Row>
            <Row label="스트릭 리마인더" desc="오늘 공부를 안 했을 때 저녁 알림">
              <Toggle value={settings.streakReminder} onChange={(v) => set('streakReminder', v)} />
            </Row>
          </>
        )}

        {tab === 'game' && (
          <>
            <h3 className="text-xs text-slate-500 uppercase tracking-widest font-semibold mb-3">게임화</h3>
            <Row label="XP 획득 표시" desc="공부 후 얻은 XP를 화면에 표시">
              <Toggle value={settings.showXPGain} onChange={(v) => set('showXPGain', v)} />
            </Row>
          </>
        )}
      </div>

      {/* Account section */}
      <div className="bg-[#161B22] border border-white/10 rounded-2xl p-5 space-y-1">
        <h3 className="text-xs text-slate-500 uppercase tracking-widest font-semibold mb-3">계정</h3>
        <form action={logout}>
          <button
            type="submit"
            className="w-full text-left py-3 text-sm text-red-400 hover:text-red-300 font-medium transition-colors"
          >
            로그아웃
          </button>
        </form>
      </div>
    </div>
  )
}
