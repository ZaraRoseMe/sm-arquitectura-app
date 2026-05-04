// src/lib/utils.ts
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, differenceInDays, isAfter, isWithinInterval } from 'date-fns'
import { es } from 'date-fns/locale'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Parse any date safely avoiding UTC timezone shift
// Handles: Date objects, ISO strings, YYYY-MM-DD strings
export function parseDate(date: Date | string): Date {
  if (date instanceof Date) return date
  const str = typeof date === 'string' ? date : String(date)
  // If it's just YYYY-MM-DD (no time), parse as local
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    const [y, m, d] = str.split('-').map(Number)
    return new Date(y, m - 1, d)
  }
  // If it has time (ISO string from DB), extract date part only
  const datePart = str.substring(0, 10)
  const [y, m, d] = datePart.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function formatDate(date: Date | string, fmt = 'dd MMM yyyy') {
  return format(parseDate(date), fmt, { locale: es })
}

export function formatDateInput(date: Date | string) {
  return format(parseDate(date), 'yyyy-MM-dd')
}

export function daysBetween(start: Date | string, end: Date | string) {
  return differenceInDays(parseDate(end), parseDate(start))
}

export function isOverdue(endDate: Date | string) {
  return isAfter(new Date(), parseDate(endDate))
}

export function detectConflicts(
  newTask: { startDate: Date; endDate: Date; userId: string },
  existingTasks: { startDate: Date; endDate: Date; userId: string; id?: string; name?: string }[]
) {
  const conflicts = existingTasks.filter((task) => {
    if (task.userId !== newTask.userId) return false
    const taskStart = parseDate(task.startDate)
    const taskEnd = parseDate(task.endDate)
    const newStart = parseDate(newTask.startDate)
    const newEnd = parseDate(newTask.endDate)
    return (
      isWithinInterval(newStart, { start: taskStart, end: taskEnd }) ||
      isWithinInterval(newEnd, { start: taskStart, end: taskEnd }) ||
      isWithinInterval(taskStart, { start: newStart, end: newEnd })
    )
  })
  return conflicts
}

export function getStatusColor(status: string) {
  switch (status) {
    case 'TERMINADO': return { bg: 'bg-emerald-100', text: 'text-emerald-700', dot: 'bg-emerald-500', border: 'border-emerald-200' }
    case 'EN_PROGRESO': return { bg: 'bg-blue-100', text: 'text-blue-700', dot: 'bg-blue-500', border: 'border-blue-200' }
    case 'PAUSADO': return { bg: 'bg-amber-100', text: 'text-amber-700', dot: 'bg-amber-500', border: 'border-amber-200' }
    case 'PENDIENTE': return { bg: 'bg-gray-100', text: 'text-gray-600', dot: 'bg-gray-400', border: 'border-gray-200' }
    default: return { bg: 'bg-gray-100', text: 'text-gray-600', dot: 'bg-gray-400', border: 'border-gray-200' }
  }
}

export function getStatusLabel(status: string) {
  switch (status) {
    case 'TERMINADO': return 'Terminado'
    case 'EN_PROGRESO': return 'En Progreso'
    case 'PAUSADO': return 'Pausado'
    case 'PENDIENTE': return 'Pendiente'
    default: return status
  }
}

export function generateAvatarColor(name: string) {
  const colors = [
    '#4f52e5', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
    '#06B6D4', '#EC4899', '#14B8A6', '#F97316', '#6366F1',
  ]
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return colors[Math.abs(hash) % colors.length]
}

export function getInitials(name: string) {
  return name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}
