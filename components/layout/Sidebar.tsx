'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/utils/cn'
import { getLevelTier } from '@/lib/xp/formulas'
import { NotificationBell } from './NotificationBell'

interface SidebarUser {
  id: string
  displayName: string
  avatarUrl: string | null
  level: number
  xp: number
  current: number
  required: number
  coins: number
}

const NAV_ITEMS = [
  { href: '/dashboard', label: '대시보드', icon: '🏠' },
  { href: '/rooms',     label: '집중방',   icon: '🚪' },
  { href: '/ranking',   label: '랭킹',     icon: '🏆' },
  { href: '/shop',      label: '상점',     icon: '🛍️' },
  { href: '/inventory', label: '인벤토리', icon: '🎒' },
  { href: '/friends',   label: '친구',     icon: '👥' },
  { href: '/profile',   label: '업적',     icon: '🏅' },
  { href: '/settings',  label: '설정',     icon: '🔧' },
]

export function Sidebar({ user }: { user: SidebarUser }) {
  const pathname = usePathname()
  const tier = getLevelTier(user.level)
  const pct = Math.round((user.current / user.required) * 100)

  return (
    <aside className="hidden lg:flex w-60 flex-shrink-0 flex-col bg-[#161B22] border-r border-white/10 h-full">
      {/* Logo + bell */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-white/10">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-[#6366F1] flex items-center justify-center text-white font-bold shadow-[0_0_12px_rgba(99,102,241,0.4)]">
            ⚡
          </div>
          <span className="font-bold text-white tracking-tight">FocusWithMe</span>
        </div>
        <NotificationBell userId={user.id} />
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
                active
                  ? 'bg-[#6366F1]/15 text-[#6366F1] border border-[#6366F1]/20'
                  : 'text-slate-400 hover:text-white hover:bg-white/5',
              )}
            >
              <span className="text-base">{item.icon}</span>
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* User profile */}
      <div className="p-4 border-t border-white/10">
        <Link href="/profile" className="flex items-center gap-3 mb-3 hover:opacity-80 transition-opacity">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 overflow-hidden"
            style={{ background: `${tier.color}22`, border: `1.5px solid ${tier.color}55` }}
          >
            {user.avatarUrl
              ? <img src={user.avatarUrl} alt={user.displayName} className="w-full h-full object-cover" />
              : <span style={{ color: tier.color }}>{user.displayName[0]?.toUpperCase()}</span>}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white truncate">{user.displayName}</p>
            <p className="text-xs font-medium" style={{ color: tier.color }}>Lv.{user.level} {tier.name}</p>
          </div>
        </Link>
        <div className="space-y-1">
          <div className="h-1.5 bg-[#0D0F14] rounded-full overflow-hidden">
            <div
              className={`h-full bg-gradient-to-r ${tier.gradient} rounded-full transition-all duration-700`}
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="text-xs text-slate-600 text-right font-mono">
            {user.current.toLocaleString()} / {user.required.toLocaleString()} XP
          </p>
        </div>
        <div className="flex items-center gap-1.5 mt-2 px-0.5">
          <span className="text-base leading-none">💰</span>
          <span className="text-sm font-bold text-yellow-400">{user.coins.toLocaleString()}</span>
          <span className="text-xs text-slate-500">코인</span>
        </div>
      </div>
    </aside>
  )
}
