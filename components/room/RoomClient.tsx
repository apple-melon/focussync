'use client'

import { useCallback, useRef, useState } from 'react'
import Link from 'next/link'
import type { StudyRoom } from '@/types/room.types'
import { useRoom } from '@/hooks/room/useRoom'
import { useXP } from '@/hooks/dashboard/useXP'
import { PomodoroTimer } from '@/components/timer/PomodoroTimer'
import { ParticipantList } from './ParticipantList'
import { ChatBox } from './ChatBox'
import { XPBar } from '@/components/dashboard/XPBar'
import { AchievementToast } from '@/components/dashboard/AchievementToast'
import { endStudySession, startStudySession } from '@/services/room.service'
import { notifyFriendsStudyStart } from '@/services/friend.service'
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
  const [chatOpen, setChatOpen] = useState(true)
  const sessionStartedRef = useRef(false)

  const xp = useXP(userId)
  const { participants, messages, connected, sendMessage, updatePresence, broadcastTimer } = useRoom(
    room.id,
    { id: userId, displayName, avatarUrl, level },
  )

  const handleSessionComplete = useCallback(async (focusMinutes: number) => {
    if (sessionId) await endStudySession(sessionId, focusMinutes)
    const result = await xp.awardSessionXP(focusMinutes, sessionId ?? '')
    if (result?.newAchievements?.length) setPendingAchievement(result.newAchievements[0])
    const newId = await startStudySession(room.id, userId)
    setSessionId(newId)
    await updatePresence({ status: 'focusing' })
  }, [sessionId, xp, room.id, userId, updatePresence])

  const handleBroadcast = useCallback(async (phase: TimerPhase, timeLeft: number, sc: number) => {
    broadcastTimer({ type: 'timer_update', userId, phase, timeLeft, sessionCount: sc })
    updatePresence({ status: phase === 'focus' ? 'focusing' : 'on_break' })

    if (phase === 'focus' && !sessionStartedRef.current) {
      sessionStartedRef.current = true
      const newId = await startStudySession(room.id, userId)
      setSessionId(newId)
      notifyFriendsStudyStart(userId, room.id)
    }
  }, [broadcastTimer, userId, updatePresence, room.id])

  return (
    // fixed overlay — covers sidebar from (main) layout
    <div className="fixed inset-0 z-50 bg-[#0D0F14] flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-5 py-3 border-b border-white/10 bg-[#161B22] flex-shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-lg">⏱</span>
          <div>
            <h1 className="font-bold text-white text-sm leading-tight">{room.name}</h1>
            <p className="text-xs text-slate-500">
              👥 {participants.length}명 참여 중
              {room.topic && ` · ${room.topic}`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-500 font-mono bg-[#0D0F14] px-2 py-1 rounded border border-white/10">
            {room.code}
          </span>
          <span className={`flex items-center gap-1.5 text-xs ${connected ? 'text-[#22C55E]' : 'text-red-400'}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-[#22C55E] animate-pulse' : 'bg-red-400'}`} />
            {connected ? '연결됨' : '연결 중'}
          </span>
          <Link
            href="/dashboard"
            className="text-xs text-red-400 hover:text-red-300 font-semibold transition-colors px-3 py-1.5 rounded-lg hover:bg-red-500/10"
          >
            나가기
          </Link>
        </div>
      </header>

      {/* Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Center — timer */}
        <main className="flex-1 flex flex-col items-center justify-center gap-6 p-6 overflow-y-auto">
          <PomodoroTimer
            onSessionComplete={handleSessionComplete}
            onBroadcast={handleBroadcast}
          />
          <div className="w-72">
            <XPBar xp={xp.xp} level={xp.level} current={xp.current} required={xp.required} pct={xp.pct} />
          </div>
        </main>

        {/* Right panel */}
        <aside className="w-72 border-l border-white/10 bg-[#161B22] flex flex-col overflow-hidden flex-shrink-0">
          {/* Tabs */}
          <div className="flex border-b border-white/10 flex-shrink-0">
            <button
              onClick={() => setChatOpen(false)}
              className={`flex-1 py-2.5 text-xs font-semibold transition-colors ${!chatOpen ? 'text-white border-b-2 border-[#6366F1]' : 'text-slate-500 hover:text-slate-300'}`}
            >
              👥 참여자 {participants.length}
            </button>
            <button
              onClick={() => setChatOpen(true)}
              className={`flex-1 py-2.5 text-xs font-semibold transition-colors ${chatOpen ? 'text-white border-b-2 border-[#6366F1]' : 'text-slate-500 hover:text-slate-300'}`}
            >
              💬 채팅
            </button>
          </div>

          <div className="flex-1 overflow-hidden p-3">
            {chatOpen ? (
              <ChatBox messages={messages} currentUserId={userId} onSend={sendMessage} />
            ) : (
              <ParticipantList participants={participants} currentUserId={userId} />
            )}
          </div>
        </aside>
      </div>

      <AchievementToast achievement={pendingAchievement} onDismiss={() => setPendingAchievement(null)} />
    </div>
  )
}
