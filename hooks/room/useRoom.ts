'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Participant, ChatMessage, TimerBroadcast, PresencePayload } from '@/types/room.types'
import { getChatMessages, saveChatMessage } from '@/services/room.service'
import type { RealtimeChannel } from '@supabase/supabase-js'

export function useRoom(roomId: string, currentUser: { id: string; displayName: string; avatarUrl: string | null; level: number }) {
  const [participants, setParticipants] = useState<Participant[]>([])
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [connected, setConnected] = useState(false)
  const channelRef = useRef<RealtimeChannel | null>(null)

  useEffect(() => {
    const supabase = createClient()
    const channel = supabase.channel(`room:${roomId}`, {
      config: { presence: { key: currentUser.id } },
    })

    channelRef.current = channel

    // Presence
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

    // Chat messages via DB changes
    channel.on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `room_id=eq.${roomId}` },
      (payload) => {
        setMessages((prev) => [...prev, payload.new as ChatMessage])
      },
    )

    // Subscribe
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

    // Load chat history
    getChatMessages(roomId).then(setMessages)

    return () => {
      channel.unsubscribe()
      setConnected(false)
    }
  }, [roomId, currentUser.id])

  const sendMessage = useCallback(async (content: string) => {
    await saveChatMessage(roomId, currentUser.id, content)
  }, [roomId, currentUser.id])

  const updatePresence = useCallback(async (payload: Partial<PresencePayload>) => {
    if (!channelRef.current) return
    await channelRef.current.track({ userId: currentUser.id, ...payload })
  }, [currentUser.id])

  const broadcastTimer = useCallback((data: TimerBroadcast) => {
    channelRef.current?.send({
      type: 'broadcast',
      event: 'timer_update',
      payload: data,
    })
  }, [])

  return { participants, messages, connected, sendMessage, updatePresence, broadcastTimer }
}
