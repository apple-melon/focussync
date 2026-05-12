'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Participant, ChatMessage, TimerBroadcast, PresencePayload } from '@/types/room.types'
import { getChatMessages, saveChatMessage } from '@/services/room.service'
import type { RealtimeChannel } from '@supabase/supabase-js'

export function useRoom(
  roomId: string,
  currentUser: { id: string; displayName: string; avatarUrl: string | null; level: number },
) {
  const [participants, setParticipants] = useState<Participant[]>([])
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [connected, setConnected] = useState(false)
  const channelRef = useRef<RealtimeChannel | null>(null)

  function addMessage(msg: ChatMessage) {
    setMessages((prev) => {
      if (prev.some((m) => m.id === msg.id)) return prev
      return [...prev, msg]
    })
  }

  useEffect(() => {
    const supabase = createClient()
    const channel = supabase.channel(`room:${roomId}`, {
      config: { presence: { key: currentUser.id } },
    })
    channelRef.current = channel

    // Presence sync
    channel.on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState<PresencePayload>()
      const list: Participant[] = Object.values(state).flatMap((presences) =>
        presences.map((p) => ({
          userId: p.userId,
          displayName: p.displayName,
          avatarUrl: p.avatarUrl,
          status: p.status,
          joinedAt: Date.now(),
          totalFocusMinutes: p.totalFocusMinutes,
          level: p.level,
        })),
      )
      setParticipants(list)
    })

    // Primary: realtime chat via broadcast (instant, no DB subscription needed)
    channel.on('broadcast', { event: 'chat_message' }, ({ payload }) => {
      addMessage(payload as ChatMessage)
    })

    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        setConnected(true)
        const payload: PresencePayload = {
          userId: currentUser.id,
          displayName: currentUser.displayName,
          avatarUrl: currentUser.avatarUrl,
          status: 'idle',
          level: currentUser.level,
          totalFocusMinutes: 0,
        }
        await channel.track(payload)
      }
    })

    // Load history from DB
    getChatMessages(roomId).then(setMessages)

    return () => {
      channel.unsubscribe()
      setConnected(false)
    }
  }, [roomId, currentUser.id])

  const sendMessage = useCallback(async (content: string) => {
    const msg: ChatMessage = {
      id: crypto.randomUUID(),
      room_id: roomId,
      user_id: currentUser.id,
      content,
      is_system: false,
      sender_name: currentUser.displayName,
      sender_avatar: currentUser.avatarUrl,
      created_at: new Date().toISOString(),
    }

    // Broadcast to all subscribers in the channel (including self) — instant delivery
    channelRef.current?.send({ type: 'broadcast', event: 'chat_message', payload: msg })

    // Persist to DB asynchronously for message history
    saveChatMessage(roomId, currentUser.id, content, currentUser.displayName, currentUser.avatarUrl)
  }, [roomId, currentUser.id, currentUser.displayName, currentUser.avatarUrl])

  const updatePresence = useCallback(async (payload: Partial<PresencePayload>) => {
    if (!channelRef.current) return
    await channelRef.current.track({
      userId: currentUser.id,
      displayName: currentUser.displayName,
      avatarUrl: currentUser.avatarUrl,
      level: currentUser.level,
      totalFocusMinutes: 0,
      status: 'idle',
      ...payload,
    })
  }, [currentUser])

  const broadcastTimer = useCallback((data: TimerBroadcast) => {
    channelRef.current?.send({ type: 'broadcast', event: 'timer_update', payload: data })
  }, [])

  return { participants, messages, connected, sendMessage, updatePresence, broadcastTimer }
}
