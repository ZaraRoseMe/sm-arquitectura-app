'use client'
// src/components/gantt/GanttClient.tsx
import { useState, useRef, useMemo } from 'react'
import { Download, ZoomIn, ZoomOut, AlertTriangle, Users, Folder } from 'lucide-react'
import { addDays, startOfMonth, endOfMonth, eachDayOfInterval, format, isWeekend, isSameDay, differenceInDays, addMonths, subMonths } from 'date-fns'
import { es } from 'date-fns/locale'
import { cn, getStatusColor, getStatusLabel, getInitials, detectConflicts } from '@/lib/utils'
import toast from 'react-hot-toast'
import type { Task } from '@/types'

interface GanttClientProps {
  tasks: Task[]
  users: { id: string; name: string; color?: string }[]
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

type ColorMode = 'status' | 'user' | 'project'

export default function GanttClient({ tasks: initialTasks, users, projects, isAdmin }: GanttClientProps) {
  const [tasks, setTasks] = useState(initialTasks)
  const [currentDate, setCurrentDate] = useState(new Date())
  const [dayWidth, setDayWidth] = useState(1)
  const [userFilter, setUserFilter] = useState('ALL')
  const [projectFilter, setProjectFilter] = useState('ALL')
  const [colorMode, setColorMode] = useState<ColorMode>('status')
  const ganttRef = useRef<HTMLDivElement>(null)

  const cellWidth = DAY_WIDTH_OPTIONS[dayWidth]

  const rangeStart = startOfMonth(subMonths(currentDate, 1))
  const rangeEnd = endOfMonth(addMonths(currentDate, 1))
  const days = eachDayOfInterval({ start: rangeStart, end: rangeEnd })

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

  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      if (userFilter !== 'ALL' && t.userId !== userFilter) return false
      if (projectFilter !== 'ALL' && t.projectId !== projectFilter) return false
      return true
    })
  }, [tasks, userFilter, projectFilter])

  const groupedByUser = useMemo(() => {
    const groups: Record<string, { user: { id: string; name: string; color?: string }; tasks: Task[] }> = {}
    users.forEach((u) => { groups[u.id] = { user: u, tasks: [] } })
    filteredTasks.forEach((t) => {
      if (t.userId && groups[t.userId]) groups[t.userId].tasks.push(t)
    })
    return Object.values(groups).filter((g) => g.tasks.length > 0)
  }, [filteredTasks, users])

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

  function getTaskColor(task: Task, hasConflict: boolean): string {
    if (hasConflict) return '#F59E0B'
    if (colorMode === 'user') {
      const user = users.find((u) => u.id === task.userId)
      return user?.color || '#6366F1'
    }
    if (colorMode === 'project') {
      const project = projects.find((p) => p.id === task.projectId)
      return project?.color || '#3B82F6'
    }
    return STATUS_COLORS[task.status] || '#9CA3AF'
  }

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

  function isToday(day: Date) { return isSameDay(day, new Date()) }

  const todayOffset = differenceInDays(new Date(), rangeStart) * cellWidth

  async function handleExportPDF() {
    const toastId = toast.loading('Generando PDF...')
    try {
      const { default: jsPDF } = await import('jspdf')
      const { default: autoTable } = await import('jspdf-autotable')

      const doc = new jsPDF({ orientation: 'landscape', format: 'a4' })
      const pageW = 297
      const pageH = 210
      const margin = 14

      // ── Header ──
      doc.setFillColor(31, 41, 55)
      doc.rect(0, 0, pageW, 20, 'F')
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(13)
      doc.setFont('helvetica', 'bold')
      doc.text('SM Arquitectura — Diagrama de Gantt', margin, 13)
      doc.setFontSize(9)
      doc.setFont('helvetica', 'normal')
      doc.text(format(new Date(), 'dd MMMM yyyy', { locale: es }), pageW - margin - 40, 13)

      // ── Gantt gráfico ──
      const ganttTop = 26
      const labelColW = 52
      const rowH = 10
      const ganttLeft = margin + labelColW
      const ganttRight = pageW - margin

      // Limitar días al mes actual ± 1 para que quepan
      const pdfDays = days
      const totalDaysW = ganttRight - ganttLeft
      const pdfCellW = totalDaysW / pdfDays.length

      // Fondo cabecera días
      doc.setFillColor(248, 249, 250)
      doc.rect(ganttLeft, ganttTop, totalDaysW, rowH, 'F')

      // Mes labels
      let mxOffset = ganttLeft
      months.forEach((m) => {
        const mw = m.days.length * pdfCellW
        doc.setFillColor(79, 82, 229)
        doc.rect(mxOffset, ganttTop, mw - 0.3, rowH * 0.6, 'F')
        doc.setTextColor(255, 255, 255)
        doc.setFontSize(5.5)
        doc.setFont('helvetica', 'bold')
        doc.text(m.label.substring(0, 12), mxOffset + 2, ganttTop + 4)
        mxOffset += mw
      })

      // Day numbers
      pdfDays.forEach((day, i) => {
        const x = ganttLeft + i * pdfCellW
        const weekend = isWeekend(day)
        const today = isSameDay(day, new Date())
        if (weekend) {
          doc.setFillColor(240, 240, 245)
          doc.rect(x, ganttTop + rowH * 0.6, pdfCellW, rowH * 0.4, 'F')
        }
        if (today) {
          doc.setFillColor(99, 102, 241)
          doc.rect(x, ganttTop + rowH * 0.6, pdfCellW, rowH * 0.4, 'F')
        }
        if (pdfCellW >= 4) {
          doc.setTextColor(today ? 255 : weekend ? 160 : 100, today ? 255 : weekend ? 160 : 100, today ? 255 : weekend ? 160 : 100)
          doc.setFontSize(4)
          doc.setFont('helvetica', 'normal')
          doc.text(format(day, 'd'), x + pdfCellW / 2 - 1, ganttTop + rowH - 1)
        }
      })

      // Label column header
      doc.setFillColor(31, 41, 55)
      doc.rect(margin, ganttTop, labelColW, rowH, 'F')
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(6)
      doc.setFont('helvetica', 'bold')
      doc.text('Tarea / Usuario', margin + 2, ganttTop + 6.5)

      // Rows
      let rowY = ganttTop + rowH

      groupedByUser.forEach(({ user, tasks: userTasks }) => {
        // User header row
        const userColor = user.color || '#6366F1'
        const rgb = hexToRgb(userColor)
        doc.setFillColor(rgb.r, rgb.g, rgb.b)
        doc.setGlobalAlpha(0.15)
        doc.rect(margin, rowY, pageW - margin * 2, rowH * 0.9, 'F')
        doc.setGlobalAlpha(1)

        // Avatar circle
        doc.setFillColor(rgb.r, rgb.g, rgb.b)
        doc.circle(margin + 3.5, rowY + rowH * 0.45, 3, 'F')
        doc.setTextColor(255, 255, 255)
        doc.setFontSize(4)
        doc.setFont('helvetica', 'bold')
        doc.text(getInitials(user.name), margin + 2, rowY + rowH * 0.55)

        doc.setTextColor(31, 41, 55)
        doc.setFontSize(6)
        doc.setFont('helvetica', 'bold')
        doc.text(user.name, margin + 8, rowY + 6)

        // Today line on user row
        doc.setDrawColor(99, 102, 241)
        doc.setLineWidth(0.3)
        doc.line(ganttLeft + todayOffset * pdfCellW / cellWidth, rowY, ganttLeft + todayOffset * pdfCellW / cellWidth, rowY + rowH)

        rowY += rowH * 0.9

        // Task rows
        userTasks.forEach((task) => {
          const hasConflict = conflictTaskIds.has(task.id)
          const barColor = getTaskColor(task, hasConflict)
          const barRgb = hexToRgb(barColor)

          // Label
          doc.setTextColor(60, 60, 60)
          doc.setFontSize(5.5)
          doc.setFont('helvetica', 'normal')
          const taskLabel = task.name.length > 18 ? task.name.substring(0, 17) + '…' : task.name
          doc.text(taskLabel, margin + 2, rowY + rowH * 0.65)

          // Gantt bar
          const taskStartOff = differenceInDays(new Date(task.startDate), rangeStart)
          const taskDur = differenceInDays(new Date(task.endDate), new Date(task.startDate)) + 1
          const barX = ganttLeft + taskStartOff * pdfCellW
          const barW = Math.max(pdfCellW, taskDur * pdfCellW)
          const barH = rowH * 0.55
          const barTop = rowY + (rowH - barH) / 2

          // Conflict ring
          if (hasConflict) {
            doc.setDrawColor(245, 158, 11)
            doc.setLineWidth(0.5)
            doc.roundedRect(barX - 0.5, barTop - 0.5, barW + 1, barH + 1, 1, 1, 'S')
          }

          // Bar fill
          doc.setFillColor(barRgb.r, barRgb.g, barRgb.b)
          doc.roundedRect(barX, barTop, barW, barH, 1, 1, 'F')

          // Progress overlay
          if (task.progress > 0) {
            doc.setFillColor(255, 255, 255)
            doc.setGlobalAlpha(0.25)
            doc.roundedRect(barX, barTop, barW * (task.progress / 100), barH, 1, 1, 'F')
            doc.setGlobalAlpha(1)
          }

          // Task name on bar
          if (barW > 10) {
            doc.setTextColor(255, 255, 255)
            doc.setFontSize(4.5)
            doc.setFont('helvetica', 'bold')
            const barLabel = task.name.length > Math.floor(barW / 2.5) ? task.name.substring(0, Math.floor(barW / 2.5)) + '…' : task.name
            doc.text(barLabel, barX + 2, barTop + barH * 0.68)
          }

          // Today line
          doc.setDrawColor(99, 102, 241)
          doc.setLineWidth(0.3)
          const todayX = ganttLeft + differenceInDays(new Date(), rangeStart) * pdfCellW
          doc.line(todayX, rowY, todayX, rowY + rowH)

          rowY += rowH

          // Page break check
          if (rowY > pageH - 30) {
            doc.addPage('a4', 'landscape')
            rowY = 20
          }
        })

        rowY += 2 // spacing between users
      })

      // ── Legend ──
      rowY += 4
      if (rowY < pageH - 20) {
        doc.setFontSize(6)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(80, 80, 80)
        doc.text('Leyenda:', margin, rowY)
        let lx = margin + 16

        if (colorMode === 'status') {
          Object.entries(STATUS_COLORS).forEach(([status, color]) => {
            const rgb = hexToRgb(color)
            doc.setFillColor(rgb.r, rgb.g, rgb.b)
            doc.roundedRect(lx, rowY - 3.5, 4, 4, 0.5, 0.5, 'F')
            doc.setTextColor(80, 80, 80)
            doc.setFont('helvetica', 'normal')
            doc.text(getStatusLabel(status), lx + 5.5, rowY)
            lx += 32
          })
        } else if (colorMode === 'user') {
          users.forEach((u) => {
            const rgb = hexToRgb(u.color || '#6366F1')
            doc.setFillColor(rgb.r, rgb.g, rgb.b)
            doc.circle(lx + 2, rowY - 1.5, 2, 'F')
            doc.setTextColor(80, 80, 80)
            doc.setFont('helvetica', 'normal')
            doc.text(u.name, lx + 5.5, rowY)
            lx += u.name.length * 2.2 + 10
          })
        } else {
          projects.forEach((p) => {
            const rgb = hexToRgb(p.color)
            doc.setFillColor(rgb.r, rgb.g, rgb.b)
            doc.roundedRect(lx, rowY - 3.5, 4, 4, 0.5, 0.5, 'F')
            doc.setTextColor(80, 80, 80)
            doc.setFont('helvetica', 'normal')
            doc.text(p.name, lx + 5.5, rowY)
            lx += p.name.length * 2.2 + 10
          })
        }
      }

      // ── Table (new page) ──
      doc.addPage('a4', 'landscape')

      doc.setFillColor(31, 41, 55)
      doc.rect(0, 0, pageW, 20, 'F')
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(12)
      doc.setFont('helvetica', 'bold')
      doc.text('SM Arquitectura — Detalle de Tareas', margin, 13)

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
        margin: { left: margin, right: margin },
      })

      doc.save('sm-arquitectura-gantt.pdf')
      toast.dismiss(toastId)
      toast.success('PDF descargado')
    } catch (err) {
      toast.dismiss(toastId)
      toast.error('Error al generar PDF')
    }
  }

  // Helper: hex to rgb
  function hexToRgb(hex: string) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    return result
      ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) }
      : { r: 99, g: 102, b: 241 }
  }

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Diagrama Gantt</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{filteredTasks.length} tareas visualizadas</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Color mode toggle */}
          <div className="flex items-center gap-1 bg-gray-100 dark:bg-neutral-800 rounded-lg p-1">
            <button
              onClick={() => setColorMode('status')}
              className={cn(
                'px-2.5 py-1 rounded-md text-xs font-medium transition-all',
                colorMode === 'status'
                  ? 'bg-white dark:bg-neutral-700 text-gray-800 dark:text-white shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'
              )}
            >
              Estado
            </button>
            <button
              onClick={() => setColorMode('user')}
              className={cn(
                'px-2.5 py-1 rounded-md text-xs font-medium transition-all flex items-center gap-1',
                colorMode === 'user'
                  ? 'bg-white dark:bg-neutral-700 text-gray-800 dark:text-white shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'
              )}
            >
              <Users className="w-3 h-3" /> Usuario
            </button>
            <button
              onClick={() => setColorMode('project')}
              className={cn(
                'px-2.5 py-1 rounded-md text-xs font-medium transition-all flex items-center gap-1',
                colorMode === 'project'
                  ? 'bg-white dark:bg-neutral-700 text-gray-800 dark:text-white shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'
              )}
            >
              <Folder className="w-3 h-3" /> Proyecto
            </button>
          </div>

          {/* Zoom controls */}
          <div className="flex items-center gap-1 bg-gray-100 dark:bg-neutral-800 rounded-lg p-1">
            <button
              onClick={() => setDayWidth(Math.max(0, dayWidth - 1))}
              className="w-7 h-7 flex items-center justify-center rounded-md text-gray-500 hover:text-gray-700 hover:bg-white dark:hover:bg-neutral-700 transition-all"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="text-xs text-gray-500 dark:text-gray-400 px-1">{cellWidth}px</span>
            <button
              onClick={() => setDayWidth(Math.min(DAY_WIDTH_OPTIONS.length - 1, dayWidth + 1))}
              className="w-7 h-7 flex items-center justify-center rounded-md text-gray-500 hover:text-gray-700 hover:bg-white dark:hover:bg-neutral-700 transition-all"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>

          <button onClick={handleExportPDF} className="btn-secondary flex items-center gap-2 text-sm">
            <Download className="w-4 h-4" />
            Exportar PDF
          </button>
        </div>
      </div>

      {/* Filters */}
      {isAdmin && (
        <div className="flex flex-wrap gap-3">
          <select value={userFilter} onChange={(e) => setUserFilter(e.target.value)} className="input w-48">
            <option value="ALL">Todos los usuarios</option>
            {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
          <select value={projectFilter} onChange={(e) => setProjectFilter(e.target.value)} className="input w-48">
            <option value="ALL">Todos los proyectos</option>
            {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 text-xs">
        {colorMode === 'status' && Object.entries(STATUS_COLORS).map(([status, color]) => (
          <div key={status} className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: color }} />
            <span className="text-gray-500 dark:text-gray-400">{getStatusLabel(status)}</span>
          </div>
        ))}
        {colorMode === 'user' && users.map((u) => (
          <div key={u.id} className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: u.color || '#6366F1' }} />
            <span className="text-gray-500 dark:text-gray-400">{u.name}</span>
          </div>
        ))}
        {colorMode === 'project' && projects.map((p) => (
          <div key={p.id} className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: p.color }} />
            <span className="text-gray-500 dark:text-gray-400">{p.name}</span>
          </div>
        ))}
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-amber-300 border-2 border-amber-500" />
          <span className="text-gray-500 dark:text-gray-400">Conflicto</span>
        </div>
      </div>

      {/* Gantt chart */}
      <div className="card overflow-hidden">
        <div ref={ganttRef} className="gantt-container overflow-x-auto">
          <div style={{ minWidth: days.length * cellWidth + 200 }}>
            {/* Timeline header */}
            <div className="flex border-b border-gray-100 dark:border-neutral-800 sticky top-0 bg-white dark:bg-neutral-900 z-10">
              <div className="w-48 flex-shrink-0 border-r border-gray-100 dark:border-neutral-800" />
              <div className="flex-1 relative">
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
              const userColor = user.color || '#6366F1'
              return (
                <div key={user.id} className="border-b border-gray-50 dark:border-neutral-800">
                  {/* User header */}
                  <div className="flex items-center bg-gray-50/50 dark:bg-neutral-800/20 border-b border-gray-100 dark:border-neutral-800/50">
                    <div className="w-48 flex-shrink-0 px-3 py-2 flex items-center gap-2 border-r border-gray-100 dark:border-neutral-800">
                      <div
                        className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-semibold flex-shrink-0"
                        style={{ backgroundColor: userColor }}
                      >
                        {getInitials(user.name)}
                      </div>
                      <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 truncate">{user.name}</span>
                    </div>
                    <div className="flex-1 h-8 relative">
                      <div className="absolute top-0 bottom-0 w-px bg-brand-400 opacity-40 z-10" style={{ left: todayOffset }} />
                      {days.map((day, i) =>
                        isWeekend(day) ? (
                          <div key={day.toISOString()} className="absolute top-0 bottom-0 bg-gray-100 dark:bg-neutral-800/40" style={{ left: i * cellWidth, width: cellWidth }} />
                        ) : null
                      )}
                    </div>
                  </div>

                  {/* Task rows */}
                  {userTasks.map((task) => {
                    const { left, width } = getTaskPosition(task)
                    const hasConflict = conflictTaskIds.has(task.id)
                    const project = projects.find((p) => p.id === task.projectId)
                    const barColor = getTaskColor(task, hasConflict)

                    return (
                      <div key={task.id} className="flex items-center hover:bg-gray-50/50 dark:hover:bg-neutral-800/10 transition-colors">
                        <div className="w-48 flex-shrink-0 px-3 py-2 border-r border-gray-100 dark:border-neutral-800">
                          <div className="flex items-center gap-1.5">
                            {hasConflict && <AlertTriangle className="w-3 h-3 text-amber-500 flex-shrink-0" />}
                            <p className="text-xs text-gray-700 dark:text-gray-300 truncate" title={task.name}>{task.name}</p>
                          </div>
                          {project && (
                            <div className="flex items-center gap-1 mt-0.5">
                              <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: project.color }} />
                              <p className="text-xs text-gray-400 truncate">{project.name}</p>
                            </div>
                          )}
                        </div>

                        <div className="flex-1 h-10 relative" style={{ minWidth: days.length * cellWidth }}>
                          {days.map((day, i) =>
                            isWeekend(day) ? (
                              <div key={day.toISOString()} className="absolute top-0 bottom-0 bg-gray-50 dark:bg-neutral-800/20" style={{ left: i * cellWidth, width: cellWidth }} />
                            ) : null
                          )}
                          <div className="absolute top-0 bottom-0 w-px bg-brand-400 z-10" style={{ left: todayOffset }} />

                          <div
                            className={cn(
                              'absolute top-1/2 -translate-y-1/2 rounded-md flex items-center px-2 overflow-hidden cursor-default transition-opacity hover:opacity-90',
                              hasConflict && 'ring-2 ring-amber-400'
                            )}
                            style={{
                              left: Math.max(0, left),
                              width: Math.max(cellWidth * 1.5, width),
                              height: 26,
                              backgroundColor: barColor,
                              opacity: task.status === 'TERMINADO' ? 0.7 : 1,
                            }}
                            title={`${task.name} (${getStatusLabel(task.status)}) — ${task.progress}%`}
                          >
                            <div className="absolute top-0 left-0 h-full rounded-md opacity-30 bg-white" style={{ width: `${task.progress}%` }} />
                            {cellWidth >= 28 && (
                              <span className="relative text-white text-xs font-medium truncate z-10">{task.name}</span>
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
        <button onClick={() => setCurrentDate(subMonths(currentDate, 1))} className="btn-secondary">← Mes anterior</button>
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300 capitalize">
          {format(currentDate, 'MMMM yyyy', { locale: es })}
        </span>
        <button onClick={() => setCurrentDate(addMonths(currentDate, 1))} className="btn-secondary">Mes siguiente →</button>
      </div>
    </div>
  )
}
