'use client'

import '@livekit/components-styles'
import { useCallback, useEffect, useRef, useState } from 'react'
import { LiveKitRoom, useConnectionState, useLocalParticipant } from '@livekit/components-react'
import { ConnectionState } from 'livekit-client'
import type { StudyRoom } from '@/types/room.types'
import { useRoom } from '@/hooks/room/useRoom'
import { useXP } from '@/hooks/dashboard/useXP'
import { PomodoroTimer } from '@/components/timer/PomodoroTimer'
import { VideoGrid } from './VideoGrid'
import { ChatBox } from './ChatBox'
import { ConferenceControls } from './ConferenceControls'
import { XPBar } from '@/components/dashboard/XPBar'
import { AchievementToast } from '@/components/dashboard/AchievementToast'
import { endStudySession, startStudySession } from '@/services/room.service'
import { notifyFriendsStudyStart } from '@/services/friend.service'
import type { Achievement } from '@/types/user.types'
import type { TimerPhase } from '@/types/timer.types'

type Status = 'idle' | 'focusing' | 'on_break'

const STATUS_OPTIONS: { value: Status; label: string; icon: string; color: string }[] = [
  { value: 'focusing', label: '집중 중', icon: '🔥', color: '#22C55E' },
  { value: 'on_break', label: '휴식 중', icon: '☕', color: '#EAB308' },
  { value: 'idle',     label: '대기',    icon: '💤', color: '#64748B' },
]

interface Props {
  room: StudyRoom
  userId: string
  displayName: string
  avatarUrl: string | null
  level: number
}

// ─── Inner component — has access to LiveKit context ─────────────────────────

function StudyRoomContent({ room, userId, displayName, avatarUrl, level }: Props) {
  const connState = useConnectionState()
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [pendingAchievement, setPendingAchievement] = useState<Achievement | null>(null)
  const [chatOpen, setChatOpen] = useState(false)
  const [currentStatus, setCurrentStatus] = useState<Status>('idle')
  const [unreadCount, setUnreadCount] = useState(0)
  const sessionStartedRef = useRef(false)

  const xp = useXP(userId)
  const { messages, sendMessage, updatePresence, broadcastTimer } = useRoom(
    room.id,
    { id: userId, displayName, avatarUrl, level },
  )

  const prevMsgCount = useRef(messages.length)
  useEffect(() => {
    if (!chatOpen && messages.length > prevMsgCount.current) {
      setUnreadCount((c) => c + (messages.length - prevMsgCount.current))
    }
    prevMsgCount.current = messages.length
  }, [messages.length, chatOpen])

  function openChat() {
    setChatOpen(true)
    setUnreadCount(0)
  }

  async function changeStatus(status: Status) {
    setCurrentStatus(status)
    await updatePresence({ status })
  }

  const handleSessionComplete = useCallback(async (focusMinutes: number) => {
    if (sessionId) await endStudySession(sessionId, focusMinutes)
    const result = await xp.awardSessionXP(focusMinutes, sessionId ?? '')
    if (result?.newAchievements?.length) setPendingAchievement(result.newAchievements[0])
    const newId = await startStudySession(room.id, userId)
    setSessionId(newId)
    setCurrentStatus('focusing')
    await updatePresence({ status: 'focusing' })
  }, [sessionId, xp, room.id, userId, updatePresence])

  const handleBroadcast = useCallback(async (phase: TimerPhase, timeLeft: number, sc: number) => {
    broadcastTimer({ type: 'timer_update', userId, phase, timeLeft, sessionCount: sc })
    const status: Status = phase === 'focus' ? 'focusing' : 'on_break'
    setCurrentStatus(status)
    updatePresence({ status })

    if (phase === 'focus' && !sessionStartedRef.current) {
      sessionStartedRef.current = true
      const newId = await startStudySession(room.id, userId)
      setSessionId(newId)
      notifyFriendsStudyStart(userId, room.id)
    }
  }, [broadcastTimer, userId, updatePresence, room.id])

  const activeOption = STATUS_OPTIONS.find((o) => o.value === currentStatus)!
  const isConnected = connState === ConnectionState.Connected

  return (
    <div className="fixed inset-0 z-50 bg-[#0D0F14] flex flex-col">
      {/* ─── Header ─────────────────────────────────────────────── */}
      <header className="flex items-center justify-between px-5 py-2.5 border-b border-white/10 bg-[#161B22] flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#6366F1] flex items-center justify-center text-sm">⏱</div>
          <div>
            <h1 className="font-bold text-white text-sm leading-tight">{room.name}</h1>
            {room.topic && <p className="text-xs text-slate-500">{room.topic}</p>}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Manual status selector */}
          <div className="flex items-center gap-0.5 bg-[#0D0F14] border border-white/10 rounded-xl p-1">
            {STATUS_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => changeStatus(opt.value)}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                  currentStatus === opt.value ? 'text-white' : 'text-slate-500 hover:text-slate-300'
                }`}
                style={currentStatus === opt.value
                  ? { background: `${opt.color}22`, color: opt.color }
                  : {}}
              >
                {opt.icon}
                <span className="hidden sm:inline">{opt.label}</span>
              </button>
            ))}
          </div>

          <span className="font-mono text-xs bg-[#0D0F14] border border-white/10 text-slate-400 px-2 py-1 rounded-lg">
            {room.code}
          </span>

          <span className={`flex items-center gap-1.5 text-xs ${isConnected ? 'text-[#22C55E]' : 'text-amber-400'}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-[#22C55E] animate-pulse' : 'bg-amber-400 animate-pulse'}`} />
            {isConnected ? '연결됨' : '연결 중…'}
          </span>
        </div>
      </header>

      {/* ─── Body ──────────────────────────────────────────────── */}
      <div className="flex-1 flex overflow-hidden min-h-0">

        {/* Left panel — Timer */}
        <aside className="w-72 flex-shrink-0 flex flex-col items-center justify-center gap-5 p-5 border-r border-white/10 bg-[#161B22]">
          <PomodoroTimer
            onSessionComplete={handleSessionComplete}
            onBroadcast={handleBroadcast}
          />

          {/* Current status pill */}
          <div
            className="flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold border"
            style={{
              color: activeOption.color,
              borderColor: `${activeOption.color}40`,
              background: `${activeOption.color}12`,
            }}
          >
            {activeOption.icon} {activeOption.label}
          </div>

          <div className="w-full">
            <XPBar xp={xp.xp} level={xp.level} current={xp.current} required={xp.required} pct={xp.pct} />
          </div>
        </aside>

        {/* Right panel — Video + optional chat */}
        <div className="flex-1 flex flex-col overflow-hidden min-h-0">
          <VideoGrid />

          {/* Chat panel — slides up when open */}
          {chatOpen && (
            <div className="h-60 flex-shrink-0 border-t border-white/10 bg-[#161B22] flex flex-col">
              <div className="flex items-center justify-between px-3 pt-2 pb-1">
                <span className="text-xs font-semibold text-slate-400">채팅</span>
                <button
                  onClick={() => setChatOpen(false)}
                  className="text-slate-600 hover:text-slate-400 text-sm"
                >
                  ✕
                </button>
              </div>
              <div className="flex-1 overflow-hidden px-3 pb-3">
                <ChatBox messages={messages} currentUserId={userId} onSend={sendMessage} />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ─── Control bar ───────────────────────────────────────── */}
      <ConferenceControls
        onChatToggle={chatOpen ? () => setChatOpen(false) : openChat}
        chatOpen={chatOpen}
        unreadCount={unreadCount}
      />

      <AchievementToast achievement={pendingAchievement} onDismiss={() => setPendingAchievement(null)} />
    </div>
  )
}

// ─── Outer component — fetches token, provides LiveKitRoom ───────────────────

export function RoomClient({ room, userId, displayName, avatarUrl, level }: Props) {
  const [token, setToken] = useState<string | null>(null)
  const [tokenError, setTokenError] = useState<string | null>(null)

  const liveKitUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL

  useEffect(() => {
    if (!liveKitUrl) return
    fetch(`/api/livekit?room=${encodeURIComponent(room.id)}&userId=${encodeURIComponent(userId)}&name=${encodeURIComponent(displayName)}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) setTokenError(data.error)
        else setToken(data.token)
      })
      .catch(() => setTokenError('서버에 연결할 수 없습니다'))
  }, [room.id, userId, displayName, liveKitUrl])

  // ── LiveKit not configured ──────────────────────────────────
  if (!liveKitUrl) {
    return (
      <div className="fixed inset-0 z-50 bg-[#0D0F14] flex flex-col items-center justify-center gap-4 p-8">
        <div className="text-5xl">⚠️</div>
        <h2 className="text-xl font-bold text-white">LiveKit 설정 필요</h2>
        <div className="bg-[#161B22] border border-amber-500/30 rounded-2xl p-5 max-w-md w-full space-y-3">
          <p className="text-sm text-amber-400 font-semibold">환경 변수를 추가해주세요:</p>
          <div className="bg-[#0D0F14] rounded-xl p-4 font-mono text-xs text-slate-300 space-y-1">
            <p>NEXT_PUBLIC_LIVEKIT_URL=wss://your-project.livekit.cloud</p>
            <p>LIVEKIT_API_KEY=APIxxxxxxxx</p>
            <p>LIVEKIT_API_SECRET=xxxxxxxxxxxxxxxx</p>
          </div>
          <p className="text-xs text-slate-500">
            LiveKit Cloud: <span className="text-[#6366F1]">cloud.livekit.io</span> 에서 무료로 시작하세요
          </p>
        </div>
        <a href="/dashboard" className="text-sm text-slate-400 hover:text-white mt-2">← 대시보드로 돌아가기</a>
      </div>
    )
  }

  // ── Loading / error state ──────────────────────────────────
  if (tokenError) {
    return (
      <div className="fixed inset-0 z-50 bg-[#0D0F14] flex flex-col items-center justify-center gap-3">
        <div className="text-4xl">❌</div>
        <p className="text-white font-semibold">연결 실패</p>
        <p className="text-sm text-slate-500">{tokenError}</p>
        <a href="/dashboard" className="text-sm text-[#6366F1] hover:underline">← 대시보드로</a>
      </div>
    )
  }

  if (!token) {
    return (
      <div className="fixed inset-0 z-50 bg-[#0D0F14] flex flex-col items-center justify-center gap-4">
        <div className="w-12 h-12 rounded-full border-2 border-[#6366F1]/30 border-t-[#6366F1] animate-spin" />
        <p className="text-slate-400 text-sm">집중방 연결 중…</p>
      </div>
    )
  }

  // ── Main: LiveKit provider ─────────────────────────────────
  return (
    <LiveKitRoom
      serverUrl={liveKitUrl}
      token={token}
      connect
      video
      audio
      onDisconnected={() => { window.location.href = '/dashboard' }}
    >
      <StudyRoomContent
        room={room}
        userId={userId}
        displayName={displayName}
        avatarUrl={avatarUrl}
        level={level}
      />
    </LiveKitRoom>
  )
}
