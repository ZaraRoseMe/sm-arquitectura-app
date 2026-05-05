'use client'
// src/components/time/TimesheetsClient.tsx
import { useState, useMemo } from 'react'
import { Clock, Download, Trash2, ChevronLeft, ChevronRight } from 'lucide-react'
import { eachDayOfInterval, format, isWeekend, isSameDay, addMonths, subMonths, startOfMonth, endOfMonth, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { cn, getInitials } from '@/lib/utils'
import toast from 'react-hot-toast'

interface TimesheetsClientProps {
  entries: any[]
  projects: any[]
  users: any[]
  isAdmin: boolean
  currentUserId: string
  currentUserName?: string
  currentUserColor?: string
}

function toDateStr(date: any): string {
  const d = new Date(date)
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, '0')
  const day = String(d.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function formatTime(hours: number, minutes: number) {
  if (hours === 0 && minutes === 0) return '0min'
  if (hours === 0) return `${minutes}min`
  if (minutes === 0) return `${hours}h`
  return `${hours}h${minutes}min`
}

function totalMins(entries: any[]) {
  return entries.reduce((s, e) => s + e.hours * 60 + e.minutes, 0)
}

function minsToTime(m: number) {
  return formatTime(Math.floor(m / 60), m % 60)
}

const DAY_W = 32 // px per day cell
const LABEL_W = 200

function DayCell({ date }: { date: Date }) {
  const weekend = isWeekend(date)
  const today = isSameDay(date, new Date())
  const letter = format(date, 'EEEEE', { locale: es }).toUpperCase()
  return (
    <div className={cn('flex-shrink-0 flex flex-col items-center justify-center border-r text-[9px]',
      today ? 'border-indigo-400 text-white' : weekend ? 'border-gray-100 dark:border-neutral-800 text-gray-400' : 'border-gray-50 dark:border-neutral-800/50 text-gray-400 dark:text-gray-600')}
      style={{ width: DAY_W, backgroundColor: today ? '#6366F1' : weekend ? undefined : undefined }}>
      <span className="font-bold leading-none">{letter}</span>
      <span className="font-medium">{format(date, 'd')}</span>
    </div>
  )
}

export default function TimesheetsClient({ entries: initialEntries, projects, users, isAdmin, currentUserId, currentUserColor }: TimesheetsClientProps) {
  const [entries, setEntries] = useState(initialEntries)
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [projectFilter, setProjectFilter] = useState('ALL')

  // Range: full current month by default
  const rangeStart = startOfMonth(currentMonth)
  const rangeEnd = endOfMonth(currentMonth)
  const days = eachDayOfInterval({ start: rangeStart, end: rangeEnd })

  const months = useMemo(() => {
    const result: { label: string; days: Date[] }[] = []
    let cm = ''; let cd: Date[] = []
    days.forEach(day => {
      const ml = format(day, 'MMMM yyyy', { locale: es })
      if (ml !== cm) { if (cd.length) result.push({ label: cm, days: cd }); cm = ml; cd = [] }
      cd.push(day)
    })
    if (cd.length) result.push({ label: cm, days: cd })
    return result
  }, [days])

  // Filter entries by month and project
  const filtered = useMemo(() => entries.filter(e => {
    const ds = toDateStr(e.date)
    const monthStr = format(currentMonth, 'yyyy-MM')
    if (!ds.startsWith(monthStr)) return false
    if (projectFilter !== 'ALL' && e.task?.project?.id !== projectFilter) return false
    return true
  }), [entries, currentMonth, projectFilter])

  // Group entries by user → task
  const groupedByUser = useMemo(() => {
    // Build user list: admin first, then others
    const allUsers = isAdmin
      ? [
          // current user (admin) first
          ...(users.filter(u => u.id === currentUserId)),
          ...(users.filter(u => u.id !== currentUserId)),
        ]
      : users.filter(u => u.id === currentUserId)

    return allUsers.map(user => {
      const userEntries = filtered.filter(e => e.userId === user.id)
      // Group by task
      const taskMap: Record<string, { task: any; entries: any[] }> = {}
      userEntries.forEach(e => {
        const tid = e.task?.id || 'unknown'
        if (!taskMap[tid]) taskMap[tid] = { task: e.task, entries: [] }
        taskMap[tid].entries.push(e)
      })
      return { user, tasks: Object.values(taskMap), total: totalMins(userEntries) }
    }).filter(u => u.tasks.length > 0 || u.user.id === currentUserId)
  }, [filtered, users, currentUserId, isAdmin])

  // Get entries for a specific day and task
  function getDayEntries(taskEntries: any[], date: Date) {
    return taskEntries.filter(e => toDateStr(e.date) === toDateStr(date))
  }

  async function handleDelete(id: string) {
    if (!confirm('¿Eliminar este registro?')) return
    const res = await fetch(`/api/time-entries/${id}`, { method: 'DELETE' })
    if (res.ok) {
      setEntries(prev => prev.filter(e => e.id !== id))
      toast.success('Registro eliminado')
    } else toast.error('Error al eliminar')
  }

  async function handleExportPDF() {
    const tid = toast.loading('Generando PDF...')
    try {
      const { default: jsPDF } = await import('jspdf')
      const { default: autoTable } = await import('jspdf-autotable')
      const doc = new jsPDF({ orientation: 'landscape', format: 'a4' })
      const W = 297, M = 12
      doc.setFillColor(99, 102, 241); doc.rect(0, 0, W, 14, 'F')
      doc.setTextColor(255, 255, 255); doc.setFontSize(10); doc.setFont('helvetica', 'bold')
      doc.text('KRONOZ — Reporte de Tiempos', M, 9)
      doc.setFontSize(7); doc.setFont('helvetica', 'normal')
      doc.text(format(currentMonth, 'MMMM yyyy', { locale: es }), W - M - 30, 9)
      autoTable(doc, {
        startY: 20,
        head: [['Colaborador', 'Proyecto', 'Tarea', 'Fecha', 'Tiempo', 'Nota']],
        body: filtered.map(e => [e.user?.name || '', e.task?.project?.name || '', e.task?.name || '', toDateStr(e.date), formatTime(e.hours, e.minutes), e.note || '']),
        headStyles: { fillColor: [79, 82, 200], textColor: 255, fontSize: 7, fontStyle: 'bold' },
        bodyStyles: { fontSize: 7, textColor: [40, 45, 80] },
        alternateRowStyles: { fillColor: [242, 243, 252] },
        margin: { left: M, right: M },
      })
      doc.save(`kronoz-tiempos-${format(currentMonth, 'yyyy-MM')}.pdf`)
      toast.dismiss(tid); toast.success('PDF descargado')
    } catch { toast.dismiss(tid); toast.error('Error') }
  }

  const grandTotal = totalMins(filtered)

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Tiempos</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Total: <span className="font-semibold text-gray-800 dark:text-white">{minsToTime(grandTotal)}</span>
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleExportPDF} className="btn-secondary flex items-center gap-2 text-sm">
            <Download className="w-4 h-4" /> PDF
          </button>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Month nav */}
        <div className="flex items-center gap-2 bg-gray-100 dark:bg-neutral-800 rounded-lg p-1">
          <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-white dark:hover:bg-neutral-700 transition-colors">
            <ChevronLeft className="w-4 h-4 text-gray-500" />
          </button>
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300 capitalize min-w-[130px] text-center">
            {format(currentMonth, 'MMMM yyyy', { locale: es })}
          </span>
          <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-white dark:hover:bg-neutral-700 transition-colors">
            <ChevronRight className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        <select value={projectFilter} onChange={e => setProjectFilter(e.target.value)} className="input w-48">
          <option value="ALL">Todos los proyectos</option>
          {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>

      {/* Gantt de tiempos */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <div style={{ minWidth: days.length * DAY_W + LABEL_W }}>

            {/* Header */}
            <div className="flex border-b border-gray-100 dark:border-neutral-800 sticky top-0 bg-white dark:bg-neutral-900 z-10">
              <div className="flex-shrink-0 border-r border-gray-100 dark:border-neutral-800" style={{ width: LABEL_W }}>
                <div className="px-3 py-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400">
                  {format(currentMonth, 'MMMM yyyy', { locale: es }).toUpperCase()}
                </div>
              </div>
              <div className="flex">
                {days.map(day => <DayCell key={day.toISOString()} date={day} />)}
              </div>
            </div>

            {/* Users */}
            {groupedByUser.length === 0 ? (
              <div className="py-16 text-center">
                <Clock className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 text-sm">No hay registros para este período</p>
              </div>
            ) : groupedByUser.map(({ user, tasks, total }) => (
              <div key={user.id} className="border-b border-gray-50 dark:border-neutral-800">
                {/* User header row */}
                <div className="flex items-center bg-gray-50/50 dark:bg-neutral-800/20 border-b border-gray-100 dark:border-neutral-800/50">
                  <div className="flex-shrink-0 px-3 py-2 flex items-center justify-between border-r border-gray-100 dark:border-neutral-800" style={{ width: LABEL_W }}>
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-semibold flex-shrink-0"
                        style={{ backgroundColor: user.color || '#6366F1' }}>
                        {getInitials(user.name)}
                      </div>
                      <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 truncate">{user.name}</span>
                    </div>
                    <span className="text-xs font-semibold text-brand-600 dark:text-brand-400 flex-shrink-0 ml-1">{minsToTime(total)}</span>
                  </div>
                  {/* Day totals row for user */}
                  <div className="flex">
                    {days.map(day => {
                      const dayEntries = filtered.filter(e => e.userId === user.id && toDateStr(e.date) === toDateStr(day))
                      const mins = totalMins(dayEntries)
                      const weekend = isWeekend(day)
                      const today = isSameDay(day, new Date())
                      return (
                        <div key={day.toISOString()}
                          className={cn('flex-shrink-0 flex items-center justify-center border-r text-[9px] font-medium',
                            today ? 'border-indigo-400 bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600' :
                            weekend ? 'border-gray-100 dark:border-neutral-800 bg-gray-100/50 dark:bg-neutral-800/30 text-gray-400' :
                            'border-gray-50 dark:border-neutral-800/50 text-gray-400')}
                          style={{ width: DAY_W, height: 32 }}>
                          {mins > 0 ? <span className="text-brand-600 dark:text-brand-400 font-bold">{minsToTime(mins)}</span> : null}
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Task rows */}
                {tasks.map(({ task, entries: taskEntries }) => (
                  <div key={task?.id} className="flex items-center hover:bg-gray-50/30 dark:hover:bg-neutral-800/10 transition-colors group">
                    <div className="flex-shrink-0 px-3 py-2 border-r border-gray-100 dark:border-neutral-800 pl-8" style={{ width: LABEL_W }}>
                      <p className="text-xs text-gray-600 dark:text-gray-400 truncate">{task?.name}</p>
                      <p className="text-[10px] text-gray-400 truncate">{task?.project?.name}</p>
                    </div>
                    <div className="flex">
                      {days.map(day => {
                        const dayEntries = getDayEntries(taskEntries, day)
                        const mins = totalMins(dayEntries)
                        const weekend = isWeekend(day)
                        const today = isSameDay(day, new Date())
                        const hasWork = mins > 0

                        return (
                          <div key={day.toISOString()}
                            className={cn('flex-shrink-0 flex items-center justify-center border-r relative',
                              today ? 'border-indigo-400' : weekend ? 'border-gray-100 dark:border-neutral-800' : 'border-gray-50 dark:border-neutral-800/50',
                              weekend && !hasWork && 'bg-gray-100/50 dark:bg-neutral-800/30')}
                            style={{ width: DAY_W, height: 36 }}>
                            {today && <div className="absolute inset-0 bg-indigo-50/50 dark:bg-indigo-950/10" />}
                            {hasWork && (
                              <div className="relative flex flex-col items-center justify-center w-full h-full">
                                {/* Bar fill based on hours (8h = full) */}
                                <div className="absolute bottom-0 left-0.5 right-0.5 rounded-t-sm"
                                  style={{
                                    height: `${Math.min(100, (mins / 480) * 100)}%`,
                                    backgroundColor: user.color || '#6366F1',
                                    opacity: 0.25,
                                  }} />
                                <span className="relative text-[8px] font-bold z-10"
                                  style={{ color: user.color || '#6366F1' }}>
                                  {minsToTime(mins)}
                                </span>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Detail table */}
      {filtered.length > 0 && (
        <div className="card overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 dark:border-neutral-800">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Detalle de registros</h2>
          </div>
          <div className="divide-y divide-gray-50 dark:divide-neutral-800">
            {filtered.map(entry => (
              <div key={entry.id} className="flex items-center gap-3 px-5 py-2.5 hover:bg-gray-50/50 dark:hover:bg-neutral-800/20 group">
                <div className="w-5 h-5 rounded-full flex items-center justify-center text-white flex-shrink-0"
                  style={{ backgroundColor: entry.user?.color || '#6366F1', fontSize: 9 }}>
                  {getInitials(entry.user?.name || '')}
                </div>
                <div className="w-20 flex-shrink-0">
                  <span className="text-xs text-gray-500">{toDateStr(entry.date)}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-700 dark:text-gray-300 truncate">{entry.task?.name}</p>
                  {entry.note && <p className="text-[10px] text-gray-400 truncate">{entry.note}</p>}
                </div>
                <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 w-14 text-right flex-shrink-0">
                  {formatTime(entry.hours, entry.minutes)}
                </span>
                {(entry.userId === currentUserId || isAdmin) && (
                  <button onClick={() => handleDelete(entry.id)}
                    className="opacity-0 group-hover:opacity-100 w-6 h-6 flex items-center justify-center rounded text-gray-400 hover:text-red-500 transition-all">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
