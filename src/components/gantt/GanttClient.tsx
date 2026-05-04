'use client'
// src/components/gantt/GanttClient.tsx
import { useState, useMemo } from 'react'
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
  const r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return r ? { r: parseInt(r[1], 16), g: parseInt(r[2], 16), b: parseInt(r[3], 16) } : { r: 99, g: 102, b: 241 }
}

function DayCell({ day, cellWidth }: { day: Date; cellWidth: number }) {
  const weekend = isWeekend(day)
  const today = isSameDay(day, new Date())
  const letter = format(day, 'EEEEE', { locale: es }).toUpperCase()
  if (today) return (
    <div className="flex-shrink-0 flex flex-col items-center justify-center border-r border-indigo-400" style={{ width: cellWidth, backgroundColor: '#6366F1' }}>
      {cellWidth >= 20 && <span className="text-white text-[8px] font-bold leading-none">{letter}</span>}
      {cellWidth >= 20 && <span className="text-white text-[10px] font-bold">{format(day, 'd')}</span>}
    </div>
  )
  if (weekend) return (
    <div className="flex-shrink-0 flex flex-col items-center justify-center border-r border-gray-100 dark:border-neutral-800 bg-gray-100 dark:bg-neutral-800/60" style={{ width: cellWidth }}>
      {cellWidth >= 20 && <span className="text-gray-400 text-[8px] leading-none">{letter}</span>}
      {cellWidth >= 20 && <span className="text-gray-400 text-[10px]">{format(day, 'd')}</span>}
    </div>
  )
  return (
    <div className="flex-shrink-0 flex flex-col items-center justify-center border-r border-gray-50 dark:border-neutral-800/50" style={{ width: cellWidth }}>
      {cellWidth >= 20 && <span className="text-gray-400 dark:text-gray-600 text-[8px] leading-none">{letter}</span>}
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

  const cellWidth = DAY_WIDTH_OPTIONS[dayWidth]
  const rangeStart = startOfMonth(subMonths(currentDate, 1))
  const rangeEnd = endOfMonth(addMonths(currentDate, 1))
  const days = eachDayOfInterval({ start: rangeStart, end: rangeEnd })

  const months = useMemo(() => {
    const result: { label: string; days: Date[] }[] = []
    let cm = ''; let cd: Date[] = []
    days.forEach((day) => {
      const ml = format(day, 'MMMM yyyy', { locale: es })
      if (ml !== cm) { if (cd.length) result.push({ label: cm, days: cd }); cm = ml; cd = [] }
      cd.push(day)
    })
    if (cd.length) result.push({ label: cm, days: cd })
    return result
  }, [days])

  const filteredTasks = useMemo(() => tasks.filter((t) => {
    if (userFilter !== 'ALL' && t.userId !== userFilter) return false
    if (projectFilter !== 'ALL' && t.projectId !== projectFilter) return false
    return true
  }), [tasks, userFilter, projectFilter])

  const groupedByUser = useMemo(() => {
    const g: Record<string, { user: { id: string; name: string; color?: string }; tasks: Task[] }> = {}
    users.forEach((u) => { g[u.id] = { user: u, tasks: [] } })
    filteredTasks.forEach((t) => { if (t.userId && g[t.userId]) g[t.userId].tasks.push(t) })
    return Object.values(g).filter((x) => x.tasks.length > 0)
  }, [filteredTasks, users])

  const conflictIds = useMemo(() => {
    const ids = new Set<string>()
    users.forEach((user) => {
      const ut = tasks.filter((t) => t.userId === user.id && t.status !== 'TERMINADO')
      ut.forEach((task, i) => {
        const conflicts = detectConflicts(
          { startDate: new Date(task.startDate), endDate: new Date(task.endDate), userId: user.id },
          ut.filter((_, j) => j !== i).map((t) => ({ startDate: new Date(t.startDate), endDate: new Date(t.endDate), userId: t.userId, id: t.id }))
        )
        if (conflicts.length) { ids.add(task.id); conflicts.forEach((c) => ids.add(c.id || '')) }
      })
    })
    return ids
  }, [tasks, users])

  function getTaskColor(task: Task, conflict: boolean) {
    if (conflict) return '#F59E0B'
    if (colorMode === 'user') return users.find((u) => u.id === task.userId)?.color || '#6366F1'
    if (colorMode === 'project') return projects.find((p) => p.id === task.projectId)?.color || '#3B82F6'
    return STATUS_COLORS[task.status] || '#9CA3AF'
  }

  function getPos(task: Task) {
    return {
      left: Math.max(0, differenceInDays(new Date(task.startDate), rangeStart) * cellWidth),
      width: Math.max(cellWidth, (differenceInDays(new Date(task.endDate), new Date(task.startDate)) + 1) * cellWidth),
    }
  }

  const todayOffset = differenceInDays(new Date(), rangeStart) * cellWidth

  async function handleExportPDF() {
    const tid = toast.loading('Generando PDF...')
    try {
      const { default: jsPDF } = await import('jspdf')
      const { default: autoTable } = await import('jspdf-autotable')
      const doc = new jsPDF({ orientation: 'landscape', format: 'a4' })
      const W = 297, H = 210, M = 12

      // ── HEADER ──
      doc.setFillColor(255, 255, 255)
      doc.rect(0, 0, W, H, 'F')
      doc.setFillColor(99, 102, 241)
      doc.rect(0, 0, W, 14, 'F')
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(10); doc.setFont('helvetica', 'bold')
      doc.text('SM Arquitectura — Diagrama de Gantt', M, 9)
      doc.setFontSize(7); doc.setFont('helvetica', 'normal')
      doc.text(format(new Date(), "dd 'de' MMMM yyyy", { locale: es }), W - M - 32, 9)

      // ── GANTT SETUP ──
      const GT = 18
      const LW = 52
      const RH = 9
      const GL = M + LW
      const GW = W - M - GL
      const CW = GW / days.length
      const todayX = GL + differenceInDays(new Date(), rangeStart) * CW

      // Month headers
      let mx = GL
      months.forEach((mo) => {
        const mw = mo.days.length * CW
        doc.setFillColor(238, 239, 255)
        doc.rect(mx, GT, mw - 0.1, RH * 0.55, 'F')
        doc.setDrawColor(210, 212, 240); doc.setLineWidth(0.1)
        doc.line(mx, GT, mx, GT + RH * 0.55)
        doc.setTextColor(79, 82, 229); doc.setFontSize(5); doc.setFont('helvetica', 'bold')
        doc.text(mo.label.toUpperCase().substring(0, 16), mx + 2, GT + 3.5)
        mx += mw
      })

      // Day cells header
      days.forEach((day, i) => {
        const x = GL + i * CW
        const we = isWeekend(day), td = isSameDay(day, new Date())

        if (td) {
          doc.setFillColor(99, 102, 241)
          doc.rect(x, GT + RH * 0.55, CW, RH * 0.45, 'F')
        } else if (we) {
          doc.setFillColor(243, 244, 246)
          doc.rect(x, GT + RH * 0.55, CW, RH * 0.45, 'F')
        } else {
          doc.setFillColor(248, 249, 255)
          doc.rect(x, GT + RH * 0.55, CW, RH * 0.45, 'F')
        }

        // Vertical grid line
        doc.setDrawColor(225, 226, 240); doc.setLineWidth(0.05)
        doc.line(x, GT + RH * 0.55, x, GT + RH)

        if (CW >= 2.8) {
          const letter = format(day, 'EEEEE', { locale: es }).toUpperCase()
          doc.setFontSize(2.6); doc.setFont('helvetica', td ? 'bold' : 'normal')
          doc.setTextColor(td ? 255 : we ? 160 : 140, td ? 255 : we ? 160 : 140, td ? 255 : we ? 165 : 170)
          doc.text(letter, x + CW / 2 - 0.7, GT + RH * 0.55 + 2)
          doc.setFontSize(3)
          doc.setTextColor(td ? 255 : we ? 150 : 100, td ? 255 : we ? 150 : 100, td ? 255 : we ? 155 : 120)
          doc.text(format(day, 'd'), x + CW / 2 - (format(day, 'd').length > 1 ? 1.5 : 0.8), GT + RH - 0.8)
        }
      })

      // Label col header
      doc.setFillColor(99, 102, 241)
      doc.rect(M, GT, LW, RH, 'F')
      doc.setTextColor(255, 255, 255); doc.setFontSize(5); doc.setFont('helvetica', 'bold')
      doc.text('COLABORADOR / TAREA', M + 2, GT + 5.8)

      let rowY = GT + RH

      groupedByUser.forEach(({ user, tasks: ut }) => {
        if (rowY > H - 18) { doc.addPage('a4', 'landscape'); rowY = 20 }

        const uRgb = hexToRgb(user.color || '#6366F1')

        // User header row
        doc.setFillColor(uRgb.r, uRgb.g, uRgb.b)
        doc.rect(M, rowY, LW, RH * 0.8, 'F')
        // light tint for gantt area
        doc.setFillColor(uRgb.r, uRgb.g, uRgb.b)
        doc.rect(GL, rowY, GW, RH * 0.8, 'F')
        // white overlay for tint effect
        doc.setFillColor(255, 255, 255)
        // Use opacity simulation: draw a nearly-white rect
        doc.setFillColor(
          Math.min(255, uRgb.r + Math.round((255 - uRgb.r) * 0.88)),
          Math.min(255, uRgb.g + Math.round((255 - uRgb.g) * 0.88)),
          Math.min(255, uRgb.b + Math.round((255 - uRgb.b) * 0.88))
        )
        doc.rect(GL, rowY, GW, RH * 0.8, 'F')

        // Weekend on user row
        days.forEach((d, i) => {
          if (isWeekend(d)) {
            doc.setFillColor(235, 236, 245)
            doc.rect(GL + i * CW, rowY, CW, RH * 0.8, 'F')
          }
        })

        // Avatar
        doc.setFillColor(uRgb.r, uRgb.g, uRgb.b)
        doc.circle(M + 3.5, rowY + RH * 0.4, 2.5, 'F')
        doc.setTextColor(255, 255, 255); doc.setFontSize(3.5); doc.setFont('helvetica', 'bold')
        doc.text(getInitials(user.name), M + 1.8, rowY + RH * 0.52)
        doc.setTextColor(255, 255, 255); doc.setFontSize(5.5); doc.setFont('helvetica', 'bold')
        doc.text(user.name, M + 7.5, rowY + RH * 0.6)

        // Today line
        doc.setDrawColor(99, 102, 241); doc.setLineWidth(0.2)
        doc.line(todayX, rowY, todayX, rowY + RH * 0.8)

        rowY += RH * 0.8

        ut.forEach((task) => {
          if (rowY > H - 18) { doc.addPage('a4', 'landscape'); rowY = 20 }

          const conflict = conflictIds.has(task.id)
          const bc = getTaskColor(task, conflict)
          const bRgb = hexToRgb(bc)

          // Row background
          doc.setFillColor(252, 252, 255); doc.rect(M, rowY, W - M * 2, RH, 'F')
          doc.setFillColor(248, 249, 252); doc.rect(GL, rowY, GW, RH, 'F')

          // Weekend columns
          days.forEach((d, i) => {
            if (isWeekend(d)) { doc.setFillColor(238, 239, 248); doc.rect(GL + i * CW, rowY, CW, RH, 'F') }
          })

          // Grid line
          doc.setDrawColor(230, 231, 242); doc.setLineWidth(0.05)
          doc.line(M, rowY + RH, W - M, rowY + RH)
          // Vertical day lines
          days.forEach((_, i) => {
            doc.setDrawColor(235, 236, 245); doc.setLineWidth(0.04)
            doc.line(GL + i * CW, rowY, GL + i * CW, rowY + RH)
          })

          // Task label
          doc.setTextColor(60, 65, 90); doc.setFontSize(5); doc.setFont('helvetica', 'normal')
          const label = task.name.length > 22 ? task.name.substring(0, 21) + '…' : task.name
          doc.text(label, M + 2, rowY + RH * 0.65)

          // Bar
          const off = differenceInDays(new Date(task.startDate), rangeStart)
          const dur = Math.max(1, differenceInDays(new Date(task.endDate), new Date(task.startDate)) + 1)
          const bx = GL + off * CW
          const bw = Math.max(CW, dur * CW)
          const bh = RH * 0.52
          const by = rowY + (RH - bh) / 2

          // Conflict ring
          if (conflict) {
            doc.setDrawColor(245, 158, 11); doc.setLineWidth(0.4)
            doc.roundedRect(bx - 0.5, by - 0.5, bw + 1, bh + 1, 0.5, 0.5, 'S')
          }

          doc.setFillColor(bRgb.r, bRgb.g, bRgb.b)
          doc.roundedRect(bx, by, bw, bh, 0.5, 0.5, 'F')

          // Progress overlay (lighter)
          if (task.progress > 0 && task.progress < 100) {
            doc.setFillColor(
              Math.min(255, bRgb.r + 50),
              Math.min(255, bRgb.g + 50),
              Math.min(255, bRgb.b + 50)
            )
            doc.roundedRect(bx, by, bw * (task.progress / 100), bh, 0.5, 0.5, 'F')
          }

          // Label on bar
          if (bw > 8) {
            doc.setTextColor(255, 255, 255); doc.setFontSize(3.8); doc.setFont('helvetica', 'bold')
            const mc = Math.floor(bw / 2)
            doc.text(task.name.length > mc ? task.name.substring(0, mc - 1) + '…' : task.name, bx + 1.5, by + bh * 0.72)
          }

          // Today line
          doc.setDrawColor(99, 102, 241); doc.setLineWidth(0.2)
          doc.line(todayX, rowY, todayX, rowY + RH)

          rowY += RH
        })
        rowY += 1.5
      })

      // ── LEGEND ──
      if (rowY < H - 10) {
        rowY += 3
        doc.setFillColor(245, 246, 255); doc.rect(M, rowY - 3, W - M * 2, 10, 'F')
        doc.setDrawColor(210, 212, 240); doc.setLineWidth(0.1)
        doc.rect(M, rowY - 3, W - M * 2, 10, 'S')
        doc.setTextColor(100, 102, 140); doc.setFontSize(4.5); doc.setFont('helvetica', 'bold')
        doc.text('LEYENDA', M + 2, rowY + 1.5)
        let lx = M + 18
        const items = colorMode === 'status'
          ? Object.entries(STATUS_COLORS).map(([k, v]) => ({ label: getStatusLabel(k), color: v }))
          : colorMode === 'user' ? users.map((u) => ({ label: u.name, color: u.color || '#6366F1' }))
          : projects.map((p) => ({ label: p.name, color: p.color }))
        items.forEach(({ label, color }) => {
          if (lx > W - 35) return
          const rgb = hexToRgb(color)
          doc.setFillColor(rgb.r, rgb.g, rgb.b)
          doc.roundedRect(lx, rowY - 0.5, 3.5, 3.5, 0.4, 0.4, 'F')
          doc.setTextColor(80, 82, 110); doc.setFont('helvetica', 'normal'); doc.setFontSize(4.5)
          doc.text(label, lx + 5, rowY + 2.5)
          lx += label.length * 1.9 + 9
        })
        // Weekend
        doc.setFillColor(235, 236, 245); doc.roundedRect(lx, rowY - 0.5, 3.5, 3.5, 0.4, 0.4, 'F')
        doc.setTextColor(80, 82, 110); doc.setFontSize(4.5)
        doc.text('Fin de semana', lx + 5, rowY + 2.5)
      }

      // ── TABLE PAGE ──
      doc.addPage('a4', 'landscape')
      doc.setFillColor(99, 102, 241); doc.rect(0, 0, W, 14, 'F')
      doc.setTextColor(255, 255, 255); doc.setFontSize(10); doc.setFont('helvetica', 'bold')
      doc.text('SM Arquitectura — Detalle de Tareas', M, 9)
      doc.setFontSize(7); doc.setFont('helvetica', 'normal')
      doc.text(format(new Date(), "dd 'de' MMMM yyyy", { locale: es }), W - M - 32, 9)

      autoTable(doc, {
        startY: 20,
        head: [['Tarea', 'Proyecto', 'Responsable', 'Inicio', 'Fin', 'Estado', 'Avance']],
        body: filteredTasks.map((t) => [
          t.name, (t as any).project?.name || '', (t as any).user?.name || '',
          format(new Date(t.startDate), 'dd/MM/yyyy'), format(new Date(t.endDate), 'dd/MM/yyyy'),
          getStatusLabel(t.status), `${t.progress}%`,
        ]),
        headStyles: { fillColor: [79, 82, 229], textColor: 255, fontSize: 7, fontStyle: 'bold' },
        bodyStyles: { fontSize: 7, textColor: [40, 45, 80] },
        alternateRowStyles: { fillColor: [245, 246, 255] },
        columnStyles: {
          0: { cellWidth: 60 }, 1: { cellWidth: 50 }, 2: { cellWidth: 45 },
          3: { cellWidth: 25 }, 4: { cellWidth: 25 }, 5: { cellWidth: 28 }, 6: { cellWidth: 18 },
        },
        margin: { left: M, right: M },
      })

      doc.save('sm-arquitectura-gantt.pdf')
      toast.dismiss(tid); toast.success('PDF descargado')
    } catch (err) {
      console.error(err); toast.dismiss(tid); toast.error('Error al generar PDF')
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
                  colorMode === mode ? 'bg-white dark:bg-neutral-700 text-gray-800 dark:text-white shadow-sm' : 'text-gray-500 hover:text-gray-700')}>
                {mode === 'user' && <Users className="w-3 h-3" />}
                {mode === 'project' && <Folder className="w-3 h-3" />}
                {mode === 'status' ? 'Estado' : mode === 'user' ? 'Usuario' : 'Proyecto'}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1 bg-gray-100 dark:bg-neutral-800 rounded-lg p-1">
            <button onClick={() => setDayWidth(Math.max(0, dayWidth - 1))} className="w-7 h-7 flex items-center justify-center rounded-md text-gray-500 hover:text-gray-700 hover:bg-white dark:hover:bg-neutral-700"><ZoomOut className="w-3.5 h-3.5" /></button>
            <span className="text-xs text-gray-500 px-1">{cellWidth}px</span>
            <button onClick={() => setDayWidth(Math.min(DAY_WIDTH_OPTIONS.length - 1, dayWidth + 1))} className="w-7 h-7 flex items-center justify-center rounded-md text-gray-500 hover:text-gray-700 hover:bg-white dark:hover:bg-neutral-700"><ZoomIn className="w-3.5 h-3.5" /></button>
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
        <div className="overflow-x-auto">
          <div style={{ minWidth: days.length * cellWidth + 200 }}>
            <div className="flex border-b border-gray-100 dark:border-neutral-800 sticky top-0 bg-white dark:bg-neutral-900 z-10">
              <div className="w-48 flex-shrink-0 border-r border-gray-100 dark:border-neutral-800" />
              <div className="flex-1">
                <div className="flex border-b border-gray-100 dark:border-neutral-800">
                  {months.map((m) => (
                    <div key={m.label} className="text-xs font-semibold text-gray-700 dark:text-gray-300 px-3 py-1.5 border-r border-gray-100 dark:border-neutral-800 capitalize" style={{ width: m.days.length * cellWidth }}>{m.label}</div>
                  ))}
                </div>
                <div className="flex" style={{ height: 32 }}>
                  {days.map((day) => <DayCell key={day.toISOString()} day={day} cellWidth={cellWidth} />)}
                </div>
              </div>
            </div>

            {groupedByUser.map(({ user, tasks: ut }) => (
              <div key={user.id} className="border-b border-gray-50 dark:border-neutral-800">
                <div className="flex items-center bg-gray-50/50 dark:bg-neutral-800/20 border-b border-gray-100 dark:border-neutral-800/50">
                  <div className="w-48 flex-shrink-0 px-3 py-2 flex items-center gap-2 border-r border-gray-100 dark:border-neutral-800">
                    <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-semibold flex-shrink-0" style={{ backgroundColor: user.color || '#6366F1' }}>{getInitials(user.name)}</div>
                    <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 truncate">{user.name}</span>
                  </div>
                  <div className="flex-1 h-8 relative">
                    <div className="absolute top-0 bottom-0 w-px bg-brand-400 opacity-40 z-10" style={{ left: todayOffset }} />
                    {days.map((d, i) => isWeekend(d) ? <div key={d.toISOString()} className="absolute top-0 bottom-0 bg-gray-100 dark:bg-neutral-800/60" style={{ left: i * cellWidth, width: cellWidth }} /> : null)}
                  </div>
                </div>
                {ut.map((task) => {
                  const { left, width } = getPos(task)
                  const conflict = conflictIds.has(task.id)
                  const project = projects.find((p) => p.id === task.projectId)
                  const barColor = getTaskColor(task, conflict)
                  return (
                    <div key={task.id} className="flex items-center hover:bg-gray-50/50 dark:hover:bg-neutral-800/10 transition-colors">
                      <div className="w-48 flex-shrink-0 px-3 py-2 border-r border-gray-100 dark:border-neutral-800">
                        <div className="flex items-center gap-1.5">
                          {conflict && <AlertTriangle className="w-3 h-3 text-amber-500 flex-shrink-0" />}
                          <p className="text-xs text-gray-700 dark:text-gray-300 truncate" title={task.name}>{task.name}</p>
                        </div>
                        {project && <div className="flex items-center gap-1 mt-0.5"><div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: project.color }} /><p className="text-xs text-gray-400 truncate">{project.name}</p></div>}
                      </div>
                      <div className="flex-1 h-10 relative" style={{ minWidth: days.length * cellWidth }}>
                        {days.map((d, i) => isWeekend(d) ? <div key={d.toISOString()} className="absolute top-0 bottom-0 bg-gray-100/70 dark:bg-neutral-800/40" style={{ left: i * cellWidth, width: cellWidth }} /> : null)}
                        <div className="absolute top-0 bottom-0 w-px bg-brand-400 z-10" style={{ left: todayOffset }} />
                        <div className={cn('absolute top-1/2 -translate-y-1/2 rounded-md flex items-center px-2 overflow-hidden', conflict && 'ring-2 ring-amber-400')}
                          style={{ left: Math.max(0, left), width: Math.max(cellWidth * 1.5, width), height: 22, backgroundColor: barColor, opacity: task.status === 'TERMINADO' ? 0.7 : 1 }}
                          title={`${task.name} — ${task.progress}%`}>
                          <div className="absolute top-0 left-0 h-full rounded-md opacity-25 bg-white" style={{ width: `${task.progress}%` }} />
                          {cellWidth >= 28 && <span className="relative text-white text-xs font-medium truncate z-10">{task.name}</span>}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            ))}
            {groupedByUser.length === 0 && <div className="py-16 text-center"><p className="text-gray-500 text-sm">No hay tareas para mostrar</p></div>}
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
