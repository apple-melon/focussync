import { createClient } from '@/lib/supabase/client'
import type { StudyRoom, ChatMessage, CreateRoomInput } from '@/types/room.types'
import { ROOM } from '@/config/constants'

function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  return Array.from({ length: ROOM.CODE_LENGTH }, () =>
    chars[Math.floor(Math.random() * chars.length)],
  ).join('')
}

export async function createRoom(
  userId: string,
  input: CreateRoomInput,
): Promise<StudyRoom> {
  const supabase = createClient()
  const code = generateRoomCode()

  const { data, error } = await supabase
    .from('study_rooms')
    .insert({
      code,
      name: input.name,
      description: input.description ?? null,
      host_id: userId,
      is_public: input.isPublic,
      max_participants: input.maxParticipants ?? ROOM.MAX_PARTICIPANTS,
      topic: input.topic ?? null,
      status: 'waiting',
    })
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data as StudyRoom
}

export async function getRoom(roomId: string): Promise<StudyRoom | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('study_rooms')
    .select('*')
    .eq('id', roomId)
    .single()

  if (error) return null
  return data as StudyRoom
}

export async function getPublicRooms(limit = 20): Promise<StudyRoom[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('study_rooms')
    .select('*')
    .eq('is_public', true)
    .in('status', ['waiting', 'active'])
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) return []
  return data as StudyRoom[]
}

export async function getRoomByCode(code: string): Promise<StudyRoom | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('study_rooms')
    .select('*')
    .eq('code', code.toUpperCase())
    .single()

  if (error) return null
  return data as StudyRoom
}

export async function getChatMessages(roomId: string): Promise<ChatMessage[]> {
  const supabase = createClient()
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

  // Fire-and-forget cleanup of messages older than 24h
  void supabase.rpc('cleanup_old_chat_messages')

  const { data, error } = await supabase
    .from('chat_messages')
    .select('*')
    .eq('room_id', roomId)
    .gte('created_at', since)
    .order('created_at', { ascending: true })
    .limit(ROOM.CHAT_HISTORY_LIMIT)

  if (error) return []
  return (data ?? []) as ChatMessage[]
}

export async function saveChatMessage(
  roomId: string,
  userId: string,
  content: string,
  senderName = '',
  senderAvatar: string | null = null,
  isSystem = false,
): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.from('chat_messages').insert({
    room_id: roomId,
    user_id: userId,
    content,
    is_system: isSystem,
    sender_name: senderName,
    sender_avatar: senderAvatar,
  })
  if (error) console.warn('[chat] save failed:', error.message)
}

export async function startStudySession(
  roomId: string,
  userId: string,
): Promise<string> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('study_sessions')
    .insert({ room_id: roomId, user_id: userId, started_at: new Date().toISOString() })
    .select('id')
    .single()

  if (error) throw new Error(error.message)
  return data.id
}

// Atomically ends session and increments users.total_focus_minutes
export async function endStudySession(
  sessionId: string,
  focusMinutes: number,
  userId?: string,
): Promise<void> {
  const supabase = createClient()

  if (userId) {
    // Use RPC so total_focus_minutes is updated atomically
    const { error } = await supabase.rpc('end_study_session', {
      p_session_id: sessionId,
      p_user_id: userId,
      p_focus_minutes: focusMinutes,
    })
    if (error) {
      // Fallback: plain update (happens if migrations v2 not yet run)
      await supabase
        .from('study_sessions')
        .update({ ended_at: new Date().toISOString(), focus_minutes: focusMinutes })
        .eq('id', sessionId)
    }
  } else {
    await supabase
      .from('study_sessions')
      .update({ ended_at: new Date().toISOString(), focus_minutes: focusMinutes })
      .eq('id', sessionId)
  }
}
