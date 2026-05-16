import { AccessToken } from 'livekit-server-sdk'
import { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const room = request.nextUrl.searchParams.get('room')
  const userId = request.nextUrl.searchParams.get('userId')
  const name = request.nextUrl.searchParams.get('name')

  if (!room || !userId || !name) {
    return Response.json({ error: 'room, userId, name are required' }, { status: 400 })
  }

  const apiKey = process.env.LIVEKIT_API_KEY
  const apiSecret = process.env.LIVEKIT_API_SECRET

  if (!apiKey || !apiSecret) {
    return Response.json({ error: 'LIVEKIT_API_KEY and LIVEKIT_API_SECRET are not configured' }, { status: 500 })
  }

  const at = new AccessToken(apiKey, apiSecret, {
    identity: userId,
    name,
    ttl: '2h',
  })

  at.addGrant({
    roomJoin: true,
    room,
    canPublish: true,
    canSubscribe: true,
    canPublishData: true,
  })

  const token = await at.toJwt()
  return Response.json({ token })
}
