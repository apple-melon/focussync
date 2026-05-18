import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { levelProgress } from '@/lib/xp/formulas'
import { Sidebar } from '@/components/layout/Sidebar'
import { MobileNav } from '@/components/layout/MobileNav'

export default async function MainLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users')
    .select('display_name, avatar_url, xp, coins')
    .eq('id', user.id)
    .single()

  const xp = profile?.xp ?? 0
  const progress = levelProgress(xp)

  return (
    <div className="flex h-[100dvh] bg-[#0D0F14] overflow-hidden">
      <Sidebar
        user={{
          id: user.id,
          displayName: profile?.display_name ?? 'User',
          avatarUrl: profile?.avatar_url ?? null,
          level: progress.level,
          xp,
          current: progress.current,
          required: progress.required,
          coins: profile?.coins ?? 0,
        }}
      />
      <div className="flex-1 overflow-y-auto pb-16 lg:pb-0">
        {children}
      </div>
      <MobileNav />
    </div>
  )
}
