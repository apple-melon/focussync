import { getLevelTier } from '@/lib/xp/formulas'

interface Props {
  level: number
  size?: 'sm' | 'md' | 'lg'
}

const SIZE_CLASSES = {
  sm: 'text-xs px-2 py-0.5',
  md: 'text-sm px-3 py-1',
  lg: 'text-base px-4 py-1.5',
}

export function LevelBadge({ level, size = 'md' }: Props) {
  const tier = getLevelTier(level)
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-semibold bg-black/30 border ${SIZE_CLASSES[size]}`}
      style={{ borderColor: tier.color, color: tier.color }}
    >
      <span>Lv.{level}</span>
      <span className="opacity-70 text-xs">{tier.name}</span>
    </span>
  )
}
