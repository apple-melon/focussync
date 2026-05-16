'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import type { StudyRoom } from '@/types/room.types'

const FILTERS = ['전체', '스터디', '코딩', '외국어', '자격증', '기타']
const GRADIENTS = [
  'from-indigo-900 via-purple-900 to-slate-900',
  'from-slate-900 via-blue-900 to-indigo-900',
  'from-purple-900 via-slate-900 to-blue-900',
  'from-blue-900 via-indigo-900 to-purple-900',
  'from-green-900 via-slate-900 to-indigo-900',
  'from-rose-900 via-slate-900 to-purple-900',
]

export default function RoomsPage() {
  const [rooms, setRooms] = useState<StudyRoom[]>([])
  const [filtered, setFiltered] = useState<StudyRoom[]>([])
  const [activeFilter, setActiveFilter] = useState('전체')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    supabase
      .from('study_rooms')
      .select('*')
      .eq('is_public', true)
      .in('status', ['waiting', 'active'])
      .order('created_at', { ascending: false })
      .limit(30)
      .then(({ data }) => {
        setRooms((data as StudyRoom[]) ?? [])
        setLoading(false)
      })
  }, [])

  useEffect(() => {
    let list = rooms
    if (activeFilter !== '전체') {
      list = list.filter((r) => r.topic?.includes(activeFilter))
    }
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter((r) => r.name.toLowerCase().includes(q) || r.topic?.toLowerCase().includes(q))
    }
    setFiltered(list)
  }, [rooms, activeFilter, search])

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold text-white flex-1">집중방</h1>
        <div className="relative flex-1 sm:flex-none">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="방 이름 검색..."
            className="bg-[#161B22] border border-white/10 rounded-xl px-4 py-2 pl-9 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-[#6366F1] transition-colors w-full sm:w-52"
          />
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">🔍</span>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-2 flex-wrap">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setActiveFilter(f)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
              activeFilter === f
                ? 'bg-[#6366F1] text-white shadow-[0_0_12px_rgba(99,102,241,0.3)]'
                : 'bg-[#161B22] border border-white/10 text-slate-400 hover:text-white hover:border-white/20'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Room list */}
      {loading ? (
        <div className="grid grid-cols-1 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-20 bg-[#161B22] rounded-2xl animate-pulse border border-white/10" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-slate-500">
          <p className="text-4xl mb-3">📭</p>
          <p>조건에 맞는 집중방이 없어요.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((room, idx) => (
            <Link
              key={room.id}
              href={`/room/${room.id}`}
              className="group flex items-center gap-4 bg-[#161B22] hover:bg-[#1C2333] border border-white/10 hover:border-[#6366F1]/30 rounded-2xl p-4 transition-all"
            >
              {/* Thumbnail */}
              <div className={`w-16 h-16 rounded-xl bg-gradient-to-br ${GRADIENTS[idx % GRADIENTS.length]} flex-shrink-0`} />

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-white truncate group-hover:text-[#6366F1] transition-colors">{room.name}</h3>
                  {room.topic && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-[#6366F1]/15 text-[#6366F1] border border-[#6366F1]/20 flex-shrink-0">
                      {room.topic}
                    </span>
                  )}
                </div>
                {room.description && <p className="text-sm text-slate-400 truncate">{room.description}</p>}
                <p className="text-xs text-slate-600 mt-1 font-mono">코드: {room.code}</p>
              </div>

              {/* Status */}
              <div className="flex flex-col items-end gap-2 flex-shrink-0">
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                  room.status === 'active' ? 'bg-[#22C55E]/20 text-[#22C55E]' : 'bg-[#242E42] text-slate-400'
                }`}>
                  {room.status === 'active' ? '🟢 진행 중' : '⚪ 대기 중'}
                </span>
                <span className="text-xs text-slate-500">최대 {room.max_participants}명</span>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Create room button */}
      <div className="sticky bottom-6 flex justify-center">
        <Link
          href="/room/create"
          className="flex items-center gap-2 bg-[#6366F1] hover:bg-[#4F46E5] text-white font-semibold px-6 py-3 rounded-full shadow-[0_0_24px_rgba(99,102,241,0.4)] transition-all hover:scale-105"
        >
          + 집중방 만들기
        </Link>
      </div>
    </div>
  )
}
