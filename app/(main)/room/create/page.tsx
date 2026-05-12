'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/auth/useAuth'
import { createRoom } from '@/services/room.service'
import { ROOM } from '@/config/constants'

export default function CreateRoomPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [form, setForm] = useState({
    name: '',
    description: '',
    topic: '',
    isPublic: true,
    maxParticipants: ROOM.MAX_PARTICIPANTS,
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!user) return
    setLoading(true)
    setError('')
    try {
      const room = await createRoom(user.id, {
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        topic: form.topic.trim() || undefined,
        isPublic: form.isPublic,
        maxParticipants: form.maxParticipants,
      })
      router.push(`/room/${room.id}`)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '방 생성에 실패했습니다.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0D0F14] flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-[#161B22] border border-white/10 rounded-2xl p-6 space-y-5">
        <div>
          <h1 className="text-xl font-bold text-white">집중방 만들기</h1>
          <p className="text-sm text-slate-400 mt-1">친구들과 함께 공부할 공간을 만들어보세요.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-slate-400 mb-1">방 이름 *</label>
            <input
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              placeholder="예: 토익 고득점 스터디"
              maxLength={ROOM.MAX_NAME_LENGTH}
              required
              className="w-full bg-[#0D0F14] border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-slate-600 focus:outline-none focus:border-[#6366F1] transition-colors text-sm"
            />
          </div>

          <div>
            <label className="block text-sm text-slate-400 mb-1">주제 태그</label>
            <input
              value={form.topic}
              onChange={(e) => setForm((p) => ({ ...p, topic: e.target.value }))}
              placeholder="예: 영어, 수학, 코딩..."
              className="w-full bg-[#0D0F14] border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-slate-600 focus:outline-none focus:border-[#6366F1] transition-colors text-sm"
            />
          </div>

          <div>
            <label className="block text-sm text-slate-400 mb-1">소개 (선택)</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              placeholder="이 방에서 무엇을 공부하나요?"
              rows={3}
              maxLength={ROOM.MAX_DESCRIPTION_LENGTH}
              className="w-full bg-[#0D0F14] border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-slate-600 focus:outline-none focus:border-[#6366F1] transition-colors text-sm resize-none"
            />
          </div>

          <div className="flex items-center justify-between py-2">
            <div>
              <p className="text-sm text-white">공개 방</p>
              <p className="text-xs text-slate-500">누구나 검색하고 입장할 수 있습니다</p>
            </div>
            <button
              type="button"
              onClick={() => setForm((p) => ({ ...p, isPublic: !p.isPublic }))}
              className={`w-11 h-6 rounded-full transition-colors ${form.isPublic ? 'bg-[#6366F1]' : 'bg-[#242E42]'}`}
            >
              <span className={`block w-4 h-4 rounded-full bg-white transition-transform mx-1 ${form.isPublic ? 'translate-x-5' : 'translate-x-0'}`} />
            </button>
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <button
            type="submit"
            disabled={loading || !form.name.trim()}
            className="w-full bg-[#6366F1] hover:bg-[#4F46E5] disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-colors"
          >
            {loading ? '생성 중...' : '방 만들기'}
          </button>
        </form>
      </div>
    </div>
  )
}
