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

const STATUS_CONFIG: Record<Status, { label: string; icon: string; color: string }> = {
  focusing:  { label: '집중 중',  icon: '🔥', color: '#22C55E' },
  on_break:  { label: '휴식 중',  icon: '☕', color: '#EAB308' },
  idle:      { label: '대기',     icon: '💤', color: '#64748B' },
}

interface Props {
  room: StudyRoom
  userId: string
  displayName: string
  avatarUrl: string | null
  level: number
}

// ─── Away modal ──────────────────────────────────────────────────────────────

function AwayModal({ onConfirm, onCancel }: { onConfirm: (r: string) => void; onCancel: () => void }) {
  const [reason, setReason] = useState('')
  return (
    <div className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#1C2333] border border-white/15 rounded-2xl p-6 w-full max-w-sm space-y-4 shadow-2xl">
        <div>
          <h3 className="text-white font-bold text-lg">잠깐 자리를 비울게요</h3>
          <p className="text-slate-400 text-sm mt-1">이유를 입력하면 화면에 표시되고, 카메라·마이크가 꺼집니다.</p>
        </div>
        <input
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && reason.trim()) onConfirm(reason.trim()) }}
          placeholder="예: 화장실, 잠깐 외출, 물 마시러…"
          className="w-full bg-[#0D0F14] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-[#6366F1] transition-colors"
          autoFocus
        />
        <div className="flex gap-2">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 bg-[#242E42] hover:bg-[#2d3748] text-slate-300 text-sm font-semibold rounded-xl transition-colors"
          >
            취소
          </button>
          <button
            onClick={() => reason.trim() && onConfirm(reason.trim())}
            disabled={!reason.trim()}
            className="flex-1 py-2.5 bg-[#6366F1] hover:bg-[#4F46E5] disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl transition-colors"
          >
            대기 시작
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Away overlay (covers the whole room while user is away) ─────────────────

function AwayOverlay({ reason, onResume, onLeave }: { reason: string; onResume: () => void; onLeave: () => void }) {
  return (
    <div className="fixed inset-0 z-[60] bg-[#0D0F14]/90 backdrop-blur-2xl flex flex-col items-center justify-center gap-8">
      {/* Reason card */}
      <div className="flex flex-col items-center gap-4">
        <div className="w-24 h-24 rounded-full bg-[#6366F1]/10 border-2 border-[#6366F1]/30 flex items-center justify-center text-5xl animate-pulse">
          💤
        </div>
        <div className="text-center">
          <p className="text-slate-400 text-sm mb-2">지금 자리를 비우는 중이에요</p>
          <p className="text-5xl font-bold text-white tracking-tight">{reason}</p>
        </div>
        <p className="text-xs text-slate-600">카메라와 마이크가 꺼진 상태입니다</p>
      </div>

      {/* Action buttons */}
      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={onResume}
          className="px-8 py-3.5 bg-[#6366F1] hover:bg-[#4F46E5] text-white font-bold rounded-2xl transition-all shadow-[0_0_24px_rgba(99,102,241,0.5)] hover:scale-105 active:scale-95"
        >
          대기 해제
        </button>
        <button
          onClick={onLeave}
          className="px-8 py-3.5 bg-red-500/15 hover:bg-red-500/25 text-red-400 font-semibold rounded-2xl transition-colors border border-red-500/25"
        >
          집중방 나가기
        </button>
      </div>
    </div>
  )
}

// ─── Inner component — has access to LiveKit context ─────────────────────────

function StudyRoomContent({ room, userId, displayName, avatarUrl, level }: Props) {
  const connState = useConnectionState()
  const { localParticipant } = useLocalParticipant()

  const [sessionId, setSessionId] = useState<string | null>(null)
  const [pendingAchievement, setPendingAchievement] = useState<Achievement | null>(null)
  const [chatOpen, setChatOpen] = useState(false)
  const [currentStatus, setCurrentStatus] = useState<Status>('idle')
  const [unreadCount, setUnreadCount] = useState(0)
  const [showAwayModal, setShowAwayModal] = useState(false)
  const [awayReason, setAwayReason] = useState<string | null>(null)

  const sessionStartedRef = useRef(false)
  const camBeforeRef = useRef(true)
  const micBeforeRef = useRef(true)

  const xp = useXP(userId)
  const { messages, sendMessage, updatePresence, broadcastTimer } = useRoom(
    room.id,
    { id: userId, displayName, avatarUrl, level },
  )

  // Unread badge for chat
  const prevMsgCount = useRef(messages.length)
  useEffect(() => {
    if (!chatOpen && messages.length > prevMsgCount.current) {
      setUnreadCount((c) => c + (messages.length - prevMsgCount.current))
    }
    prevMsgCount.current = messages.length
  }, [messages.length, chatOpen])

  // ── Away mode helpers ─────────────────────────────────────────────────────

  async function startAway(reason: string) {
    camBeforeRef.current = localParticipant.isCameraEnabled
    micBeforeRef.current = localParticipant.isMicrophoneEnabled
    await localParticipant.setCameraEnabled(false)
    await localParticipant.setMicrophoneEnabled(false)
    await localParticipant.setAttributes({ awayReason: reason })
    setAwayReason(reason)
    setShowAwayModal(false)
  }

  async function resumeFromAway() {
    await localParticipant.setCameraEnabled(camBeforeRef.current)
    await localParticipant.setMicrophoneEnabled(micBeforeRef.current)
    await localParticipant.setAttributes({ awayReason: '' })
    setAwayReason(null)
  }

  function leaveRoom() {
    window.location.href = '/dashboard'
  }

  // ── Timer callbacks ───────────────────────────────────────────────────────

  const handleSessionComplete = useCallback(async (focusMinutes: number) => {
    if (sessionId) await endStudySession(sessionId, focusMinutes)
    const result = await xp.awardSessionXP(focusMinutes, sessionId ?? '')
    if (result?.newAchievements?.length) setPendingAchievement(result.newAchievements[0])
    const newId = await startStudySession(room.id, userId)
    setSessionId(newId)
  }, [sessionId, xp, room.id, userId])

  const handleBroadcast = useCallback(async (phase: TimerPhase, timeLeft: number, sc: number) => {
    broadcastTimer({ type: 'timer_update', userId, phase, timeLeft, sessionCount: sc })

    // Auto-update status from timer phase (only when not away)
    if (!awayReason) {
      const status: Status = phase === 'focus' ? 'focusing' : 'on_break'
      setCurrentStatus(status)
      updatePresence({ status })
    }

    if (phase === 'focus' && !sessionStartedRef.current) {
      sessionStartedRef.current = true
      const newId = await startStudySession(room.id, userId)
      setSessionId(newId)
      notifyFriendsStudyStart(userId, room.id)
    }
  }, [broadcastTimer, userId, updatePresence, room.id, awayReason])

  // ─────────────────────────────────────────────────────────────────────────

  const displayStatus = awayReason ? 'idle' : currentStatus
  const statusConf = STATUS_CONFIG[displayStatus]
  const isConnected = connState === ConnectionState.Connected

  return (
    <div className="fixed inset-0 z-50 bg-[#0D0F14] flex flex-col">

      {/* ─── Header ─────────────────────────────────────────────── */}
      <header className="flex items-center justify-between px-5 py-2.5 border-b border-white/10 bg-[#161B22] flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#6366F1] flex items-center justify-center text-sm shadow-[0_0_12px_rgba(99,102,241,0.4)]">
            ⏱
          </div>
          <div>
            <h1 className="font-bold text-white text-sm leading-tight">{room.name}</h1>
            {room.topic && <p className="text-xs text-slate-500">{room.topic}</p>}
          </div>
        </div>

        <div className="flex items-center gap-3">
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
        <aside className="w-72 flex-shrink-0 flex flex-col items-center justify-between py-5 px-4 border-r border-white/10 bg-[#161B22] overflow-y-auto">
          <div className="flex flex-col items-center gap-4 w-full">
            <PomodoroTimer
              onSessionComplete={handleSessionComplete}
              onBroadcast={handleBroadcast}
            />

            {/* Auto status pill */}
            <div
              className="flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold border"
              style={{
                color: statusConf.color,
                borderColor: `${statusConf.color}40`,
                background: `${statusConf.color}12`,
              }}
            >
              <span>{statusConf.icon}</span>
              <span>{statusConf.label}</span>
            </div>

            {/* 대기 button */}
            <button
              onClick={() => setShowAwayModal(true)}
              className="flex items-center gap-2 px-5 py-2 bg-[#242E42] hover:bg-[#2d3748] text-slate-400 hover:text-white text-sm font-semibold rounded-xl transition-colors border border-white/8 w-full justify-center"
            >
              💤 대기
            </button>
          </div>

          {/* XP bar at bottom */}
          <div className="w-full mt-4">
            <XPBar xp={xp.xp} level={xp.level} current={xp.current} required={xp.required} pct={xp.pct} />
          </div>
        </aside>

        {/* Right panel — Video grid + optional chat */}
        <div className="flex-1 flex flex-col overflow-hidden min-h-0">
          <VideoGrid />

          {chatOpen && (
            <div className="h-64 flex-shrink-0 border-t border-white/10 bg-[#161B22] flex flex-col">
              <div className="flex items-center justify-between px-3 pt-2.5 pb-1">
                <span className="text-xs font-semibold text-slate-400">💬 채팅</span>
                <button
                  onClick={() => setChatOpen(false)}
                  className="text-slate-600 hover:text-slate-400 text-sm leading-none"
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
        onChatToggle={() => {
          if (chatOpen) { setChatOpen(false) } else { setChatOpen(true); setUnreadCount(0) }
        }}
        chatOpen={chatOpen}
        unreadCount={unreadCount}
        onLeave={leaveRoom}
      />

      {/* ─── Modals / overlays ─────────────────────────────────── */}
      {showAwayModal && (
        <AwayModal
          onConfirm={startAway}
          onCancel={() => setShowAwayModal(false)}
        />
      )}

      {awayReason && (
        <AwayOverlay
          reason={awayReason}
          onResume={resumeFromAway}
          onLeave={leaveRoom}
        />
      )}

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

  if (!liveKitUrl) {
    return (
      <div className="fixed inset-0 z-50 bg-[#0D0F14] flex flex-col items-center justify-center gap-4 p-8">
        <div className="text-5xl">⚠️</div>
        <h2 className="text-xl font-bold text-white">LiveKit 설정 필요</h2>
        <div className="bg-[#161B22] border border-amber-500/30 rounded-2xl p-5 max-w-md w-full space-y-3">
          <p className="text-sm text-amber-400 font-semibold">Vercel 환경 변수에 추가하세요:</p>
          <div className="bg-[#0D0F14] rounded-xl p-4 font-mono text-xs text-slate-300 space-y-1">
            <p>NEXT_PUBLIC_LIVEKIT_URL=wss://your-project.livekit.cloud</p>
            <p>LIVEKIT_API_KEY=APIxxxxxxxxxxxxxxxx</p>
            <p>LIVEKIT_API_SECRET=xxxxxxxxxxxxxxxxxxxxxxxx</p>
          </div>
          <p className="text-xs text-slate-500">
            LiveKit Cloud: <span className="text-[#6366F1]">cloud.livekit.io</span> 에서 무료로 시작
          </p>
        </div>
        <a href="/dashboard" className="text-sm text-slate-400 hover:text-white mt-2">← 대시보드로 돌아가기</a>
      </div>
    )
  }

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
