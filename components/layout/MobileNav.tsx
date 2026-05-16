'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/utils/cn'

const MOBILE_NAV = [
  { href: '/dashboard', label: '홈',   icon: '🏠' },
  { href: '/rooms',     label: '집중방', icon: '🚪' },
  { href: '/ranking',   label: '랭킹',  icon: '🏆' },
  { href: '/friends',   label: '친구',  icon: '👥' },
  { href: '/profile',   label: '프로필', icon: '🎖' },
]

export function MobileNav() {
  const pathname = usePathname()
  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#161B22]/95 backdrop-blur-sm border-t border-white/10 flex safe-area-pb">
      {MOBILE_NAV.map((item) => {
        const active = pathname === item.href || pathname.startsWith(item.href + '/')
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex-1 flex flex-col items-center justify-center py-2 gap-0.5 transition-colors',
              active ? 'text-[#6366F1]' : 'text-slate-500 active:text-slate-300',
            )}
          >
            <span className="text-xl leading-none">{item.icon}</span>
            <span className={cn('text-[10px] font-medium', active ? 'text-[#6366F1]' : 'text-slate-500')}>
              {item.label}
            </span>
            {active && (
              <span className="absolute bottom-0 w-8 h-0.5 bg-[#6366F1] rounded-full" />
            )}
          </Link>
        )
      })}
    </nav>
  )
}
