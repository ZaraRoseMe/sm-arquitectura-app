'use client'
// src/components/time/TimesheetsClient.tsx
import { useState, useMemo } from 'react'
import { Clock, Download, Trash2, ChevronLeft, ChevronRight, Users, Folder, X, Check, Calendar, Grid } from 'lucide-react'
import { eachDayOfInterval, format, isWeekend, isSameDay, addMonths, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addWeeks, subWeeks } from 'date-fns'
import { es } from 'date-fns/locale'
import { cn, getInitials } from '@/lib/utils'
import toast from 'react-hot-toast'

interface TimesheetsClientProps {
  entries: any[]
  workPlans: any[]
  projects: any[]
  users: any[]
  tasks: any[]
  myTasks: any[]
  isAdmin: boolean
  currentUserId: string
  currentUserColor?: string
}

type ViewMode = 'weekly' | 'monthly'

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

type GroupMode = 'user' | 'project'

// ─── Quick Entry Modal (inline, para vista semanal) ──────────────────────────
interface QuickEntryModalProps {
  taskId: string
  taskName: string
  projectName: string
  dateStr: string   // YYYY-MM-DD
  existingEntry?: { id: string; hours: number; minutes: number; note?: string }
  onClose: () => void
  onSaved: (entry: any) => void
  onDeleted?: (id: string) => void
}

function QuickEntryModal({ taskId, taskName, projectName, dateStr, existingEntry, onClose, onSaved, onDeleted }: QuickEntryModalProps) {
  const [hours, setHours] = useState(existingEntry?.hours ?? 0)
  const [minutes, setMinutes] = useState(existingEntry?.minutes ?? 0)
  const [note, setNote] = useState(existingEntry?.note ?? '')
  const [loading, setLoading] = useState(false)

  const dateLabel = format(new Date(dateStr + 'T12:00:00'), "EEEE d 'de' MMMM", { locale: es })

  async function handleSave() {
    if (hours === 0 && minutes === 0) { toast.error('Ingresa al menos 1 minuto'); return }
    setLoading(true)
    try {
      const res = await fetch('/api/time-entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId, date: dateStr, hours, minutes, note: note || null }),
      })
      const data = await res.json()
      toast.success('Tiempo guardado')
      onSaved(data)
    } catch { toast.error('Error al guardar') }
    setLoading(false)
  }

  async function handleDelete() {
    if (!existingEntry || !onDeleted) return
    if (!confirm('¿Eliminar este registro?')) return
    const res = await fetch(`/api/time-entries/${existingEntry.id}`, { method: 'DELETE' })
    if (res.ok) { toast.success('Eliminado'); onDeleted(existingEntry.id) }
    else toast.error('Error al eliminar')
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl w-full max-w-xs animate-slide-up"
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-neutral-800">
          <div>
            <h2 className="font-semibold text-gray-900 dark:text-white text-sm capitalize">{dateLabel}</h2>
            <p className="text-xs text-gray-400 truncate max-w-[200px]">{taskName} · {projectName}</p>
          </div>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-neutral-800">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5 space-y-4">
          {/* Inputs de tiempo */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5">
              <input type="number" min={0} max={23} className="w-14 input text-center text-sm py-1.5"
                value={hours} onChange={e => setHours(Math.max(0, parseInt(e.target.value) || 0))} />
              <span className="text-xs text-gray-500">hrs</span>
            </div>
            <span className="text-gray-400">:</span>
            <div className="flex items-center gap-1.5">
              <input type="number" min={0} max={59} className="w-14 input text-center text-sm py-1.5"
                value={minutes} onChange={e => setMinutes(Math.max(0, Math.min(59, parseInt(e.target.value) || 0)))} />
              <span className="text-xs text-gray-500">min</span>
            </div>
          </div>
          {/* Botones rápidos */}
          <div className="flex gap-1.5 flex-wrap">
            {[[0,30],[1,0],[2,0],[4,0],[8,0]].map(([h,m]) => (
              <button key={`${h}${m}`} type="button"
                onClick={() => { setHours(h); setMinutes(m) }}
                className={cn('text-xs px-2 py-1 rounded-lg transition-colors',
                  hours === h && minutes === m
                    ? 'bg-brand-600 text-white'
                    : 'bg-gray-100 dark:bg-neutral-800 text-gray-600 dark:text-gray-300 hover:bg-brand-50 hover:text-brand-600 border border-gray-200 dark:border-neutral-700')}>
                {h > 0 ? `${h}h` : ''}{m > 0 ? `${m}min` : ''}
              </button>
            ))}
          </div>
          {/* Nota */}
          <textarea className="input resize-none text-sm" rows={2}
            value={note} onChange={e => setNote(e.target.value)}
            placeholder="¿Qué hiciste? (opcional)" />
          {/* Acciones */}
          <div className="flex gap-2">
            {existingEntry && onDeleted && (
              <button onClick={handleDelete} className="btn-secondary text-red-500 hover:text-red-600 text-sm px-3">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
            <button onClick={onClose} className="flex-1 btn-secondary text-sm">Cancelar</button>
            <button onClick={handleSave} disabled={loading}
              className="flex-1 btn-primary flex items-center justify-center gap-1.5 text-sm">
              {loading ? <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              Guardar
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

const DAY_W = 32
const LABEL_W = 210

function DayCell({ date }: { date: Date }) {
  const weekend = isWeekend(date)
  const today = isSameDay(date, new Date())
  const letter = format(date, 'EEEEE', { locale: es }).toUpperCase()
  return (
    <div className={cn('flex-shrink-0 flex flex-col items-center justify-center border-r text-[9px]',
      today ? 'border-indigo-400 text-white' : weekend
        ? 'border-gray-100 dark:border-neutral-800 text-gray-400'
        : 'border-gray-50 dark:border-neutral-800/50 text-gray-400 dark:text-gray-600')}
      style={{ width: DAY_W, backgroundColor: today ? '#6366F1' : undefined }}>
      <span className="font-bold leading-none">{letter}</span>
      <span className="font-medium">{format(date, 'd')}</span>
    </div>
  )
}

// Cell showing both planned (ghost) and real (solid) hours
function TimeCell({ realMins, plannedMins, color, date }: { realMins: number; plannedMins: number; color: string; date: Date }) {
  const weekend = isWeekend(date)
  const today = isSameDay(date, new Date())
  const hasReal = realMins > 0
  const hasPlanned = plannedMins > 0

  return (
    <div className={cn('flex-shrink-0 flex items-end justify-center border-r relative gap-px px-0.5',
      today ? 'border-indigo-400' : weekend ? 'border-gray-100 dark:border-neutral-800' : 'border-gray-50 dark:border-neutral-800/50',
      weekend && !hasReal && !hasPlanned && 'bg-gray-100/50 dark:bg-neutral-800/30')}
      style={{ width: DAY_W, height: 40 }}>
      {today && <div className="absolute inset-0 bg-indigo-50/30 dark:bg-indigo-950/10" />}

      {/* Planned bar (ghost/emerald) */}
      {hasPlanned && (
        <div className="relative flex flex-col items-center justify-end flex-1 h-full">
          <div className="w-full rounded-t-sm"
            style={{
              height: `${Math.min(90, (plannedMins / 480) * 90)}%`,
              backgroundColor: '#10B981',
              opacity: 0.2,
              border: '1px dashed #10B981',
            }} />
        </div>
      )}

      {/* Real bar (solid) */}
      {hasReal && (
        <div className="relative flex flex-col items-center justify-end flex-1 h-full">
          <div className="w-full rounded-t-sm"
            style={{
              height: `${Math.min(90, (realMins / 480) * 90)}%`,
              backgroundColor: color,
              opacity: 0.7,
            }} />
        </div>
      )}

      {/* Label — show real if exists, else planned */}
      {(hasReal || hasPlanned) && (
        <div className="absolute top-1 left-0 right-0 flex justify-center">
          <span className="text-[7px] font-bold leading-none"
            style={{ color: hasReal ? color : '#10B981' }}>
            {hasReal ? minsToTime(realMins) : `~${minsToTime(plannedMins)}`}
          </span>
        </div>
      )}
    </div>
  )
}

function SummaryCell({ realMins, plannedMins, color, date }: { realMins: number; plannedMins: number; color: string; date: Date }) {
  const weekend = isWeekend(date)
  const today = isSameDay(date, new Date())
  return (
    <div className={cn('flex-shrink-0 flex items-center justify-center border-r text-[9px] font-medium gap-1',
      today ? 'border-indigo-400 bg-indigo-50 dark:bg-indigo-950/20' :
      weekend ? 'border-gray-100 dark:border-neutral-800 bg-gray-100/50 dark:bg-neutral-800/30' :
      'border-gray-50 dark:border-neutral-800/50')}
      style={{ width: DAY_W, height: 32 }}>
      {realMins > 0 && <span className="font-bold" style={{ color }}>{minsToTime(realMins)}</span>}
      {plannedMins > 0 && realMins === 0 && <span className="font-bold text-emerald-500">~{minsToTime(plannedMins)}</span>}
    </div>
  )
}

export default function TimesheetsClient({ entries: initialEntries, workPlans: initialPlans, projects, users, tasks, myTasks, isAdmin, currentUserId, currentUserColor }: TimesheetsClientProps) {
  const [entries, setEntries] = useState(initialEntries)
  const [workPlans, setWorkPlans] = useState(initialPlans)
  const [viewMode, setViewMode] = useState<ViewMode>('weekly')
  const [showOnlyMine, setShowOnlyMine] = useState(true) // Admin toggle
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [currentWeek, setCurrentWeek] = useState(new Date())
  const [projectFilter, setProjectFilter] = useState('ALL')
  const [userFilter, setUserFilter] = useState('ALL')
  const [groupMode, setGroupMode] = useState<GroupMode>('project')
  // Modal de registro rápido (vista semanal)
  const [quickEntry, setQuickEntry] = useState<{ taskId: string; taskName: string; projectName: string; dateStr: string } | null>(null)

  // Rango de la semana actual (lunes a domingo)
  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 })
  const weekEnd = endOfWeek(currentWeek, { weekStartsOn: 1 })
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd })

  const rangeStart = startOfMonth(currentMonth)
  const rangeEnd = endOfMonth(currentMonth)
  const days = eachDayOfInterval({ start: rangeStart, end: rangeEnd })
  const monthStr = format(currentMonth, 'yyyy-MM')

  // En vista mensual: si admin con showOnlyMine=true, solo sus datos
  const effectiveUserFilter = isAdmin && showOnlyMine && viewMode === 'monthly' ? currentUserId : userFilter

  const filteredEntries = useMemo(() => entries.filter(e => {
    if (!toDateStr(e.date).startsWith(monthStr)) return false
    if (projectFilter !== 'ALL' && e.task?.project?.id !== projectFilter) return false
    if (effectiveUserFilter !== 'ALL' && e.userId !== effectiveUserFilter) return false
    return true
  }), [entries, monthStr, projectFilter, effectiveUserFilter])

  const filteredPlans = useMemo(() => workPlans.filter(p => {
    if (!toDateStr(p.date).startsWith(monthStr)) return false
    if (projectFilter !== 'ALL' && p.task?.project?.id !== projectFilter) return false
    if (effectiveUserFilter !== 'ALL' && p.userId !== effectiveUserFilter) return false
    return true
  }), [workPlans, monthStr, projectFilter, effectiveUserFilter])

  function getRealMins(userId: string, taskId: string, date: Date) {
    return totalMins(filteredEntries.filter(e => e.userId === userId && e.task?.id === taskId && toDateStr(e.date) === toDateStr(date)))
  }

  function getPlannedMins(userId: string, taskId: string, date: Date) {
    return totalMins(filteredPlans.filter(p => p.userId === userId && p.task?.id === taskId && toDateStr(p.date) === toDateStr(date)))
  }

  // Group by user
  const groupedByUser = useMemo(() => {
    const allUsers = isAdmin
      ? [...users.filter(u => u.id === currentUserId), ...users.filter(u => u.id !== currentUserId)]
      : users.filter(u => u.id === currentUserId)

    return allUsers.map(user => {
      const userEntries = filteredEntries.filter(e => e.userId === user.id)
      const userPlans = filteredPlans.filter(p => p.userId === user.id)
      const taskIds = new Set([...userEntries.map(e => e.task?.id), ...userPlans.map(p => p.task?.id)].filter(Boolean))
      const taskList = Array.from(taskIds).map(tid => {
        const sample = userEntries.find(e => e.task?.id === tid) || userPlans.find(p => p.task?.id === tid)
        return { task: sample?.task, entries: userEntries.filter(e => e.task?.id === tid), plans: userPlans.filter(p => p.task?.id === tid) }
      })
      return { user, tasks: taskList, totalReal: totalMins(userEntries), totalPlanned: totalMins(userPlans) }
    }).filter(u => u.tasks.length > 0)
  }, [filteredEntries, filteredPlans, users, currentUserId, isAdmin])

  // Group by project
  const groupedByProject = useMemo(() => {
    const projIds = new Set([...filteredEntries.map(e => e.task?.project?.id), ...filteredPlans.map(p => p.task?.project?.id)].filter(Boolean))
    return Array.from(projIds).map(pid => {
      const proj = filteredEntries.find(e => e.task?.project?.id === pid)?.task?.project
             || filteredPlans.find(p => p.task?.project?.id === pid)?.task?.project
      const projEntries = filteredEntries.filter(e => e.task?.project?.id === pid)
      const projPlans = filteredPlans.filter(p => p.task?.project?.id === pid)
      const taskIds = new Set([...projEntries.map(e => e.task?.id), ...projPlans.map(p => p.task?.id)].filter(Boolean))
      const taskList = Array.from(taskIds).map(tid => {
        const sample = projEntries.find(e => e.task?.id === tid) || projPlans.find(p => p.task?.id === tid)
        const te = projEntries.filter(e => e.task?.id === tid)
        const tp = projPlans.filter(p => p.task?.id === tid)
        const userIds = new Set([...te.map(e => e.userId), ...tp.map(p => p.userId)])
        const userList = Array.from(userIds).map(uid => {
          const u = users.find(u => u.id === uid) || te.find(e => e.userId === uid)?.user || tp.find(p => p.userId === uid)?.user
          return { user: u, entries: te.filter(e => e.userId === uid), plans: tp.filter(p => p.userId === uid) }
        })
        return { task: sample?.task, users: userList, totalReal: totalMins(te), totalPlanned: totalMins(tp) }
      })
      return { project: proj, tasks: taskList, totalReal: totalMins(projEntries), totalPlanned: totalMins(projPlans) }
    })
  }, [filteredEntries, filteredPlans, users])

  const grandReal = totalMins(filteredEntries)
  const grandPlanned = totalMins(filteredPlans)

  // ─── Helpers vista semanal ────────────────────────────────────────────────
  function dateStrFromDate(d: Date) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  }

  function getWeekEntryFor(taskId: string, day: Date) {
    const ds = dateStrFromDate(day)
    return entries.find(e => e.task?.id === taskId && toDateStr(e.date) === ds && e.userId === currentUserId)
  }

  function getWeekTotalMins(taskId: string, day: Date) {
    const ds = dateStrFromDate(day)
    return totalMins(entries.filter(e => e.task?.id === taskId && toDateStr(e.date) === ds && e.userId === currentUserId))
  }

  const weekGrandTotal = useMemo(() => {
    return totalMins(entries.filter(e => {
      const ds = toDateStr(e.date)
      return e.userId === currentUserId && ds >= dateStrFromDate(weekStart) && ds <= dateStrFromDate(weekEnd)
    }))
  }, [entries, weekStart, weekEnd, currentUserId])

  async function handleDeleteEntry(id: string) {
    if (!confirm('¿Eliminar este registro?')) return
    const res = await fetch(`/api/time-entries/${id}`, { method: 'DELETE' })
    if (res.ok) { setEntries(prev => prev.filter(e => e.id !== id)); toast.success('Registro eliminado') }
    else toast.error('Error al eliminar')
  }

  function handleSavedQuickEntry(entry: any) {
    setEntries(prev => {
      const ds = toDateStr(entry.date)
      const taskId = entry.taskId || entry.task?.id
      // Quitar cualquier entry del mismo día + tarea + usuario
      const filtered = prev.filter(e => {
        const sameDay = toDateStr(e.date) === ds
        const sameTask = (e.taskId || e.task?.id) === taskId
        const sameUser = e.userId === entry.userId
        return !(sameDay && sameTask && sameUser)
      })
      return [...filtered, entry]
    })
    setQuickEntry(null)
  }

  function handleDeletedQuickEntry(id: string) {
    setEntries(prev => prev.filter(e => e.id !== id))
    setQuickEntry(null)
  }

  async function handleDeletePlan(id: string) {
    if (!confirm('¿Eliminar este tiempo programado?')) return
    const res = await fetch(`/api/work-plans/${id}`, { method: 'DELETE' })
    if (res.ok) { setWorkPlans(prev => prev.filter(p => p.id !== id)); toast.success('Programación eliminada') }
    else toast.error('Error al eliminar')
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
        head: [['Colaborador', 'Proyecto', 'Tarea', 'Fecha', 'Real', 'Programado', 'Nota']],
        body: filteredEntries.map(e => [e.user?.name || '', e.task?.project?.name || '', e.task?.name || '', toDateStr(e.date), formatTime(e.hours, e.minutes), '', e.note || '']),
        headStyles: { fillColor: [79, 82, 200], textColor: 255, fontSize: 7, fontStyle: 'bold' },
        bodyStyles: { fontSize: 7, textColor: [40, 45, 80] },
        alternateRowStyles: { fillColor: [242, 243, 252] },
        margin: { left: M, right: M },
      })
      doc.save(`kronoz-tiempos-${monthStr}.pdf`)
      toast.dismiss(tid); toast.success('PDF descargado')
    } catch { toast.dismiss(tid); toast.error('Error') }
  }

  const TimelineHeader = () => (
    <div className="flex border-b border-gray-100 dark:border-neutral-800 sticky top-0 bg-white dark:bg-neutral-900 z-10">
      <div className="flex-shrink-0 border-r border-gray-100 dark:border-neutral-800 px-3 py-1.5" style={{ width: LABEL_W }}>
        <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">
          {format(currentMonth, 'MMMM yyyy', { locale: es }).toUpperCase()}
        </span>
      </div>
      <div className="flex">
        {days.map(day => <DayCell key={day.toISOString()} date={day} />)}
      </div>
    </div>
  )

  return (
    <div className="space-y-4 animate-fade-in">

      {/* Modal de registro rápido */}
      {quickEntry && (
        <QuickEntryModal
          taskId={quickEntry.taskId}
          taskName={quickEntry.taskName}
          projectName={quickEntry.projectName}
          dateStr={quickEntry.dateStr}
          existingEntry={(() => {
            const e = getWeekEntryFor(quickEntry.taskId, new Date(quickEntry.dateStr + 'T12:00:00'))
            return e ? { id: e.id, hours: e.hours, minutes: e.minutes, note: e.note } : undefined
          })()}
          onClose={() => setQuickEntry(null)}
          onSaved={handleSavedQuickEntry}
          onDeleted={handleDeletedQuickEntry}
        />
      )}

      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Tiempos</h1>
          <div className="flex items-center gap-3 mt-1">
            {viewMode === 'weekly'
              ? <p className="text-sm text-gray-500">Esta semana: <span className="font-semibold text-gray-800 dark:text-white">{minsToTime(weekGrandTotal)}</span></p>
              : <>
                  <p className="text-sm text-gray-500">Real: <span className="font-semibold text-gray-800 dark:text-white">{minsToTime(grandReal)}</span></p>
                  {grandPlanned > 0 && <p className="text-sm text-gray-500">Programado: <span className="font-semibold text-emerald-600">{minsToTime(grandPlanned)}</span></p>}
                </>
            }
          </div>
        </div>
        <div className="flex gap-2 items-center">
          {/* Toggle Mis tiempos / Todos — solo admin */}
          {isAdmin && (
            <button
              onClick={() => setShowOnlyMine(v => !v)}
              className={cn(
                'flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all',
                showOnlyMine
                  ? 'bg-brand-50 dark:bg-brand-950/30 border-brand-300 text-brand-700 dark:text-brand-300'
                  : 'bg-white dark:bg-neutral-800 border-gray-200 dark:border-neutral-700 text-gray-600 dark:text-gray-300'
              )}>
              <div className={cn('w-7 h-4 rounded-full transition-colors relative flex-shrink-0',
                showOnlyMine ? 'bg-brand-600' : 'bg-gray-300 dark:bg-neutral-600')}>
                <div className={cn('absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all',
                  showOnlyMine ? 'left-3.5' : 'left-0.5')} />
              </div>
              {showOnlyMine ? 'Mis tiempos' : 'Todos'}
            </button>
          )}
          {/* Toggle vista semanal / mensual */}
          <div className="flex items-center gap-1 bg-gray-100 dark:bg-neutral-800 rounded-lg p-1">
            <button onClick={() => setViewMode('weekly')}
              className={cn('px-2.5 py-1 rounded-md text-xs font-medium transition-all flex items-center gap-1',
                viewMode === 'weekly' ? 'bg-white dark:bg-neutral-700 text-gray-800 dark:text-white shadow-sm' : 'text-gray-500 hover:text-gray-700')}>
              <Calendar className="w-3 h-3" /> Semana
            </button>
            <button onClick={() => setViewMode('monthly')}
              className={cn('px-2.5 py-1 rounded-md text-xs font-medium transition-all flex items-center gap-1',
                viewMode === 'monthly' ? 'bg-white dark:bg-neutral-700 text-gray-800 dark:text-white shadow-sm' : 'text-gray-500 hover:text-gray-700')}>
              <Grid className="w-3 h-3" /> Mes
            </button>
          </div>
          <button onClick={handleExportPDF} className="btn-secondary flex items-center gap-2 text-sm">
            <Download className="w-4 h-4" /> PDF
          </button>
        </div>
      </div>

      {/* ─── VISTA SEMANAL ───────────────────────────────────────────────── */}
      {viewMode === 'weekly' && (
        <div className="space-y-3">
          {/* Navegación de semana */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 bg-gray-100 dark:bg-neutral-800 rounded-lg p-1">
              <button onClick={() => setCurrentWeek(subWeeks(currentWeek, 1))}
                className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-white dark:hover:bg-neutral-700 transition-colors">
                <ChevronLeft className="w-4 h-4 text-gray-500" />
              </button>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300 capitalize min-w-[200px] text-center">
                {format(weekStart, "d MMM", { locale: es })} – {format(weekEnd, "d MMM yyyy", { locale: es })}
              </span>
              <button onClick={() => setCurrentWeek(addWeeks(currentWeek, 1))}
                className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-white dark:hover:bg-neutral-700 transition-colors">
                <ChevronRight className="w-4 h-4 text-gray-500" />
              </button>
            </div>
            <button onClick={() => setCurrentWeek(new Date())}
              className="text-xs text-brand-600 hover:underline">
              Esta semana
            </button>
          </div>

          {/* Tabla semanal */}
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              {/* Header de días */}
              <div className="flex border-b border-gray-100 dark:border-neutral-800 bg-gray-50/50 dark:bg-neutral-800/30">
                <div className="flex-shrink-0 px-4 py-2.5 border-r border-gray-100 dark:border-neutral-800" style={{ width: 240 }}>
                  <span className="text-xs font-semibold text-gray-500">Tarea</span>
                </div>
                {weekDays.map(day => {
                  const isToday = isSameDay(day, new Date())
                  const weekend = isWeekend(day)
                  const letter = format(day, 'EEEEE', { locale: es }).toUpperCase()
                  const num = format(day, 'd')
                  return (
                    <div key={day.toISOString()} className={cn('flex-1 flex flex-col items-center justify-center py-2 text-xs border-r border-gray-100 dark:border-neutral-800 last:border-r-0',
                      isToday ? 'bg-brand-600 text-white' : weekend ? 'text-gray-400' : 'text-gray-500')}>
                      <span className="font-bold text-[10px]">{letter}</span>
                      <span className="font-medium">{num}</span>
                    </div>
                  )
                })}
                <div className="flex-shrink-0 flex items-center justify-center px-3 py-2" style={{ width: 64 }}>
                  <span className="text-[10px] font-semibold text-gray-400">TOTAL</span>
                </div>
              </div>

              {/* Filas de tareas */}
              {myTasks.length === 0 ? (
                <div className="py-12 text-center">
                  <Clock className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-gray-500 text-sm">No tienes tareas asignadas</p>
                </div>
              ) : (
                myTasks.map(task => {
                  const taskWeekMins = weekDays.reduce((sum, day) => sum + getWeekTotalMins(task.id, day), 0)
                  return (
                    <div key={task.id} className="flex border-b border-gray-50 dark:border-neutral-800 last:border-b-0 hover:bg-gray-50/30 dark:hover:bg-neutral-800/10 transition-colors">
                      {/* Nombre de tarea */}
                      <div className="flex-shrink-0 px-4 py-3 border-r border-gray-100 dark:border-neutral-800 flex flex-col justify-center" style={{ width: 240 }}>
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: task.project?.color || '#6366F1' }} />
                          <p className="text-xs font-medium text-gray-800 dark:text-white truncate">{task.name}</p>
                        </div>
                        <p className="text-[10px] text-gray-400 truncate pl-4">{task.project?.name}</p>
                      </div>
                      {/* Celdas por día */}
                      {weekDays.map(day => {
                        const dayMins = getWeekTotalMins(task.id, day)
                        const hasEntry = dayMins > 0
                        const weekend = isWeekend(day)
                        const isToday = isSameDay(day, new Date())
                        const ds = dateStrFromDate(day)
                        return (
                          <div key={day.toISOString()}
                            onClick={() => !weekend && setQuickEntry({ taskId: task.id, taskName: task.name, projectName: task.project?.name || '', dateStr: ds })}
                            className={cn('flex-1 flex items-center justify-center border-r border-gray-100 dark:border-neutral-800 last:border-r-0 min-h-[52px] transition-colors',
                              weekend ? 'bg-gray-50/50 dark:bg-neutral-800/20 cursor-default' :
                              hasEntry ? 'cursor-pointer hover:opacity-80' :
                              'cursor-pointer hover:bg-brand-50/40 dark:hover:bg-brand-950/10 group'
                            )}
                            style={isToday ? { backgroundColor: '#6366F108' } : undefined}>
                            {hasEntry ? (
                              <span className="text-xs font-bold px-1.5 py-0.5 rounded-md"
                                style={{ backgroundColor: `${task.project?.color || '#6366F1'}22`, color: task.project?.color || '#6366F1' }}>
                                {minsToTime(dayMins)}
                              </span>
                            ) : !weekend ? (
                              <span className="text-[10px] text-gray-300 dark:text-neutral-700 group-hover:text-brand-400 transition-colors">+</span>
                            ) : null}
                          </div>
                        )
                      })}
                      {/* Total de la semana */}
                      <div className="flex-shrink-0 flex items-center justify-center px-3" style={{ width: 64 }}>
                        {taskWeekMins > 0
                          ? <span className="text-xs font-bold text-gray-700 dark:text-gray-300">{minsToTime(taskWeekMins)}</span>
                          : <span className="text-[10px] text-gray-300">—</span>
                        }
                      </div>
                    </div>
                  )
                })
              )}

              {/* Fila de totales */}
              {myTasks.length > 0 && (
                <div className="flex border-t border-gray-100 dark:border-neutral-800 bg-gray-50/50 dark:bg-neutral-800/20">
                  <div className="flex-shrink-0 px-4 py-2 border-r border-gray-100 dark:border-neutral-800" style={{ width: 240 }}>
                    <span className="text-xs font-semibold text-gray-500">Total</span>
                  </div>
                  {weekDays.map(day => {
                    const dayTotal = totalMins(entries.filter(e => e.userId === currentUserId && toDateStr(e.date) === dateStrFromDate(day)))
                    return (
                      <div key={day.toISOString()} className="flex-1 flex items-center justify-center border-r border-gray-100 dark:border-neutral-800 last:border-r-0 py-2">
                        {dayTotal > 0
                          ? <span className="text-xs font-bold text-gray-600 dark:text-gray-300">{minsToTime(dayTotal)}</span>
                          : <span className="text-[10px] text-gray-200 dark:text-neutral-700">—</span>
                        }
                      </div>
                    )
                  })}
                  <div className="flex-shrink-0 flex items-center justify-center px-3" style={{ width: 64 }}>
                    {weekGrandTotal > 0
                      ? <span className="text-xs font-bold text-brand-600">{minsToTime(weekGrandTotal)}</span>
                      : <span className="text-[10px] text-gray-300">—</span>
                    }
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── VISTA MENSUAL (Gantt original) ──────────────────────────────── */}
      {viewMode === 'monthly' && (
        <>
          {/* Legend */}
          <div className="flex items-center gap-4 text-xs text-gray-500">
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-3 rounded-sm bg-brand-500 opacity-70" />
              <span>Horas reales</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-3 rounded-sm bg-emerald-400 opacity-30 border border-dashed border-emerald-400" />
              <span>Horas programadas</span>
            </div>
          </div>

          {/* Controls */}
          <div className="flex flex-wrap items-center gap-3">
            {isAdmin && !showOnlyMine && (
              <div className="flex items-center gap-1 bg-gray-100 dark:bg-neutral-800 rounded-lg p-1">
                <button onClick={() => setGroupMode('project')}
                  className={cn('px-2.5 py-1 rounded-md text-xs font-medium transition-all flex items-center gap-1',
                    groupMode === 'project' ? 'bg-white dark:bg-neutral-700 text-gray-800 dark:text-white shadow-sm' : 'text-gray-500 hover:text-gray-700')}>
                  <Folder className="w-3 h-3" /> Por proyecto
                </button>
                <button onClick={() => setGroupMode('user')}
                  className={cn('px-2.5 py-1 rounded-md text-xs font-medium transition-all flex items-center gap-1',
                    groupMode === 'user' ? 'bg-white dark:bg-neutral-700 text-gray-800 dark:text-white shadow-sm' : 'text-gray-500 hover:text-gray-700')}>
                  <Users className="w-3 h-3" /> Por usuario
                </button>
              </div>
            )}

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

            {isAdmin && !showOnlyMine && (
              <select value={userFilter} onChange={e => setUserFilter(e.target.value)} className="input w-44">
                <option value="ALL">Todos los usuarios</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            )}
            <select value={projectFilter} onChange={e => setProjectFilter(e.target.value)} className="input w-48">
              <option value="ALL">Todos los proyectos</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>

          {/* Gantt */}
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <div style={{ minWidth: days.length * DAY_W + LABEL_W }}>
                <TimelineHeader />

                {filteredEntries.length === 0 && filteredPlans.length === 0 ? (
                  <div className="py-16 text-center">
                    <Clock className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500 text-sm">No hay registros para este período</p>
                  </div>

                ) : groupMode === 'user' ? (
                  groupedByUser.map(({ user, tasks: ut, totalReal, totalPlanned }) => (
                    <div key={user.id} className="border-b border-gray-50 dark:border-neutral-800">
                      <div className="flex items-center bg-gray-50/50 dark:bg-neutral-800/20 border-b border-gray-100 dark:border-neutral-800/50">
                        <div className="flex-shrink-0 px-3 py-2 flex items-center justify-between border-r border-gray-100 dark:border-neutral-800" style={{ width: LABEL_W }}>
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-semibold"
                              style={{ backgroundColor: user.color || '#6366F1' }}>
                              {getInitials(user.name)}
                            </div>
                            <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 truncate">{user.name}</span>
                          </div>
                          <div className="flex flex-col items-end ml-1">
                            {totalReal > 0 && <span className="text-[10px] font-bold" style={{ color: user.color || '#6366F1' }}>{minsToTime(totalReal)}</span>}
                            {totalPlanned > 0 && <span className="text-[10px] font-bold text-emerald-500">~{minsToTime(totalPlanned)}</span>}
                          </div>
                        </div>
                        <div className="flex">
                          {days.map(day => {
                            const real = totalMins(filteredEntries.filter(e => e.userId === user.id && toDateStr(e.date) === toDateStr(day)))
                            const planned = totalMins(filteredPlans.filter(p => p.userId === user.id && toDateStr(p.date) === toDateStr(day)))
                            return <SummaryCell key={day.toISOString()} realMins={real} plannedMins={planned} color={user.color || '#6366F1'} date={day} />
                          })}
                        </div>
                      </div>
                      {ut.map(({ task, entries: te, plans: tp }) => (
                        <div key={task?.id} className="flex items-center hover:bg-gray-50/30 dark:hover:bg-neutral-800/10 transition-colors">
                          <div className="flex-shrink-0 px-3 py-2 border-r border-gray-100 dark:border-neutral-800 pl-8" style={{ width: LABEL_W }}>
                            <p className="text-xs text-gray-600 dark:text-gray-400 truncate">{task?.name}</p>
                            <p className="text-[10px] text-gray-400 truncate">{task?.project?.name}</p>
                          </div>
                          <div className="flex">
                            {days.map(day => {
                              const real = totalMins(te.filter((e: any) => toDateStr(e.date) === toDateStr(day)))
                              const planned = totalMins(tp.filter((p: any) => toDateStr(p.date) === toDateStr(day)))
                              return <TimeCell key={day.toISOString()} realMins={real} plannedMins={planned} color={user.color || '#6366F1'} date={day} />
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  ))

                ) : (
                  groupedByProject.map(({ project, tasks: pt, totalReal, totalPlanned }) => (
                    <div key={project?.id} className="border-b border-gray-50 dark:border-neutral-800">
                      <div className="flex items-center border-b border-gray-100 dark:border-neutral-800/50"
                        style={{ backgroundColor: `${project?.color || '#6366F1'}10` }}>
                        <div className="flex-shrink-0 px-3 py-2.5 flex items-center justify-between border-r border-gray-100 dark:border-neutral-800" style={{ width: LABEL_W }}>
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: project?.color || '#6366F1' }} />
                            <span className="text-xs font-bold text-gray-800 dark:text-white truncate">{project?.name}</span>
                          </div>
                          <div className="flex flex-col items-end ml-1">
                            {totalReal > 0 && <span className="text-[10px] font-bold" style={{ color: project?.color || '#6366F1' }}>{minsToTime(totalReal)}</span>}
                            {totalPlanned > 0 && <span className="text-[10px] font-bold text-emerald-500">~{minsToTime(totalPlanned)}</span>}
                          </div>
                        </div>
                        <div className="flex">
                          {days.map(day => {
                            const real = totalMins(filteredEntries.filter(e => e.task?.project?.id === project?.id && toDateStr(e.date) === toDateStr(day)))
                            const planned = totalMins(filteredPlans.filter(p => p.task?.project?.id === project?.id && toDateStr(p.date) === toDateStr(day)))
                            return <SummaryCell key={day.toISOString()} realMins={real} plannedMins={planned} color={project?.color || '#6366F1'} date={day} />
                          })}
                        </div>
                      </div>
                      {pt.map(({ task, users: tu, totalReal: tr, totalPlanned: tp }) => (
                        <div key={task?.id}>
                          <div className="flex items-center bg-gray-50/30 border-b border-gray-50 dark:border-neutral-800/30">
                            <div className="flex-shrink-0 px-3 py-1.5 border-r border-gray-100 dark:border-neutral-800 pl-6 flex items-center justify-between" style={{ width: LABEL_W }}>
                              <p className="text-xs font-medium text-gray-700 dark:text-gray-300 truncate">{task?.name}</p>
                              <div className="flex flex-col items-end ml-1">
                                {tr > 0 && <span className="text-[9px] font-bold" style={{ color: project?.color }}>{minsToTime(tr)}</span>}
                                {tp > 0 && <span className="text-[9px] font-bold text-emerald-500">~{minsToTime(tp)}</span>}
                              </div>
                            </div>
                            <div className="flex">
                              {days.map(day => {
                                const real = totalMins(filteredEntries.filter(e => e.task?.id === task?.id && toDateStr(e.date) === toDateStr(day)))
                                const planned = totalMins(filteredPlans.filter(p => p.task?.id === task?.id && toDateStr(p.date) === toDateStr(day)))
                                return <SummaryCell key={day.toISOString()} realMins={real} plannedMins={planned} color={project?.color || '#6366F1'} date={day} />
                              })}
                            </div>
                          </div>
                          {tu.map(({ user, entries: ue, plans: up }: any) => (
                            <div key={user?.id} className="flex items-center hover:bg-gray-50/20 transition-colors">
                              <div className="flex-shrink-0 px-3 py-1.5 border-r border-gray-100 dark:border-neutral-800 pl-10" style={{ width: LABEL_W }}>
                                <div className="flex items-center gap-1.5">
                                  <div className="w-4 h-4 rounded-full flex items-center justify-center text-white"
                                    style={{ backgroundColor: user?.color || '#6366F1', fontSize: 7 }}>
                                    {getInitials(user?.name || '').charAt(0)}
                                  </div>
                                  <span className="text-[10px] text-gray-500 truncate">{user?.name?.split(' ')[0]}</span>
                                </div>
                              </div>
                              <div className="flex">
                                {days.map(day => {
                                  const real = totalMins(ue.filter((e: any) => toDateStr(e.date) === toDateStr(day)))
                                  const planned = totalMins(up.filter((p: any) => toDateStr(p.date) === toDateStr(day)))
                                  return <TimeCell key={day.toISOString()} realMins={real} plannedMins={planned} color={user?.color || '#6366F1'} date={day} />
                                })}
                              </div>
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Detail table */}
          {(filteredEntries.length > 0 || filteredPlans.length > 0) && (
            <div className="card overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-100 dark:border-neutral-800">
                <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Detalle de registros</h2>
              </div>
              <div className="divide-y divide-gray-50 dark:divide-neutral-800">
                {filteredEntries.sort((a,b) => toDateStr(b.date).localeCompare(toDateStr(a.date))).map(entry => (
                  <div key={entry.id} className="flex items-center gap-3 px-5 py-2.5 hover:bg-gray-50/50 dark:hover:bg-neutral-800/20 group">
                    <div className="w-5 h-5 rounded-full flex items-center justify-center text-white flex-shrink-0"
                      style={{ backgroundColor: entry.user?.color || '#6366F1', fontSize: 9 }}>
                      {getInitials(entry.user?.name || '')}
                    </div>
                    <div className="w-20 flex-shrink-0"><span className="text-xs text-gray-500">{toDateStr(entry.date)}</span></div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-700 dark:text-gray-300 truncate">{entry.task?.name}</p>
                      {entry.note && <p className="text-[10px] text-gray-400 truncate">{entry.note}</p>}
                    </div>
                    <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 w-14 text-right flex-shrink-0">
                      {formatTime(entry.hours, entry.minutes)}
                    </span>
                    {(entry.userId === currentUserId || isAdmin) && (
                      <button onClick={() => handleDeleteEntry(entry.id)}
                        className="opacity-0 group-hover:opacity-100 w-6 h-6 flex items-center justify-center rounded text-gray-400 hover:text-red-500 transition-all">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
                {isAdmin && filteredPlans.map(plan => (
                  <div key={plan.id} className="flex items-center gap-3 px-5 py-2.5 hover:bg-emerald-50/30 dark:hover:bg-emerald-950/10 group">
                    <div className="w-5 h-5 rounded-full flex items-center justify-center text-white flex-shrink-0 border-2 border-dashed border-emerald-400"
                      style={{ backgroundColor: plan.user?.color || '#6366F1', fontSize: 9 }}>
                      {getInitials(plan.user?.name || '')}
                    </div>
                    <div className="w-20 flex-shrink-0"><span className="text-xs text-gray-400">{toDateStr(plan.date)}</span></div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-500 truncate">{plan.task?.name} <span className="text-emerald-500 text-[10px]">(programado)</span></p>
                      {plan.note && <p className="text-[10px] text-gray-400 truncate">{plan.note}</p>}
                    </div>
                    <span className="text-xs font-semibold text-emerald-600 w-14 text-right flex-shrink-0">
                      ~{formatTime(plan.hours, plan.minutes)}
                    </span>
                    <button onClick={() => handleDeletePlan(plan.id)}
                      className="opacity-0 group-hover:opacity-100 w-6 h-6 flex items-center justify-center rounded text-gray-400 hover:text-red-500 transition-all">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
