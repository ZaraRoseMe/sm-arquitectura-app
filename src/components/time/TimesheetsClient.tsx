'use client'
// src/components/time/TimesheetsClient.tsx
import { useState, useMemo } from 'react'
import { Clock, Download, Trash2, ChevronLeft, ChevronRight, Users, Folder, CalendarCheck } from 'lucide-react'
import { eachDayOfInterval, format, isWeekend, isSameDay, addMonths, subMonths, startOfMonth, endOfMonth } from 'date-fns'
import { es } from 'date-fns/locale'
import { cn, getInitials } from '@/lib/utils'
import toast from 'react-hot-toast'
import WorkPlanModal from './WorkPlanModal'

interface TimesheetsClientProps {
  entries: any[]
  workPlans: any[]
  projects: any[]
  users: any[]
  tasks: any[]
  isAdmin: boolean
  currentUserId: string
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

type GroupMode = 'user' | 'project'

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

export default function TimesheetsClient({ entries: initialEntries, workPlans: initialPlans, projects, users, tasks, isAdmin, currentUserId, currentUserColor }: TimesheetsClientProps) {
  const [entries, setEntries] = useState(initialEntries)
  const [workPlans, setWorkPlans] = useState(initialPlans)
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [projectFilter, setProjectFilter] = useState('ALL')
  const [userFilter, setUserFilter] = useState('ALL')
  const [groupMode, setGroupMode] = useState<GroupMode>('project')
  const [showWorkPlanModal, setShowWorkPlanModal] = useState(false)

  const rangeStart = startOfMonth(currentMonth)
  const rangeEnd = endOfMonth(currentMonth)
  const days = eachDayOfInterval({ start: rangeStart, end: rangeEnd })
  const monthStr = format(currentMonth, 'yyyy-MM')

  const filteredEntries = useMemo(() => entries.filter(e => {
    if (!toDateStr(e.date).startsWith(monthStr)) return false
    if (projectFilter !== 'ALL' && e.task?.project?.id !== projectFilter) return false
    if (userFilter !== 'ALL' && e.userId !== userFilter) return false
    return true
  }), [entries, monthStr, projectFilter, userFilter])

  const filteredPlans = useMemo(() => workPlans.filter(p => {
    if (!toDateStr(p.date).startsWith(monthStr)) return false
    if (projectFilter !== 'ALL' && p.task?.project?.id !== projectFilter) return false
    if (userFilter !== 'ALL' && p.userId !== userFilter) return false
    return true
  }), [workPlans, monthStr, projectFilter, userFilter])

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

  async function handleDeleteEntry(id: string) {
    if (!confirm('¿Eliminar este registro?')) return
    const res = await fetch(`/api/time-entries/${id}`, { method: 'DELETE' })
    if (res.ok) { setEntries(prev => prev.filter(e => e.id !== id)); toast.success('Registro eliminado') }
    else toast.error('Error al eliminar')
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
      {showWorkPlanModal && (
        <WorkPlanModal
          tasks={tasks}
          users={users}
          onClose={() => setShowWorkPlanModal(false)}
          onSaved={(newPlans) => { setWorkPlans(prev => [...prev, ...newPlans]); setShowWorkPlanModal(false) }}
        />
      )}

      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Tiempos</h1>
          <div className="flex items-center gap-3 mt-1">
            <p className="text-sm text-gray-500">Real: <span className="font-semibold text-gray-800 dark:text-white">{minsToTime(grandReal)}</span></p>
            {grandPlanned > 0 && (
              <p className="text-sm text-gray-500">Programado: <span className="font-semibold text-emerald-600">{minsToTime(grandPlanned)}</span></p>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          {isAdmin && (
            <button onClick={() => setShowWorkPlanModal(true)}
              className="btn-primary flex items-center gap-2 text-sm bg-emerald-600 hover:bg-emerald-700">
              <CalendarCheck className="w-4 h-4" /> Programar tiempo
            </button>
          )}
          <button onClick={handleExportPDF} className="btn-secondary flex items-center gap-2 text-sm">
            <Download className="w-4 h-4" /> PDF
          </button>
        </div>
      </div>

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
        {isAdmin && (
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

        {isAdmin && (
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
    </div>
  )
}
