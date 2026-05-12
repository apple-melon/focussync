'use client'

import { useCallback, useState } from 'react'
import type { StudyRoom } from '@/types/room.types'
import { useRoom } from '@/hooks/room/useRoom'
import { usePomodoro } from '@/hooks/timer/usePomodoro'
import { useXP } from '@/hooks/dashboard/useXP'
import { PomodoroTimer } from '@/components/timer/PomodoroTimer'
import { ParticipantList } from './ParticipantList'
import { ChatBox } from './ChatBox'
import { XPBar } from '@/components/dashboard/XPBar'
import { AchievementToast } from '@/components/dashboard/AchievementToast'
import { endStudySession, startStudySession } from '@/services/room.service'
import type { Achievement } from '@/types/user.types'
import type { TimerPhase } from '@/types/timer.types'

interface Props {
  room: StudyRoom
  userId: string
  displayName: string
  avatarUrl: string | null
  level: number
}

export function RoomClient({ room, userId, displayName, avatarUrl, level }: Props) {
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [pendingAchievement, setPendingAchievement] = useState<Achievement | null>(null)

  const xp = useXP(userId)
  const { participants, messages, connected, sendMessage, updatePresence, broadcastTimer } = useRoom(
    room.id,
    { id: userId, displayName, avatarUrl, level },
  )

  const handleSessionComplete = useCallback(async (focusMinutes: number) => {
    if (sessionId) {
      await endStudySession(sessionId, focusMinutes)
    }
    const result = await xp.awardSessionXP(focusMinutes, sessionId ?? '')
    if (result?.newAchievements?.length) {
      setPendingAchievement(result.newAchievements[0])
    }
    const newId = await startStudySession(room.id, userId)
    setSessionId(newId)
    await updatePresence({ status: 'focusing' })
  }, [sessionId, xp, room.id, userId, updatePresence])

  const handleBroadcast = useCallback((phase: TimerPhase, timeLeft: number, sc: number) => {
    broadcastTimer({ type: 'timer_update', userId, phase, timeLeft, sessionCount: sc })
    updatePresence({ status: phase === 'focus' ? 'focusing' : 'on_break' })
  }, [broadcastTimer, userId, updatePresence])

  return (
    <div className="min-h-screen bg-[#0D0F14] flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-[#161B22]">
        <div>
          <h1 className="font-bold text-white">{room.name}</h1>
          {room.topic && <p className="text-xs text-slate-400">{room.topic}</p>}
        </div>
        <div className="flex items-center gap-3">
          <span className={`w-2 h-2 rounded-full ${connected ? 'bg-[#22C55E]' : 'bg-red-500'}`} />
          <span className="text-xs text-slate-400">{connected ? '연결됨' : '연결 중...'}</span>
          <span className="text-xs text-slate-500 font-mono bg-[#0D0F14] px-2 py-1 rounded border border-white/10">
            {room.code}
          </span>
        </div>
      </header>

      {/* Main layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left sidebar — participants */}
        <aside className="w-56 border-r border-white/10 bg-[#161B22] p-3 overflow-y-auto flex-shrink-0">
          <ParticipantList participants={participants} currentUserId={userId} />
        </aside>

        {/* Center — timer */}
        <main className="flex-1 flex flex-col items-center justify-center gap-6 p-6 overflow-y-auto">
          <PomodoroTimer
            onSessionComplete={handleSessionComplete}
            onBroadcast={handleBroadcast}
          />
          {/* XP bar */}
          <div className="w-72">
            <XPBar
              xp={xp.xp}
              level={xp.level}
              current={xp.current}
              required={xp.required}
              pct={xp.pct}
            />
          </div>
        </main>

        {/* Right sidebar — chat */}
        <aside className="w-72 border-l border-white/10 bg-[#161B22] p-3 flex flex-col overflow-hidden flex-shrink-0">
          <ChatBox
            messages={messages}
            currentUserId={userId}
            onSend={sendMessage}
          />
        </aside>
      </div>

      <AchievementToast
        achievement={pendingAchievement}
        onDismiss={() => setPendingAchievement(null)}
      />
    </div>
  )
}
