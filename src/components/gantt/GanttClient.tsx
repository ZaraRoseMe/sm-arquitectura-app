'use client'
// src/components/gantt/GanttClient.tsx
import { useState, useRef, useMemo } from 'react'
import { Download, ZoomIn, ZoomOut, Filter, AlertTriangle } from 'lucide-react'
import { addDays, startOfMonth, endOfMonth, eachDayOfInterval, format, isWeekend, isSameDay, differenceInDays, addMonths, subMonths, startOfWeek, endOfWeek, isWithinInterval } from 'date-fns'
import { es } from 'date-fns/locale'
import { cn, getStatusColor, getStatusLabel, generateAvatarColor, getInitials, detectConflicts } from '@/lib/utils'
import toast from 'react-hot-toast'
import type { Task } from '@/types'

interface GanttClientProps {
  tasks: Task[]
  users: { id: string; name: string }[]
  projects: { id: string; name: string; color: string }[]
  isAdmin: boolean
}

const STATUS_COLORS: Record<string, string> = {
  PENDIENTE: '#9CA3AF',
  EN_PROGRESO: '#3B82F6',
  PAUSADO: '#F59E0B',
  TERMINADO: '#10B981',
}

const DAY_WIDTH_OPTIONS = [20, 28, 40]

export default function GanttClient({ tasks: initialTasks, users, projects, isAdmin }: GanttClientProps) {
  const [tasks, setTasks] = useState(initialTasks)
  const [currentDate, setCurrentDate] = useState(new Date())
  const [dayWidth, setDayWidth] = useState(1) // index into DAY_WIDTH_OPTIONS
  const [userFilter, setUserFilter] = useState('ALL')
  const [projectFilter, setProjectFilter] = useState('ALL')
  const [dragging, setDragging] = useState<string | null>(null)
  const ganttRef = useRef<HTMLDivElement>(null)

  const cellWidth = DAY_WIDTH_OPTIONS[dayWidth]

  // Date range: show 3 months
  const rangeStart = startOfMonth(subMonths(currentDate, 1))
  const rangeEnd = endOfMonth(addMonths(currentDate, 1))
  const days = eachDayOfInterval({ start: rangeStart, end: rangeEnd })

  // Group days by month and week
  const months = useMemo(() => {
    const result: { label: string; days: Date[] }[] = []
    let currentMonth = ''
    let currentDays: Date[] = []

    days.forEach((day) => {
      const monthLabel = format(day, 'MMMM yyyy', { locale: es })
      if (monthLabel !== currentMonth) {
        if (currentDays.length > 0) result.push({ label: currentMonth, days: currentDays })
        currentMonth = monthLabel
        currentDays = []
      }
      currentDays.push(day)
    })
    if (currentDays.length > 0) result.push({ label: currentMonth, days: currentDays })
    return result
  }, [days])

  // Filter tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      if (userFilter !== 'ALL' && t.userId !== userFilter) return false
      if (projectFilter !== 'ALL' && t.projectId !== projectFilter) return false
      return true
    })
  }, [tasks, userFilter, projectFilter])

  // Group by user
  const groupedByUser = useMemo(() => {
    const groups: Record<string, { user: { id: string; name: string }; tasks: Task[] }> = {}
    users.forEach((u) => {
      groups[u.id] = { user: u, tasks: [] }
    })
    filteredTasks.forEach((t) => {
      if (t.userId && groups[t.userId]) {
        groups[t.userId].tasks.push(t)
      }
    })
    return Object.values(groups).filter((g) => g.tasks.length > 0)
  }, [filteredTasks, users])

  // Detect conflicts
  const conflictTaskIds = useMemo(() => {
    const ids = new Set<string>()
    users.forEach((user) => {
      const userTasks = tasks.filter((t) => t.userId === user.id && t.status !== 'TERMINADO')
      userTasks.forEach((task, i) => {
        const others = userTasks.filter((_, j) => j !== i)
        const conflicts = detectConflicts(
          { startDate: new Date(task.startDate), endDate: new Date(task.endDate), userId: user.id },
          others.map((t) => ({ startDate: new Date(t.startDate), endDate: new Date(t.endDate), userId: t.userId, id: t.id }))
        )
        if (conflicts.length > 0) {
          ids.add(task.id)
          conflicts.forEach((c) => ids.add(c.id || ''))
        }
      })
    })
    return ids
  }, [tasks, users])

  function getTaskPosition(task: Task) {
    const taskStart = new Date(task.startDate)
    const taskEnd = new Date(task.endDate)
    const startOffset = differenceInDays(taskStart, rangeStart)
    const duration = differenceInDays(taskEnd, taskStart) + 1
    return {
      left: Math.max(0, startOffset * cellWidth),
      width: Math.max(cellWidth, duration * cellWidth),
    }
  }

  function isToday(day: Date) {
    return isSameDay(day, new Date())
  }

  async function handleExportPDF() {
    toast.loading('Generando PDF...')
    // Import jsPDF dynamically
    const { default: jsPDF } = await import('jspdf')
    const { default: autoTable } = await import('jspdf-autotable')

    const doc = new jsPDF({ orientation: 'landscape', format: 'a4' })

    // Header
    doc.setFillColor(31, 41, 55)
    doc.rect(0, 0, 297, 20, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text('SM Arquitectura — Diagrama de Gantt', 14, 13)
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.text(format(new Date(), 'dd MMMM yyyy', { locale: es }), 265, 13)

    // Table
    const tableData = filteredTasks.map((t) => [
      t.name,
      (t as any).project?.name || '',
      (t as any).user?.name || '',
      format(new Date(t.startDate), 'dd/MM/yyyy'),
      format(new Date(t.endDate), 'dd/MM/yyyy'),
      getStatusLabel(t.status),
      `${t.progress}%`,
    ])

    autoTable(doc, {
      startY: 26,
      head: [['Tarea', 'Proyecto', 'Responsable', 'Inicio', 'Fin', 'Estado', 'Avance']],
      body: tableData,
      headStyles: { fillColor: [79, 82, 229], textColor: 255, fontSize: 9, fontStyle: 'bold' },
      bodyStyles: { fontSize: 8, textColor: [31, 41, 55] },
      alternateRowStyles: { fillColor: [248, 249, 250] },
      columnStyles: {
        0: { cellWidth: 60 },
        1: { cellWidth: 55 },
        2: { cellWidth: 45 },
        3: { cellWidth: 25 },
        4: { cellWidth: 25 },
        5: { cellWidth: 30 },
        6: { cellWidth: 20 },
      },
      margin: { left: 14, right: 14 },
    })

    doc.save('sm-arquitectura-gantt.pdf')
    toast.dismiss()
    toast.success('PDF descargado')
  }

  const todayOffset = differenceInDays(new Date(), rangeStart) * cellWidth

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Diagrama Gantt</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{filteredTasks.length} tareas visualizadas</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Zoom controls */}
          <div className="flex items-center gap-1 bg-gray-100 dark:bg-neutral-800 rounded-lg p-1">
            <button
              onClick={() => setDayWidth(Math.max(0, dayWidth - 1))}
              className="w-7 h-7 flex items-center justify-center rounded text-gray-600 dark:text-gray-400 hover:bg-white dark:hover:bg-neutral-700 transition-colors"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="text-xs text-gray-500 px-1">{cellWidth}px</span>
            <button
              onClick={() => setDayWidth(Math.min(2, dayWidth + 1))}
              className="w-7 h-7 flex items-center justify-center rounded text-gray-600 dark:text-gray-400 hover:bg-white dark:hover:bg-neutral-700 transition-colors"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>

          <button onClick={handleExportPDF} className="btn-secondary flex items-center gap-2">
            <Download className="w-4 h-4" />
            Exportar PDF
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        {isAdmin && (
          <select value={userFilter} onChange={(e) => setUserFilter(e.target.value)} className="input w-44">
            <option value="ALL">Todos los usuarios</option>
            {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
        )}
        <select value={projectFilter} onChange={(e) => setProjectFilter(e.target.value)} className="input w-52">
          <option value="ALL">Todos los proyectos</option>
          {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>

        {conflictTaskIds.size > 0 && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-lg">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            <span className="text-sm text-amber-700 dark:text-amber-400 font-medium">
              {conflictTaskIds.size} tareas con conflicto de horario
            </span>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4">
        {Object.entries(STATUS_COLORS).map(([status, color]) => (
          <div key={status} className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: color }} />
            <span className="text-xs text-gray-500 dark:text-gray-400">{getStatusLabel(status)}</span>
          </div>
        ))}
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-amber-300 border-2 border-amber-500" />
          <span className="text-xs text-gray-500 dark:text-gray-400">Conflicto</span>
        </div>
      </div>

      {/* Gantt chart */}
      <div className="card overflow-hidden">
        <div ref={ganttRef} className="gantt-container">
          <div style={{ minWidth: days.length * cellWidth + 200 }}>
            {/* Timeline header */}
            <div className="flex border-b border-gray-100 dark:border-neutral-800 sticky top-0 bg-white dark:bg-neutral-900 z-10">
              {/* Row label column */}
              <div className="w-48 flex-shrink-0 border-r border-gray-100 dark:border-neutral-800" />

              {/* Months */}
              <div className="flex-1 relative">
                {/* Month labels */}
                <div className="flex border-b border-gray-100 dark:border-neutral-800">
                  {months.map((m) => (
                    <div
                      key={m.label}
                      className="text-xs font-semibold text-gray-700 dark:text-gray-300 px-3 py-2 border-r border-gray-100 dark:border-neutral-800 capitalize"
                      style={{ width: m.days.length * cellWidth }}
                    >
                      {m.label}
                    </div>
                  ))}
                </div>

                {/* Day labels */}
                <div className="flex">
                  {days.map((day) => (
                    <div
                      key={day.toISOString()}
                      className={cn(
                        'flex-shrink-0 text-center py-1 text-xs border-r border-gray-50 dark:border-neutral-800/50',
                        isToday(day)
                          ? 'bg-brand-500 text-white font-semibold'
                          : isWeekend(day)
                          ? 'text-gray-400 bg-gray-50 dark:bg-neutral-800/30'
                          : 'text-gray-400 dark:text-gray-600'
                      )}
                      style={{ width: cellWidth }}
                    >
                      {cellWidth >= 28 ? format(day, 'd') : ''}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Rows */}
            {groupedByUser.map(({ user, tasks: userTasks }) => {
              const avatarColor = generateAvatarColor(user.name)
              return (
                <div key={user.id} className="border-b border-gray-50 dark:border-neutral-800">
                  {/* User header row */}
                  <div className="flex items-center bg-gray-50/50 dark:bg-neutral-800/20 border-b border-gray-100 dark:border-neutral-800/50">
                    <div className="w-48 flex-shrink-0 px-3 py-2 flex items-center gap-2 border-r border-gray-100 dark:border-neutral-800">
                      <div
                        className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-semibold flex-shrink-0"
                        style={{ backgroundColor: avatarColor }}
                      >
                        {getInitials(user.name)}
                      </div>
                      <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 truncate">{user.name}</span>
                    </div>
                    <div className="flex-1 h-8 relative">
                      {/* Today line */}
                      <div
                        className="absolute top-0 bottom-0 w-px bg-brand-400 opacity-40 z-10"
                        style={{ left: todayOffset }}
                      />
                      {/* Weekend shading */}
                      {days.map((day, i) =>
                        isWeekend(day) ? (
                          <div
                            key={day.toISOString()}
                            className="absolute top-0 bottom-0 bg-gray-100 dark:bg-neutral-800/40"
                            style={{ left: i * cellWidth, width: cellWidth }}
                          />
                        ) : null
                      )}
                    </div>
                  </div>

                  {/* Task rows */}
                  {userTasks.map((task) => {
                    const { left, width } = getTaskPosition(task)
                    const hasConflict = conflictTaskIds.has(task.id)
                    const project = projects.find((p) => p.id === task.projectId)

                    return (
                      <div key={task.id} className="flex items-center hover:bg-gray-50/50 dark:hover:bg-neutral-800/10 transition-colors">
                        {/* Task label */}
                        <div className="w-48 flex-shrink-0 px-3 py-2 border-r border-gray-100 dark:border-neutral-800">
                          <div className="flex items-center gap-1.5">
                            {hasConflict && <AlertTriangle className="w-3 h-3 text-amber-500 flex-shrink-0" />}
                            <p className="text-xs text-gray-700 dark:text-gray-300 truncate" title={task.name}>
                              {task.name}
                            </p>
                          </div>
                          {project && (
                            <div className="flex items-center gap-1 mt-0.5">
                              <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: project.color }} />
                              <p className="text-xs text-gray-400 truncate">{project.name}</p>
                            </div>
                          )}
                        </div>

                        {/* Gantt bar area */}
                        <div className="flex-1 h-10 relative" style={{ minWidth: days.length * cellWidth }}>
                          {/* Weekend shading */}
                          {days.map((day, i) =>
                            isWeekend(day) ? (
                              <div
                                key={day.toISOString()}
                                className="absolute top-0 bottom-0 bg-gray-50 dark:bg-neutral-800/20"
                                style={{ left: i * cellWidth, width: cellWidth }}
                              />
                            ) : null
                          )}

                          {/* Today line */}
                          <div
                            className="absolute top-0 bottom-0 w-px bg-brand-400 z-10"
                            style={{ left: todayOffset }}
                          />

                          {/* Task bar */}
                          <div
                            className={cn(
                              'absolute top-1/2 -translate-y-1/2 rounded-md flex items-center px-2 overflow-hidden',
                              hasConflict && 'ring-2 ring-amber-400 ring-offset-0 gantt-bar conflict'
                            )}
                            style={{
                              left: Math.max(0, left),
                              width: Math.max(cellWidth * 1.5, width),
                              height: 26,
                              backgroundColor: hasConflict ? '#F59E0B' : STATUS_COLORS[task.status],
                              opacity: task.status === 'TERMINADO' ? 0.7 : 1,
                            }}
                            title={`${task.name} (${getStatusLabel(task.status)}) — ${task.progress}%`}
                          >
                            {/* Progress fill */}
                            <div
                              className="absolute top-0 left-0 h-full rounded-md opacity-30 bg-white"
                              style={{ width: `${task.progress}%` }}
                            />
                            {cellWidth >= 28 && (
                              <span className="relative text-white text-xs font-medium truncate z-10">
                                {task.name}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )
            })}

            {groupedByUser.length === 0 && (
              <div className="py-16 text-center">
                <p className="text-gray-500 dark:text-gray-400 text-sm">No hay tareas para mostrar</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-center gap-4">
        <button onClick={() => setCurrentDate(subMonths(currentDate, 1))} className="btn-secondary">
          ← Mes anterior
        </button>
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300 capitalize">
          {format(currentDate, 'MMMM yyyy', { locale: es })}
        </span>
        <button onClick={() => setCurrentDate(addMonths(currentDate, 1))} className="btn-secondary">
          Mes siguiente →
        </button>
      </div>
    </div>
  )
}
