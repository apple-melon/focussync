import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getPublicRooms } from '@/services/room.service'
import { levelProgress, getLevelTier } from '@/lib/xp/formulas'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users')
    .select('display_name, avatar_url, xp, streak_days, total_focus_minutes')
    .eq('id', user.id)
    .single()

  const xp = profile?.xp ?? 0
  const progress = levelProgress(xp)
  const tier = getLevelTier(progress.level)
  const publicRooms = await getPublicRooms(6)

  return (
    <div className="min-h-screen bg-[#0D0F14] text-white">
      {/* Nav */}
      <nav className="border-b border-white/10 bg-[#161B22] px-6 py-4 flex items-center justify-between">
        <span className="font-bold text-lg">⚡ FocusSync</span>
        <div className="flex items-center gap-4">
          <Link href="/room/create" className="bg-[#6366F1] hover:bg-[#4F46E5] text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors">
            + 방 만들기
          </Link>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-8">
        {/* Profile card */}
        <div className="bg-[#161B22] border border-white/10 rounded-2xl p-6 flex items-center gap-6">
          <div className="w-16 h-16 rounded-full bg-[#242E42] flex items-center justify-center text-2xl font-bold" style={{ color: tier.color }}>
            {profile?.display_name?.[0]?.toUpperCase() ?? '?'}
          </div>
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold">{profile?.display_name ?? user.email}</h2>
              <span className="text-sm px-2 py-0.5 rounded-full border font-semibold" style={{ color: tier.color, borderColor: tier.color }}>
                Lv.{progress.level} {tier.name}
              </span>
            </div>
            <div className="h-2 bg-[#242E42] rounded-full overflow-hidden max-w-sm">
              <div className={`h-full bg-gradient-to-r ${tier.gradient} rounded-full transition-all duration-700`} style={{ width: `${progress.pct}%` }} />
            </div>
            <p className="text-xs text-slate-500">{progress.current.toLocaleString()} / {progress.required.toLocaleString()} XP</p>
          </div>
          <div className="text-right space-y-1">
            <p className="text-2xl font-bold text-[#EAB308]">🔥 {profile?.streak_days ?? 0}일</p>
            <p className="text-xs text-slate-500">연속 공부</p>
            <p className="text-sm font-semibold text-slate-300">{Math.round((profile?.total_focus_minutes ?? 0) / 60)}시간</p>
            <p className="text-xs text-slate-500">총 집중 시간</p>
          </div>
        </div>

        {/* Public rooms */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold">공개 집중방</h3>
            <Link href="/room/create" className="text-sm text-[#6366F1] hover:underline">새 방 만들기 →</Link>
          </div>

          {publicRooms.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <p className="text-4xl mb-3">📚</p>
              <p>아직 공개 방이 없어요. 첫 번째로 만들어보세요!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {publicRooms.map((room) => (
                <Link
                  key={room.id}
                  href={`/room/${room.id}`}
                  className="group bg-[#161B22] hover:bg-[#1C2333] border border-white/10 hover:border-[#6366F1]/30 rounded-xl p-4 transition-all"
                >
                  <div className="flex items-start justify-between mb-3">
                    <h4 className="font-semibold text-white group-hover:text-[#6366F1] transition-colors line-clamp-1">{room.name}</h4>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${room.status === 'active' ? 'bg-[#22C55E]/20 text-[#22C55E]' : 'bg-[#242E42] text-slate-400'}`}>
                      {room.status === 'active' ? '진행 중' : '대기 중'}
                    </span>
                  </div>
                  {room.topic && <p className="text-xs text-[#6366F1] mb-2">#{room.topic}</p>}
                  {room.description && <p className="text-sm text-slate-400 line-clamp-2">{room.description}</p>}
                  <p className="text-xs text-slate-600 mt-3 font-mono">{room.code}</p>
                </Link>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
