import { createClient } from '@/lib/supabase/client'

export interface FriendUser {
  id: string
  display_name: string
  avatar_url: string | null
  level: number
  streak_days: number
  is_studying: boolean
  current_room_id: string | null
  current_room_name: string | null
}

export interface FriendRequest {
  id: string
  requester_id: string
  addressee_id: string
  status: 'pending' | 'accepted' | 'declined'
  created_at: string
  requester?: { display_name: string; avatar_url: string | null }
  addressee?: { display_name: string; avatar_url: string | null }
}

export async function searchUsers(query: string): Promise<{ id: string; display_name: string; avatar_url: string | null; level: number }[]> {
  if (!query.trim()) return []
  const supabase = createClient()
  const { data } = await supabase
    .from('users')
    .select('id, display_name, avatar_url, level')
    .ilike('display_name', `%${query}%`)
    .limit(10)
  return data ?? []
}

export async function sendFriendRequest(requesterId: string, addresseeId: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.from('friendships').insert({
    requester_id: requesterId,
    addressee_id: addresseeId,
    status: 'pending',
  })
  if (error) throw new Error(error.message)

  // 알림 생성
  const { data: requester } = await supabase.from('users').select('display_name').eq('id', requesterId).single()
  await supabase.from('notifications').insert({
    user_id: addresseeId,
    type: 'friend_request',
    from_user_id: requesterId,
    from_user_name: requester?.display_name ?? '',
    message: `${requester?.display_name ?? '누군가'}님이 친구 신청을 보냈어요.`,
  })
}

export async function respondFriendRequest(friendshipId: string, accept: boolean, fromUserId: string, toUserId: string): Promise<void> {
  const supabase = createClient()
  await supabase
    .from('friendships')
    .update({ status: accept ? 'accepted' : 'declined' })
    .eq('id', friendshipId)

  if (accept) {
    const { data: accepter } = await supabase.from('users').select('display_name').eq('id', toUserId).single()
    await supabase.from('notifications').insert({
      user_id: fromUserId,
      type: 'request_accepted',
      from_user_id: toUserId,
      from_user_name: accepter?.display_name ?? '',
      message: `${accepter?.display_name ?? '누군가'}님이 친구 신청을 수락했어요! 🎉`,
    })
  }
}

export async function getFriendsWithStatus(userId: string): Promise<FriendUser[]> {
  const supabase = createClient()

  const { data: friendships } = await supabase
    .from('friendships')
    .select('requester_id, addressee_id')
    .eq('status', 'accepted')
    .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`)

  if (!friendships?.length) return []

  const friendIds = friendships.map((f) =>
    f.requester_id === userId ? f.addressee_id : f.requester_id,
  )

  const { data: users } = await supabase
    .from('users')
    .select('id, display_name, avatar_url, level, streak_days')
    .in('id', friendIds)

  // Check who's currently studying (has a session started in last 2 hours)
  const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
  const { data: activeSessions } = await supabase
    .from('study_sessions')
    .select('user_id, room_id, study_rooms(name)')
    .in('user_id', friendIds)
    .gte('started_at', twoHoursAgo)
    .is('ended_at', null)

  return (users ?? []).map((u) => {
    const session = activeSessions?.find((s) => s.user_id === u.id)
    const rawRoom = session?.study_rooms
    const room = (Array.isArray(rawRoom) ? rawRoom[0] : rawRoom) as { name: string } | null
    return {
      ...u,
      is_studying: !!session,
      current_room_id: session?.room_id ?? null,
      current_room_name: room?.name ?? null,
    }
  })
}

export async function getPendingRequests(userId: string): Promise<FriendRequest[]> {
  const supabase = createClient()
  const { data } = await supabase
    .from('friendships')
    .select('*, requester:requester_id(display_name, avatar_url)')
    .eq('addressee_id', userId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
  return (data ?? []) as unknown as FriendRequest[]
}

export async function notifyFriendsStudyStart(userId: string, roomId: string | null): Promise<void> {
  const supabase = createClient()
  const { data: friends } = await supabase
    .from('friendships')
    .select('requester_id, addressee_id')
    .eq('status', 'accepted')
    .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`)

  if (!friends?.length) return

  const { data: me } = await supabase.from('users').select('display_name').eq('id', userId).single()
  const friendIds = friends.map((f) => f.requester_id === userId ? f.addressee_id : f.requester_id)

  const notifications = friendIds.map((fid) => ({
    user_id: fid,
    type: roomId ? 'friend_joined_room' : 'friend_studying',
    from_user_id: userId,
    from_user_name: me?.display_name ?? '',
    message: roomId
      ? `${me?.display_name ?? '친구'}님이 집중방에 입장했어요! 📚`
      : `${me?.display_name ?? '친구'}님이 공부를 시작했어요! 🔥`,
    room_id: roomId,
  }))

  await supabase.from('notifications').insert(notifications)
}
