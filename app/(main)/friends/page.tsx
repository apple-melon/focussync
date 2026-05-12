'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/hooks/auth/useAuth'
import {
  searchUsers,
  sendFriendRequest,
  respondFriendRequest,
  getFriendsWithStatus,
  getPendingRequests,
  type FriendUser,
  type FriendRequest,
} from '@/services/friend.service'
import { getLevelTier } from '@/lib/xp/formulas'

type Tab = 'list' | 'requests' | 'search'

export default function FriendsPage() {
  const { user } = useAuth()
  const [tab, setTab] = useState<Tab>('list')
  const [friends, setFriends] = useState<FriendUser[]>([])
  const [requests, setRequests] = useState<FriendRequest[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<{ id: string; display_name: string; avatar_url: string | null; level: number }[]>([])
  const [loading, setLoading] = useState(false)
  const [sentIds, setSentIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (!user) return
    getFriendsWithStatus(user.id).then(setFriends)
    getPendingRequests(user.id).then(setRequests)
  }, [user])

  useEffect(() => {
    if (!searchQuery.trim()) { setSearchResults([]); return }
    const t = setTimeout(async () => {
      const results = await searchUsers(searchQuery)
      setSearchResults(results.filter((r) => r.id !== user?.id))
    }, 300)
    return () => clearTimeout(t)
  }, [searchQuery, user?.id])

  async function handleSendRequest(addresseeId: string) {
    if (!user) return
    setLoading(true)
    try {
      await sendFriendRequest(user.id, addresseeId)
      setSentIds((p) => new Set([...p, addresseeId]))
    } catch { /* already sent */ }
    setLoading(false)
  }

  async function handleRespond(req: FriendRequest, accept: boolean) {
    if (!user) return
    await respondFriendRequest(req.id, accept, req.requester_id, user.id)
    setRequests((p) => p.filter((r) => r.id !== req.id))
    if (accept) getFriendsWithStatus(user.id).then(setFriends)
  }

  const studying = friends.filter((f) => f.is_studying)
  const idle = friends.filter((f) => !f.is_studying)

  return (
    <div className="p-6 space-y-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">친구</h1>
        <span className="text-sm text-slate-500">{friends.length}명</span>
      </div>

      {/* Tabs */}
      <div className="flex bg-[#161B22] border border-white/10 rounded-xl p-1 gap-1 w-fit">
        {([['list', '친구 목록'], ['requests', `신청 ${requests.length > 0 ? `(${requests.length})` : ''}`], ['search', '친구 찾기']] as [Tab, string][]).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === key ? 'bg-[#6366F1] text-white' : 'text-slate-400 hover:text-white'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Friend list */}
      {tab === 'list' && (
        <div className="space-y-4">
          {studying.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-[#22C55E] font-semibold uppercase tracking-widest flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-[#22C55E] animate-pulse inline-block" />
                지금 공부 중 ({studying.length})
              </p>
              {studying.map((f) => <FriendRow key={f.id} friend={f} />)}
            </div>
          )}
          {idle.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-slate-500 font-semibold uppercase tracking-widest">오프라인 ({idle.length})</p>
              {idle.map((f) => <FriendRow key={f.id} friend={f} />)}
            </div>
          )}
          {friends.length === 0 && (
            <div className="text-center py-12 text-slate-500">
              <p className="text-4xl mb-3">👥</p>
              <p className="text-sm">아직 친구가 없어요.</p>
              <button onClick={() => setTab('search')} className="text-sm text-[#6366F1] hover:underline mt-2">
                친구 찾기 →
              </button>
            </div>
          )}
        </div>
      )}

      {/* Pending requests */}
      {tab === 'requests' && (
        <div className="space-y-3">
          {requests.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <p className="text-3xl mb-2">📭</p>
              <p className="text-sm">대기 중인 친구 신청이 없어요.</p>
            </div>
          ) : (
            requests.map((req) => {
              const requester = req.requester as { display_name: string; avatar_url: string | null } | undefined
              return (
                <div key={req.id} className="flex items-center gap-3 bg-[#161B22] border border-white/10 rounded-xl p-4">
                  <div className="w-10 h-10 rounded-full bg-[#242E42] flex items-center justify-center font-bold text-slate-300 overflow-hidden flex-shrink-0">
                    {requester?.avatar_url
                      ? <img src={requester.avatar_url} alt="" className="w-full h-full object-cover" />
                      : requester?.display_name?.[0]?.toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-white">{requester?.display_name ?? '알 수 없음'}</p>
                    <p className="text-xs text-slate-500">친구 신청을 보냈어요</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => handleRespond(req, true)} className="px-3 py-1.5 bg-[#6366F1] hover:bg-[#4F46E5] text-white text-xs font-semibold rounded-lg transition-colors">
                      수락
                    </button>
                    <button onClick={() => handleRespond(req, false)} className="px-3 py-1.5 bg-[#242E42] hover:bg-[#2d3748] text-slate-400 text-xs font-semibold rounded-lg transition-colors">
                      거절
                    </button>
                  </div>
                </div>
              )
            })
          )}
        </div>
      )}

      {/* Search */}
      {tab === 'search' && (
        <div className="space-y-4">
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="닉네임으로 검색..."
            className="w-full bg-[#161B22] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-[#6366F1] transition-colors"
          />
          <div className="space-y-2">
            {searchResults.map((u) => {
              const tier = getLevelTier(u.level)
              const sent = sentIds.has(u.id)
              return (
                <div key={u.id} className="flex items-center gap-3 bg-[#161B22] border border-white/10 rounded-xl p-4">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold overflow-hidden flex-shrink-0" style={{ background: `${tier.color}22`, border: `1.5px solid ${tier.color}44` }}>
                    {u.avatar_url
                      ? <img src={u.avatar_url} alt="" className="w-full h-full object-cover" />
                      : <span style={{ color: tier.color }}>{u.display_name[0]?.toUpperCase()}</span>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white">{u.display_name}</p>
                    <p className="text-xs" style={{ color: tier.color }}>Lv.{u.level} {tier.name}</p>
                  </div>
                  <button
                    onClick={() => handleSendRequest(u.id)}
                    disabled={loading || sent}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${sent ? 'bg-[#242E42] text-slate-500 cursor-default' : 'bg-[#6366F1] hover:bg-[#4F46E5] text-white'}`}
                  >
                    {sent ? '신청됨 ✓' : '+ 친구 신청'}
                  </button>
                </div>
              )
            })}
            {searchQuery && searchResults.length === 0 && (
              <p className="text-center text-slate-500 text-sm py-6">검색 결과가 없어요.</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function FriendRow({ friend }: { friend: FriendUser }) {
  const tier = getLevelTier(friend.level)
  return (
    <div className="flex items-center gap-3 bg-[#161B22] border border-white/10 rounded-xl p-3 hover:bg-[#1C2333] transition-colors">
      <div className="relative flex-shrink-0">
        <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold overflow-hidden" style={{ background: `${tier.color}22`, border: `1.5px solid ${tier.color}44` }}>
          {friend.avatar_url
            ? <img src={friend.avatar_url} alt="" className="w-full h-full object-cover" />
            : <span style={{ color: tier.color }}>{friend.display_name[0]?.toUpperCase()}</span>}
        </div>
        <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#161B22] ${friend.is_studying ? 'bg-[#22C55E]' : 'bg-slate-600'}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-white truncate">{friend.display_name}</p>
        {friend.is_studying ? (
          <p className="text-xs text-[#22C55E]">
            🔥 집중 중{friend.current_room_name ? ` — ${friend.current_room_name}` : ''}
          </p>
        ) : (
          <p className="text-xs text-slate-500">오프라인</p>
        )}
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xs" style={{ color: tier.color }}>Lv.{friend.level}</span>
        {friend.is_studying && friend.current_room_id && (
          <Link href={`/room/${friend.current_room_id}`} className="text-xs bg-[#22C55E]/20 text-[#22C55E] px-2 py-1 rounded-lg hover:bg-[#22C55E]/30 transition-colors">
            같이 공부
          </Link>
        )}
      </div>
    </div>
  )
}
