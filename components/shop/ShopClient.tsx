'use client'

import { useState, useMemo } from 'react'
import { purchaseItem } from '@/services/coin.service'
import type { ShopItem, OwnedItem } from '@/types/shop.types'

type Tab = 'all' | 'consumable' | 'cosmetic'

interface Props {
  userId: string
  coins: number
  streakShields: number
  xpBoostUntil: string | null
  coinBoostUntil: string | null
  items: ShopItem[]
  ownedItems: OwnedItem[]
}

function formatTimeLeft(until: string): string {
  const ms = new Date(until).getTime() - Date.now()
  if (ms <= 0) return '만료됨'
  const h = Math.floor(ms / 3600000)
  const m = Math.floor((ms % 3600000) / 60000)
  return h > 0 ? `${h}시간 ${m}분 남음` : `${m}분 남음`
}

function ActiveBadge({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-green-500/15 text-green-400 px-2 py-0.5 rounded-full">
      <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
      {label}
    </span>
  )
}

export function ShopClient({ coins: initialCoins, streakShields: initialShields, xpBoostUntil: initialXpBoost, coinBoostUntil: initialCoinBoost, items, ownedItems }: Props) {
  const [coins, setCoins] = useState(initialCoins)
  const [shields, setShields] = useState(initialShields)
  const [xpBoostUntil, setXpBoostUntil] = useState(initialXpBoost)
  const [coinBoostUntil, setCoinBoostUntil] = useState(initialCoinBoost)
  const [buying, setBuying] = useState<string | null>(null)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [activeTab, setActiveTab] = useState<Tab>('all')

  const ownedKeys = useMemo(() => {
    const keys: Record<string, number> = {}
    for (const oi of ownedItems) {
      const key = Array.isArray(oi.item) ? oi.item[0]?.key : oi.item?.key
      if (key) keys[key] = (keys[key] ?? 0) + 1
    }
    return keys
  }, [ownedItems])

  const filtered = activeTab === 'all' ? items : items.filter((i) => i.category === activeTab)

  function showToast(type: 'success' | 'error', text: string) {
    setToast({ type, text })
    setTimeout(() => setToast(null), 3000)
  }

  async function handleBuy(item: ShopItem) {
    if (buying) return
    setBuying(item.key)
    const result = await purchaseItem(item.key)
    setBuying(null)
    if (!result.success) {
      showToast('error', result.error === 'Not enough coins' ? '코인이 부족해요!' : (result.error ?? '구매 실패'))
      return
    }
    setCoins(result.remaining_coins ?? coins - item.price)
    if (item.key === 'streak_shield') setShields((s) => s + 1)
    if (item.key === 'xp_booster') setXpBoostUntil(new Date(Date.now() + 24 * 3600000).toISOString())
    if (item.key === 'coin_booster') setCoinBoostUntil(new Date(Date.now() + 24 * 3600000).toISOString())
    showToast('success', `${item.name} 구매 완료! 💰-${item.price}`)
  }

  function getItemStatus(item: ShopItem): React.ReactNode {
    if (item.key === 'streak_shield' && shields > 0) {
      return <span className="text-xs text-blue-400 font-medium">보유 {shields}개</span>
    }
    if (item.key === 'xp_booster' && xpBoostUntil && new Date(xpBoostUntil) > new Date()) {
      return <ActiveBadge label={formatTimeLeft(xpBoostUntil)} />
    }
    if (item.key === 'coin_booster' && coinBoostUntil && new Date(coinBoostUntil) > new Date()) {
      return <ActiveBadge label={formatTimeLeft(coinBoostUntil)} />
    }
    const count = ownedKeys[item.key]
    if (count && item.category === 'cosmetic') {
      return <span className="text-xs text-slate-400 font-medium">보유 중</span>
    }
    return null
  }

  const TABS: { key: Tab; label: string }[] = [
    { key: 'all', label: '전체' },
    { key: 'consumable', label: '소모품' },
    { key: 'cosmetic', label: '스킨' },
  ]

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto space-y-6">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold shadow-lg transition-all ${
          toast.type === 'success'
            ? 'bg-green-500/20 border border-green-500/30 text-green-300'
            : 'bg-red-500/20 border border-red-500/30 text-red-300'
        }`}>
          {toast.type === 'success' ? '✓' : '✕'} {toast.text}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">상점</h1>
          <p className="text-sm text-slate-400 mt-0.5">코인으로 아이템을 구매하세요</p>
        </div>
        <div className="flex items-center gap-2 bg-[#161B22] border border-yellow-500/20 rounded-xl px-4 py-2.5">
          <span className="text-xl leading-none">💰</span>
          <span className="text-xl font-bold text-yellow-400">{coins.toLocaleString()}</span>
        </div>
      </div>

      {/* Earn coins info */}
      <div className="bg-[#161B22] border border-white/10 rounded-2xl p-4">
        <p className="text-xs font-semibold text-slate-400 mb-3">코인 획득 방법</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[
            { icon: '📅', label: '일일 접속', amount: '+10' },
            { icon: '⏱', label: '세션 완료', amount: '+5' },
            { icon: '🎯', label: '목표 달성', amount: '+20' },
            { icon: '🔥', label: '10일 스트릭', amount: '+50' },
          ].map((r) => (
            <div key={r.label} className="flex items-center gap-2 bg-white/5 rounded-xl p-2.5">
              <span className="text-lg leading-none">{r.icon}</span>
              <div className="min-w-0">
                <p className="text-[11px] text-slate-400 truncate">{r.label}</p>
                <p className="text-sm font-bold text-yellow-400">{r.amount}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Category tabs */}
      <div className="flex gap-2">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
              activeTab === t.key
                ? 'bg-[#6366F1] text-white shadow-[0_0_12px_rgba(99,102,241,0.4)]'
                : 'bg-[#161B22] border border-white/10 text-slate-400 hover:text-white'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Item grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-slate-500">
          <p className="text-3xl mb-2">🛍️</p>
          <p className="text-sm">아이템이 없어요.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
          {filtered.map((item) => {
            const isLoading = buying === item.key
            const canAfford = coins >= item.price
            const status = getItemStatus(item)
            const isComing = item.name.includes('예정')

            return (
              <div
                key={item.id}
                className={`bg-[#161B22] border rounded-2xl p-4 flex flex-col gap-3 transition-all ${
                  isComing
                    ? 'border-white/5 opacity-60'
                    : 'border-white/10 hover:border-[#6366F1]/30'
                }`}
              >
                {/* Icon */}
                <div className="flex items-start justify-between">
                  <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center text-3xl">
                    {item.icon}
                  </div>
                  {item.category === 'consumable' && !isComing && (
                    <span className="text-[10px] font-semibold bg-[#6366F1]/15 text-[#6366F1] px-2 py-0.5 rounded-full">소모품</span>
                  )}
                  {item.category === 'cosmetic' && !isComing && (
                    <span className="text-[10px] font-semibold bg-purple-500/15 text-purple-400 px-2 py-0.5 rounded-full">스킨</span>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 space-y-1">
                  <p className="text-sm font-bold text-white leading-tight">{item.name}</p>
                  <p className="text-[11px] text-slate-500 leading-relaxed">{item.description}</p>
                  {status && <div className="pt-0.5">{status}</div>}
                </div>

                {/* Price + Buy */}
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5">
                    <span className="text-base leading-none">💰</span>
                    <span className={`text-base font-bold ${canAfford ? 'text-yellow-400' : 'text-slate-600'}`}>
                      {item.price.toLocaleString()}
                    </span>
                  </div>
                  <button
                    onClick={() => handleBuy(item)}
                    disabled={isLoading || isComing}
                    className={`w-full py-2 rounded-xl text-sm font-semibold transition-all ${
                      isComing
                        ? 'bg-white/5 text-slate-600 cursor-not-allowed'
                        : canAfford
                        ? 'bg-[#6366F1] hover:bg-[#4F46E5] text-white shadow-[0_0_12px_rgba(99,102,241,0.3)] disabled:opacity-60'
                        : 'bg-white/5 text-slate-500 cursor-not-allowed'
                    }`}
                  >
                    {isLoading ? (
                      <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : isComing ? (
                      '출시 예정'
                    ) : canAfford ? (
                      '구매하기'
                    ) : (
                      '코인 부족'
                    )}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
