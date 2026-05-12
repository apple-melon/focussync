export type RoomStatus = 'waiting' | 'active' | 'ended'
export type ParticipantStatus = 'focusing' | 'on_break' | 'idle'

export interface StudyRoom {
  id: string
  code: string
  name: string
  description: string | null
  host_id: string
  is_public: boolean
  max_participants: number
  status: RoomStatus
  topic: string | null
  created_at: string
  updated_at: string
}

export interface Participant {
  userId: string
  displayName: string
  avatarUrl: string | null
  status: ParticipantStatus
  joinedAt: number
  totalFocusMinutes: number
  level: number
}

export interface ChatMessage {
  id: string
  roomId: string
  userId: string
  content: string
  isSystem: boolean
  senderName: string
  senderAvatar: string | null
  createdAt: string
}

export interface TimerBroadcast {
  type: 'timer_update' | 'phase_change' | 'session_complete'
  userId: string
  phase: 'focus' | 'short_break' | 'long_break'
  timeLeft: number
  sessionCount: number
}

export interface PresencePayload {
  userId: string
  displayName: string
  avatarUrl: string | null
  status: ParticipantStatus
  level: number
  totalFocusMinutes: number
}

export interface CreateRoomInput {
  name: string
  description?: string
  isPublic: boolean
  maxParticipants?: number
  topic?: string
}
