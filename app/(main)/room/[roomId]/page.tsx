import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getRoom } from '@/services/room.service'
import { RoomClient } from '@/components/room/RoomClient'
import { calcLevel } from '@/lib/xp/formulas'

interface Props {
  params: Promise<{ roomId: string }>
}

export default async function RoomPage({ params }: Props) {
  const { roomId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect(`/login?next=/room/${roomId}`)

  const room = await getRoom(roomId)
  if (!room || room.status === 'ended') notFound()

  const { data: profile } = await supabase
    .from('users')
    .select('display_name, avatar_url, xp, active_skin')
    .eq('id', user.id)
    .single()

  const displayName = profile?.display_name ?? user.email ?? 'Anonymous'
  const avatarUrl = profile?.avatar_url ?? null
  const level = calcLevel(profile?.xp ?? 0)

  return (
    <RoomClient
      room={room}
      userId={user.id}
      displayName={displayName}
      avatarUrl={avatarUrl}
      level={level}
      activeSkin={profile?.active_skin ?? 'default'}
    />
  )
}

export async function generateMetadata({ params }: Props) {
  const { roomId } = await params
  const room = await getRoom(roomId)
  return {
    title: room ? room.name : '집중방',
  }
}
