// server component
// src/components/dashboard/StatCard.tsx
import { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface StatCardProps {
  label: string
  value: number
  total?: number
  icon: LucideIcon
  color: 'brand' | 'blue' | 'green' | 'red' | 'amber'
  alert?: boolean
}

const colorMap = {
  brand: {
    bg: 'bg-brand-50 dark:bg-brand-950/30',
    icon: 'text-brand-600 dark:text-brand-400',
    iconBg: 'bg-brand-100 dark:bg-brand-900/50',
    bar: 'bg-brand-500',
  },
  blue: {
    bg: 'bg-blue-50 dark:bg-blue-950/30',
    icon: 'text-blue-600 dark:text-blue-400',
    iconBg: 'bg-blue-100 dark:bg-blue-900/50',
    bar: 'bg-blue-500',
  },
  green: {
    bg: 'bg-emerald-50 dark:bg-emerald-950/30',
    icon: 'text-emerald-600 dark:text-emerald-400',
    iconBg: 'bg-emerald-100 dark:bg-emerald-900/50',
    bar: 'bg-emerald-500',
  },
  red: {
    bg: 'bg-red-50 dark:bg-red-950/30',
    icon: 'text-red-600 dark:text-red-400',
    iconBg: 'bg-red-100 dark:bg-red-900/50',
    bar: 'bg-red-500',
  },
  amber: {
    bg: 'bg-amber-50 dark:bg-amber-950/30',
    icon: 'text-amber-600 dark:text-amber-400',
    iconBg: 'bg-amber-100 dark:bg-amber-900/50',
    bar: 'bg-amber-500',
  },
}

export default function StatCard({ label, value, total, icon: Icon, color, alert }: StatCardProps) {
  const colors = colorMap[color]
  const percentage = total && total > 0 ? Math.round((value / total) * 100) : null

  return (
    <div className={cn('card p-5', alert && value > 0 && 'ring-1 ring-red-200 dark:ring-red-900')}>
      <div className="flex items-start justify-between mb-4">
        <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', colors.iconBg)}>
          <Icon className={cn('w-5 h-5', colors.icon)} />
        </div>
        {alert && value > 0 && (
          <span className="w-2 h-2 rounded-full bg-red-500 mt-1" />
        )}
      </div>
      <div className="text-3xl font-semibold text-gray-900 dark:text-white mb-1">{value}</div>
      <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>

      {percentage !== null && (
        <div className="mt-3">
          <div className="h-1 bg-gray-100 dark:bg-neutral-800 rounded-full overflow-hidden">
            <div
              className={cn('h-full rounded-full transition-all duration-700', colors.bar)}
              style={{ width: `${percentage}%` }}
            />
          </div>
          <p className="text-xs text-gray-400 mt-1">{percentage}% del total</p>
        </div>
      )}
    </div>
  )
}
