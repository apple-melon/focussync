'use client'

import { useEffect, useRef, useState } from 'react'
import { useNotifications } from '@/hooks/useNotifications'
import Link from 'next/link'

export function NotificationBell({ userId }: { userId: string }) {
  const { notifications, unreadCount, markAllRead, requestPermission } = useNotifications(userId)
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    requestPermission()
  }, [requestPermission])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function handleOpen() {
    setOpen((p) => !p)
    if (!open && unreadCount > 0) markAllRead()
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={handleOpen}
        className="relative w-8 h-8 flex items-center justify-center text-slate-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors"
      >
        🔔
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 rounded-full text-[9px] font-bold text-white flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute left-full top-0 ml-2 w-72 bg-[#1C2333] border border-white/10 rounded-xl shadow-xl z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
            <span className="text-sm font-semibold text-white">알림</span>
            {unreadCount === 0 && <span className="text-xs text-slate-500">모두 읽음</span>}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-6 text-center text-slate-600 text-sm">
                <p className="text-2xl mb-2">🔕</p>
                <p>알림이 없어요</p>
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  className={`px-4 py-3 border-b border-white/5 last:border-0 ${!n.read ? 'bg-[#6366F1]/5' : ''}`}
                >
                  <p className="text-sm text-white leading-snug">{n.message}</p>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs text-slate-500">
                      {new Date(n.created_at).toLocaleString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </span>
                    {n.room_id && (
                      <Link href={`/room/${n.room_id}`} className="text-xs text-[#6366F1] hover:underline">
                        같이 공부하기 →
                      </Link>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
