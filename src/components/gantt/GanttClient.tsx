'use client'
// src/components/gantt/GanttClient.tsx
import { useState, useRef, useMemo } from 'react'
import { Download, ZoomIn, ZoomOut, AlertTriangle, Users, Folder } from 'lucide-react'
import { startOfMonth, endOfMonth, eachDayOfInterval, format, isWeekend, isSameDay, differenceInDays, addMonths, subMonths } from 'date-fns'
import { es } from 'date-fns/locale'
import { cn, getStatusLabel, getInitials, detectConflicts } from '@/lib/utils'
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

function hexToRgb(hex: string) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result
    ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) }
    : { r: 99, g: 102, b: 241 }
}

// Day column header showing weekday letter + number
function DayCell({ day, cellWidth }: { day: Date; cellWidth: number }) {
  const weekend = isWeekend(day)
  const today = isSameDay(day, new Date())
  const weekdayLetter = format(day, 'EEEEE', { locale: es }).toUpperCase() // M T W etc

  if (today) {
    return (
      <div className="flex-shrink-0 flex flex-col items-center justify-center border-r border-gray-50"
        style={{ width: cellWidth, backgroundColor: '#6366F1' }}>
        {cellWidth >= 20 && <span className="text-white text-[8px] font-bold leading-none">{weekdayLetter}</span>}
        {cellWidth >= 20 && <span className="text-white text-[10px] font-bold">{format(day, 'd')}</span>}
      </div>
    )
  }
  if (weekend) {
    return (
      <div className="flex-shrink-0 flex flex-col items-center justify-center border-r border-gray-100 dark:border-neutral-800 bg-gray-100 dark:bg-neutral-800/60"
        style={{ width: cellWidth }}>
        {cellWidth >= 20 && <span className="text-gray-400 text-[8px] leading-none">{weekdayLetter}</span>}
        {cellWidth >= 20 && <span className="text-gray-400 text-[10px]">{format(day, 'd')}</span>}
      </div>
    )
  }
  return (
    <div className="flex-shrink-0 flex flex-col items-center justify-center border-r border-gray-50 dark:border-neutral-800/50"
      style={{ width: cellWidth }}>
      {cellWidth >= 20 && <span className="text-gray-400 dark:text-gray-600 text-[8px] leading-none">{weekdayLetter}</span>}
      {cellWidth >= 20 && <span className="text-gray-500 dark:text-gray-500 text-[10px]">{format(day, 'd')}</span>}
    </div>
  )
}

export default function GanttClient({ tasks: initialTasks, users, projects, isAdmin }: GanttClientProps) {
  const [tasks] = useState(initialTasks)
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

  const filteredTasks = useMemo(() => tasks.filter((t) => {
    if (userFilter !== 'ALL' && t.userId !== userFilter) return false
    if (projectFilter !== 'ALL' && t.projectId !== projectFilter) return false
    return true
  }), [tasks, userFilter, projectFilter])

  const groupedByUser = useMemo(() => {
    const groups: Record<string, { user: { id: string; name: string; color?: string }; tasks: Task[] }> = {}
    users.forEach((u) => { groups[u.id] = { user: u, tasks: [] } })
    filteredTasks.forEach((t) => { if (t.userId && groups[t.userId]) groups[t.userId].tasks.push(t) })
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
        if (conflicts.length > 0) { ids.add(task.id); conflicts.forEach((c) => ids.add(c.id || '')) }
      })
    })
    return ids
  }, [tasks, users])

  function getTaskColor(task: Task, hasConflict: boolean): string {
    if (hasConflict) return '#F59E0B'
    if (colorMode === 'user') return users.find((u) => u.id === task.userId)?.color || '#6366F1'
    if (colorMode === 'project') return projects.find((p) => p.id === task.projectId)?.color || '#3B82F6'
    return STATUS_COLORS[task.status] || '#9CA3AF'
  }

  function getTaskPosition(task: Task) {
    const startOffset = differenceInDays(new Date(task.startDate), rangeStart)
    const duration = differenceInDays(new Date(task.endDate), new Date(task.startDate)) + 1
    return { left: Math.max(0, startOffset * cellWidth), width: Math.max(cellWidth, duration * cellWidth) }
  }

  const todayOffset = differenceInDays(new Date(), rangeStart) * cellWidth

  async function handleExportPDF() {
    const toastId = toast.loading('Generando PDF...')
    try {
      const { default: jsPDF } = await import('jspdf')
      const { default: autoTable } = await import('jspdf-autotable')
      const doc = new jsPDF({ orientation: 'landscape', format: 'a4' })
      const pageW = 297; const pageH = 210; const margin = 14
      doc.setFillColor(31, 41, 55); doc.rect(0, 0, pageW, 18, 'F')
      doc.setTextColor(255, 255, 255); doc.setFontSize(13); doc.setFont('helvetica', 'bold')
      doc.text('SM Arquitectura — Diagrama de Gantt', margin, 12)
      doc.setFontSize(8); doc.setFont('helvetica', 'normal')
      doc.text(format(new Date(), 'dd MMMM yyyy', { locale: es }), pageW - margin - 35, 12)
      const ganttTop = 24; const labelColW = 55; const rowH = 11
      const ganttLeft = margin + labelColW; const ganttRight = pageW - margin
      const totalDaysW = ganttRight - ganttLeft; const pdfCellW = totalDaysW / days.length
      let mxOffset = ganttLeft
      months.forEach((m) => {
        const mw = m.days.length * pdfCellW
        doc.setFillColor(79, 82, 229); doc.rect(mxOffset, ganttTop, mw - 0.2, rowH * 0.55, 'F')
        doc.setTextColor(255, 255, 255); doc.setFontSize(5); doc.setFont('helvetica', 'bold')
        doc.text(m.label.substring(0, 14), mxOffset + 1.5, ganttTop + 3.5)
        mxOffset += mw
      })
      days.forEach((day, i) => {
        const x = ganttLeft + i * pdfCellW
        const weekend = isWeekend(day); const today = isSameDay(day, new Date())
        if (today) { doc.setFillColor(99, 102, 241); doc.rect(x, ganttTop + rowH * 0.55, pdfCellW, rowH * 0.45, 'F') }
        else if (weekend) { doc.setFillColor(235, 235, 240); doc.rect(x, ganttTop + rowH * 0.55, pdfCellW, rowH * 0.45, 'F') }
        if (pdfCellW >= 3.5) {
          doc.setTextColor(today ? 255 : weekend ? 160 : 120, today ? 255 : weekend ? 160 : 120, today ? 255 : weekend ? 160 : 120)
          doc.setFontSize(3.5); doc.setFont('helvetica', 'normal')
          doc.text(format(day, 'd'), x + pdfCellW / 2 - 1, ganttTop + rowH - 1.5)
        }
      })
      doc.setFillColor(31, 41, 55); doc.rect(margin, ganttTop, labelColW, rowH, 'F')
      doc.setTextColor(255, 255, 255); doc.setFontSize(6); doc.setFont('helvetica', 'bold')
      doc.text('Tarea', margin + 2, ganttTop + 7)
      const todayX = ganttLeft + differenceInDays(new Date(), rangeStart) * pdfCellW
      let rowY = ganttTop + rowH
      groupedByUser.forEach(({ user, tasks: userTasks }) => {
        if (rowY > pageH - 20) { doc.addPage('a4', 'landscape'); rowY = 20 }
        const uRgb = hexToRgb(user.color || '#6366F1')
        doc.setFillColor(uRgb.r, uRgb.g, uRgb.b)
        doc.rect(margin, rowY, labelColW, rowH * 0.85, 'F')
        doc.setFillColor(248, 249, 252); doc.rect(margin + labelColW, rowY, pageW - margin * 2 - labelColW, rowH * 0.85, 'F')
        doc.circle(margin + 3.5, rowY + rowH * 0.42, 2.8, 'F')
        doc.setTextColor(255, 255, 255); doc.setFontSize(4); doc.setFont('helvetica', 'bold')
        doc.text(getInitials(user.name), margin + 2, rowY + rowH * 0.55)
        doc.setTextColor(255, 255, 255); doc.setFontSize(6); doc.setFont('helvetica', 'bold')
        doc.text(user.name, margin + 8, rowY + 6.5)
        doc.setDrawColor(99, 102, 241); doc.setLineWidth(0.25)
        doc.line(todayX, rowY, todayX, rowY + rowH)
        rowY += rowH * 0.85
        userTasks.forEach((task) => {
          if (rowY > pageH - 20) { doc.addPage('a4', 'landscape'); rowY = 20 }
          const hasConflict = conflictTaskIds.has(task.id)
          const barColor = getTaskColor(task, hasConflict)
          const barRgb = hexToRgb(barColor)
          doc.setFillColor(250, 250, 252); doc.rect(margin, rowY, pageW - margin * 2, rowH, 'F')
          // weekend shading on rows
          days.forEach((day, i) => {
            if (isWeekend(day)) {
              doc.setFillColor(235, 235, 240)
              doc.rect(ganttLeft + i * pdfCellW, rowY, pdfCellW, rowH, 'F')
            }
          })
          doc.setTextColor(60, 60, 60); doc.setFontSize(5.5); doc.setFont('helvetica', 'normal')
          const label = task.name.length > 20 ? task.name.substring(0, 19) + '…' : task.name
          doc.text(label, margin + 2, rowY + rowH * 0.65)
          const taskStartOff = differenceInDays(new Date(task.startDate), rangeStart)
          const taskDur = Math.max(1, differenceInDays(new Date(task.endDate), new Date(task.startDate)) + 1)
          const barX = ganttLeft + taskStartOff * pdfCellW
          const barW = Math.max(pdfCellW, taskDur * pdfCellW)
          const barH = rowH * 0.6; const barTop = rowY + (rowH - barH) / 2
          if (hasConflict) { doc.setDrawColor(245, 158, 11); doc.setLineWidth(0.5); doc.roundedRect(barX - 0.5, barTop - 0.5, barW + 1, barH + 1, 0.8, 0.8, 'S') }
          doc.setFillColor(barRgb.r, barRgb.g, barRgb.b); doc.roundedRect(barX, barTop, barW, barH, 0.8, 0.8, 'F')
          if (task.progress > 0) {
            doc.setFillColor(Math.max(0, barRgb.r - 40), Math.max(0, barRgb.g - 40), Math.max(0, barRgb.b - 40))
            doc.roundedRect(barX, barTop, barW * (task.progress / 100), barH, 0.8, 0.8, 'F')
          }
          if (barW > 12) {
            doc.setTextColor(255, 255, 255); doc.setFontSize(4.5); doc.setFont('helvetica', 'bold')
            const maxChars = Math.floor(barW / 2.2)
            doc.text(task.name.length > maxChars ? task.name.substring(0, maxChars - 1) + '…' : task.name, barX + 1.5, barTop + barH * 0.68)
          }
          doc.setDrawColor(99, 102, 241); doc.setLineWidth(0.25)
          doc.line(todayX, rowY, todayX, rowY + rowH)
          rowY += rowH
        })
        rowY += 2
      })
      // Legend
      if (rowY < pageH - 14) {
        rowY += 3
        doc.setFontSize(6); doc.setFont('helvetica', 'bold'); doc.setTextColor(80, 80, 80)
        doc.text('Leyenda:', margin, rowY)
        let lx = margin + 18
        const items = colorMode === 'status' ? Object.entries(STATUS_COLORS).map(([k, v]) => ({ label: getStatusLabel(k), color: v }))
          : colorMode === 'user' ? users.map((u) => ({ label: u.name, color: u.color || '#6366F1' }))
          : projects.map((p) => ({ label: p.name, color: p.color }))
        items.forEach(({ label, color }) => {
          if (lx > pageW - 40) return
          const rgb = hexToRgb(color); doc.setFillColor(rgb.r, rgb.g, rgb.b)
          doc.roundedRect(lx, rowY - 3.5, 4, 4, 0.5, 0.5, 'F')
          doc.setTextColor(80, 80, 80); doc.setFont('helvetica', 'normal')
          doc.text(label, lx + 5.5, rowY); lx += label.length * 2 + 10
        })
      }
      doc.addPage('a4', 'landscape')
      doc.setFillColor(31, 41, 55); doc.rect(0, 0, pageW, 18, 'F')
      doc.setTextColor(255, 255, 255); doc.setFontSize(12); doc.setFont('helvetica', 'bold')
      doc.text('SM Arquitectura — Detalle de Tareas', margin, 12)
      autoTable(doc, {
        startY: 24,
        head: [['Tarea', 'Proyecto', 'Responsable', 'Inicio', 'Fin', 'Estado', 'Avance']],
        body: filteredTasks.map((t) => [t.name, (t as any).project?.name || '', (t as any).user?.name || '',
          format(new Date(t.startDate), 'dd/MM/yyyy'), format(new Date(t.endDate), 'dd/MM/yyyy'),
          getStatusLabel(t.status), `${t.progress}%`]),
        headStyles: { fillColor: [79, 82, 229], textColor: 255, fontSize: 9, fontStyle: 'bold' },
        bodyStyles: { fontSize: 8, textColor: [31, 41, 55] },
        alternateRowStyles: { fillColor: [248, 249, 250] },
        columnStyles: { 0: { cellWidth: 60 }, 1: { cellWidth: 55 }, 2: { cellWidth: 45 }, 3: { cellWidth: 25 }, 4: { cellWidth: 25 }, 5: { cellWidth: 30 }, 6: { cellWidth: 20 } },
        margin: { left: margin, right: margin },
      })
      doc.save('sm-arquitectura-gantt.pdf')
      toast.dismiss(toastId); toast.success('PDF descargado')
    } catch (err) {
      console.error(err); toast.dismiss(toastId); toast.error('Error al generar PDF')
    }
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Diagrama Gantt</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{filteredTasks.length} tareas visualizadas</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1 bg-gray-100 dark:bg-neutral-800 rounded-lg p-1">
            {(['status', 'user', 'project'] as ColorMode[]).map((mode) => (
              <button key={mode} onClick={() => setColorMode(mode)}
                className={cn('px-2.5 py-1 rounded-md text-xs font-medium transition-all flex items-center gap-1',
                  colorMode === mode ? 'bg-white dark:bg-neutral-700 text-gray-800 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700')}>
                {mode === 'user' && <Users className="w-3 h-3" />}
                {mode === 'project' && <Folder className="w-3 h-3" />}
                {mode === 'status' ? 'Estado' : mode === 'user' ? 'Usuario' : 'Proyecto'}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1 bg-gray-100 dark:bg-neutral-800 rounded-lg p-1">
            <button onClick={() => setDayWidth(Math.max(0, dayWidth - 1))} className="w-7 h-7 flex items-center justify-center rounded-md text-gray-500 hover:text-gray-700 hover:bg-white dark:hover:bg-neutral-700 transition-all"><ZoomOut className="w-3.5 h-3.5" /></button>
            <span className="text-xs text-gray-500 px-1">{cellWidth}px</span>
            <button onClick={() => setDayWidth(Math.min(DAY_WIDTH_OPTIONS.length - 1, dayWidth + 1))} className="w-7 h-7 flex items-center justify-center rounded-md text-gray-500 hover:text-gray-700 hover:bg-white dark:hover:bg-neutral-700 transition-all"><ZoomIn className="w-3.5 h-3.5" /></button>
          </div>
          <button onClick={handleExportPDF} className="btn-secondary flex items-center gap-2 text-sm">
            <Download className="w-4 h-4" /> Exportar PDF
          </button>
        </div>
      </div>

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

      <div className="flex flex-wrap items-center gap-4 text-xs">
        {colorMode === 'status' && Object.entries(STATUS_COLORS).map(([s, c]) => (
          <div key={s} className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm" style={{ backgroundColor: c }} /><span className="text-gray-500">{getStatusLabel(s)}</span></div>
        ))}
        {colorMode === 'user' && users.map((u) => (
          <div key={u.id} className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full" style={{ backgroundColor: u.color || '#6366F1' }} /><span className="text-gray-500">{u.name}</span></div>
        ))}
        {colorMode === 'project' && projects.map((p) => (
          <div key={p.id} className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm" style={{ backgroundColor: p.color }} /><span className="text-gray-500">{p.name}</span></div>
        ))}
        <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-amber-300 border-2 border-amber-500" /><span className="text-gray-500">Conflicto</span></div>
        <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-gray-200 dark:bg-neutral-700" /><span className="text-gray-500">Fin de semana</span></div>
      </div>

      <div className="card overflow-hidden">
        <div ref={ganttRef} className="overflow-x-auto">
          <div style={{ minWidth: days.length * cellWidth + 200 }}>
            {/* Header */}
            <div className="flex border-b border-gray-100 dark:border-neutral-800 sticky top-0 bg-white dark:bg-neutral-900 z-10">
              <div className="w-48 flex-shrink-0 border-r border-gray-100 dark:border-neutral-800" />
              <div className="flex-1">
                {/* Month row */}
                <div className="flex border-b border-gray-100 dark:border-neutral-800">
                  {months.map((m) => (
                    <div key={m.label} className="text-xs font-semibold text-gray-700 dark:text-gray-300 px-3 py-1.5 border-r border-gray-100 dark:border-neutral-800 capitalize" style={{ width: m.days.length * cellWidth }}>
                      {m.label}
                    </div>
                  ))}
                </div>
                {/* Day row with weekday letters */}
                <div className="flex" style={{ height: 32 }}>
                  {days.map((day) => <DayCell key={day.toISOString()} day={day} cellWidth={cellWidth} />)}
                </div>
              </div>
            </div>

            {/* Task rows */}
            {groupedByUser.map(({ user, tasks: userTasks }) => (
              <div key={user.id} className="border-b border-gray-50 dark:border-neutral-800">
                {/* User row */}
                <div className="flex items-center bg-gray-50/50 dark:bg-neutral-800/20 border-b border-gray-100 dark:border-neutral-800/50">
                  <div className="w-48 flex-shrink-0 px-3 py-2 flex items-center gap-2 border-r border-gray-100 dark:border-neutral-800">
                    <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-semibold flex-shrink-0" style={{ backgroundColor: user.color || '#6366F1' }}>
                      {getInitials(user.name)}
                    </div>
                    <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 truncate">{user.name}</span>
                  </div>
                  <div className="flex-1 h-8 relative">
                    <div className="absolute top-0 bottom-0 w-px bg-brand-400 opacity-40 z-10" style={{ left: todayOffset }} />
                    {days.map((day, i) => isWeekend(day) ? (
                      <div key={day.toISOString()} className="absolute top-0 bottom-0 bg-gray-100 dark:bg-neutral-800/60" style={{ left: i * cellWidth, width: cellWidth }} />
                    ) : null)}
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
                        {days.map((day, i) => isWeekend(day) ? (
                          <div key={day.toISOString()} className="absolute top-0 bottom-0 bg-gray-100/70 dark:bg-neutral-800/40" style={{ left: i * cellWidth, width: cellWidth }} />
                        ) : null)}
                        <div className="absolute top-0 bottom-0 w-px bg-brand-400 z-10" style={{ left: todayOffset }} />
                        <div
                          className={cn('absolute top-1/2 -translate-y-1/2 rounded-md flex items-center px-2 overflow-hidden', hasConflict && 'ring-2 ring-amber-400')}
                          style={{ left: Math.max(0, left), width: Math.max(cellWidth * 1.5, width), height: 26, backgroundColor: barColor, opacity: task.status === 'TERMINADO' ? 0.7 : 1 }}
                          title={`${task.name} (${getStatusLabel(task.status)}) — ${task.progress}%`}
                        >
                          <div className="absolute top-0 left-0 h-full rounded-md opacity-30 bg-white" style={{ width: `${task.progress}%` }} />
                          {cellWidth >= 28 && <span className="relative text-white text-xs font-medium truncate z-10">{task.name}</span>}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            ))}

            {groupedByUser.length === 0 && (
              <div className="py-16 text-center"><p className="text-gray-500 text-sm">No hay tareas para mostrar</p></div>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center gap-4">
        <button onClick={() => setCurrentDate(subMonths(currentDate, 1))} className="btn-secondary">← Mes anterior</button>
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300 capitalize">{format(currentDate, 'MMMM yyyy', { locale: es })}</span>
        <button onClick={() => setCurrentDate(addMonths(currentDate, 1))} className="btn-secondary">Mes siguiente →</button>
      </div>
    </div>
  )
}
