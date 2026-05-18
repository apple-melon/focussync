'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { ShopItem } from '@/types/shop.types'

interface OwnedSkin extends ShopItem {
  purchasedAt: string
}

interface Props {
  userId: string
  streakShields: number
  xpBoostUntil: string | null
  coinBoostUntil: string | null
  activeSkin: string
  ownedSkins: OwnedSkin[]
}

function formatTimeLeft(until: string): string {
  const ms = new Date(until).getTime() - Date.now()
  if (ms <= 0) return '만료됨'
  const h = Math.floor(ms / 3600000)
  const m = Math.floor((ms % 3600000) / 60000)
  return h > 0 ? `${h}시간 ${m}분 남음` : `${m}분 남음`
}

export function InventoryClient({ userId, streakShields, xpBoostUntil, coinBoostUntil, activeSkin: initialSkin, ownedSkins }: Props) {
  const [activeSkin, setActiveSkin] = useState(initialSkin)
  const [activating, setActivating] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 2500)
  }

  async function handleActivate(skinKey: string) {
    setActivating(skinKey)
    const supabase = createClient()
    const { data } = await supabase.rpc('activate_skin', { p_skin_key: skinKey })
    setActivating(null)
    if (data?.success) {
      setActiveSkin(skinKey)
      showToast('스킨이 활성화됐어요!')
    }
  }

  async function handleReset() {
    setActivating('default')
    const supabase = createClient()
    await supabase.rpc('activate_skin', { p_skin_key: 'default' })
    setActivating(null)
    setActiveSkin('default')
    showToast('기본 스킨으로 변경됐어요.')
  }

  const xpActive = xpBoostUntil && new Date(xpBoostUntil) > new Date()
  const coinActive = coinBoostUntil && new Date(coinBoostUntil) > new Date()

  return (
    <div className="p-4 sm:p-6 max-w-2xl mx-auto space-y-6">
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-xl text-sm font-semibold bg-green-500/20 border border-green-500/30 text-green-300 shadow-lg">
          ✓ {toast}
        </div>
      )}

      <div>
        <h1 className="text-2xl font-bold text-white">인벤토리</h1>
        <p className="text-sm text-slate-400 mt-0.5">보유한 아이템과 스킨을 확인해요</p>
      </div>

      {/* Active effects */}
      <div className="bg-[#161B22] border border-white/10 rounded-2xl p-5 space-y-3">
        <h2 className="text-sm font-semibold text-white">활성 효과</h2>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="text-xl">🛡️</span>
              <div>
                <p className="text-sm font-medium text-white">스트릭 방패</p>
                <p className="text-xs text-slate-500">스트릭 보호 아이템</p>
              </div>
            </div>
            <span className={`text-sm font-bold ${streakShields > 0 ? 'text-blue-400' : 'text-slate-600'}`}>
              {streakShields > 0 ? `${streakShields}개 보유` : '없음'}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="text-xl">⚡</span>
              <div>
                <p className="text-sm font-medium text-white">XP 부스터</p>
                <p className="text-xs text-slate-500">XP 1.5배 효과</p>
              </div>
            </div>
            {xpActive ? (
              <span className="text-xs font-semibold bg-green-500/15 text-green-400 px-2 py-1 rounded-lg">
                {formatTimeLeft(xpBoostUntil!)}
              </span>
            ) : (
              <span className="text-sm text-slate-600">비활성</span>
            )}
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="text-xl">💰</span>
              <div>
                <p className="text-sm font-medium text-white">코인 부스터</p>
                <p className="text-xs text-slate-500">코인 2배 효과</p>
              </div>
            </div>
            {coinActive ? (
              <span className="text-xs font-semibold bg-green-500/15 text-green-400 px-2 py-1 rounded-lg">
                {formatTimeLeft(coinBoostUntil!)}
              </span>
            ) : (
              <span className="text-sm text-slate-600">비활성</span>
            )}
          </div>
        </div>
      </div>

      {/* Skins */}
      <div className="bg-[#161B22] border border-white/10 rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white">타이머 스킨</h2>
          {activeSkin !== 'default' && (
            <button
              onClick={handleReset}
              disabled={activating === 'default'}
              className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
            >
              기본으로 리셋
            </button>
          )}
        </div>

        {/* Default skin */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-[#6366F1]/10 flex items-center justify-center text-2xl">⚡</div>
            <div>
              <p className="text-sm font-medium text-white">기본 스킨</p>
              <p className="text-xs text-slate-500">항상 사용 가능</p>
            </div>
          </div>
          {activeSkin === 'default' ? (
            <span className="text-xs font-semibold bg-[#6366F1]/15 text-[#6366F1] px-3 py-1.5 rounded-lg">사용 중</span>
          ) : (
            <button
              onClick={() => handleActivate('default')}
              className="text-xs font-semibold bg-white/8 hover:bg-white/12 text-slate-300 px-3 py-1.5 rounded-lg transition-colors"
            >
              사용하기
            </button>
          )}
        </div>

        {ownedSkins.length === 0 && (
          <p className="text-sm text-slate-600 text-center py-4">보유한 스킨이 없어요. 상점에서 구매해보세요!</p>
        )}

        {ownedSkins.map((skin) => {
          const isActive = activeSkin === skin.key
          return (
            <div key={skin.id} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center text-2xl">{skin.icon}</div>
                <div>
                  <p className="text-sm font-medium text-white">{skin.name}</p>
                  <p className="text-xs text-slate-500">{skin.description}</p>
                </div>
              </div>
              {isActive ? (
                <span className="text-xs font-semibold bg-[#6366F1]/15 text-[#6366F1] px-3 py-1.5 rounded-lg">사용 중</span>
              ) : (
                <button
                  onClick={() => handleActivate(skin.key)}
                  disabled={activating === skin.key}
                  className="text-xs font-semibold bg-[#6366F1] hover:bg-[#4F46E5] disabled:opacity-60 text-white px-3 py-1.5 rounded-lg transition-colors"
                >
                  {activating === skin.key ? '...' : '활성화'}
                </button>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
