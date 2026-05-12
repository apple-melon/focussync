'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export interface AppNotification {
  id: string
  type: string
  from_user_name: string | null
  message: string
  read: boolean
  room_id: string | null
  created_at: string
}

export function useNotifications(userId: string | null) {
  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    if (!userId) return
    const supabase = createClient()

    // Load recent notifications
    supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(20)
      .then(({ data }) => {
        const list = (data ?? []) as AppNotification[]
        setNotifications(list)
        setUnreadCount(list.filter((n) => !n.read).length)
      })

    // Realtime subscription
    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
        (payload) => {
          const n = payload.new as AppNotification
          setNotifications((prev) => [n, ...prev])
          setUnreadCount((c) => c + 1)

          // Browser notification
          if (typeof window !== 'undefined' && Notification.permission === 'granted') {
            new Notification('FocusSync', { body: n.message, icon: '/favicon.ico' })
          }
        },
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [userId])

  const requestPermission = useCallback(async () => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      await Notification.requestPermission()
    }
  }, [])

  const markAllRead = useCallback(async () => {
    if (!userId) return
    const supabase = createClient()
    await supabase.from('notifications').update({ read: true }).eq('user_id', userId).eq('read', false)
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
    setUnreadCount(0)
  }, [userId])

  return { notifications, unreadCount, requestPermission, markAllRead }
}
