'use client'
// src/components/gantt/GanttClient.tsx
import { useState, useMemo } from 'react'
import { Download, ZoomIn, ZoomOut, AlertTriangle, Users, Folder, CalendarCheck, X } from 'lucide-react'
import { subDays, startOfMonth, endOfMonth, eachDayOfInterval, format, isWeekend, isSameDay, isSameMonth, differenceInDays, addMonths, subMonths } from 'date-fns'
import { es } from 'date-fns/locale'
import { cn, getStatusLabel, getInitials, detectConflicts, parseDate } from '@/lib/utils'
import toast from 'react-hot-toast'
import type { Task } from '@/types'

interface GanttClientProps {
  tasks: Task[]
  users: { id: string; name: string; color?: string }[]
  projects: { id: string; name: string; color: string; startDate?: any; endDate?: any }[]
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
type GroupMode = 'user' | 'project'

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

// Task detail popup
function TaskDetailPopup({ task, users, projects, onClose }: { task: Task; users: any[]; projects: any[]; onClose: () => void }) {
  const user = users.find(u => u.id === task.userId)
  const project = projects.find(p => p.id === task.projectId)
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/20" />
      <div className="relative bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl p-5 w-80 animate-slide-up" onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white">{task.name}</h3>
            {project && (
              <div className="flex items-center gap-1.5 mt-1">
                <div className="w-2 h-2 rounded-sm" style={{ backgroundColor: project.color }} />
                <span className="text-xs text-gray-500">{project.name}</span>
              </div>
            )}
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">Estado</span>
            <span className="font-medium text-gray-800 dark:text-white">{getStatusLabel(task.status)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Progreso</span>
            <span className="font-medium text-gray-800 dark:text-white">{task.progress}%</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Inicio</span>
            <span className="font-medium text-gray-800 dark:text-white">{format(new Date(task.startDate), 'dd MMM yyyy', { locale: es })}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Fin</span>
            <span className="font-medium text-gray-800 dark:text-white">{format(new Date(task.endDate), 'dd MMM yyyy', { locale: es })}</span>
          </div>
          {user && (
            <div className="flex justify-between items-center">
              <span className="text-gray-500">Responsable</span>
              <div className="flex items-center gap-1.5">
                <div className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] font-semibold" style={{ backgroundColor: user.color || '#6366F1' }}>{getInitials(user.name)}</div>
                <span className="font-medium text-gray-800 dark:text-white">{user.name}</span>
              </div>
            </div>
          )}
          {task.progress > 0 && (
            <div className="pt-1">
              <div className="h-1.5 bg-gray-100 dark:bg-neutral-700 rounded-full overflow-hidden">
                <div className="h-full rounded-full bg-brand-500 transition-all" style={{ width: `${task.progress}%` }} />
              </div>
            </div>
          )}
        </div>
      </div>
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
  const [groupMode, setGroupMode] = useState<GroupMode>('project')
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)

  const today = new Date()
  const isCurrentMonth = isSameMonth(currentDate, today)
  const cellWidth = DAY_WIDTH_OPTIONS[dayWidth]

  const rangeStartRaw = isCurrentMonth ? subDays(today, 3) : startOfMonth(subMonths(currentDate, 1))
  const rangeStart = new Date(rangeStartRaw.getFullYear(), rangeStartRaw.getMonth(), rangeStartRaw.getDate(), 0, 0, 0, 0)
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

  const groupedByProject = useMemo(() => {
    const g: Record<string, { project: { id: string; name: string; color: string; startDate?: any; endDate?: any }; tasks: Task[] }> = {}
    projects.forEach((p) => { g[p.id] = { project: p, tasks: [] } })
    filteredTasks.forEach((t) => { if (t.projectId && g[t.projectId]) g[t.projectId].tasks.push(t) })
    return Object.values(g).filter((x) => x.tasks.length > 0)
  }, [filteredTasks, projects])

  const conflictIds = useMemo(() => {
    const ids = new Set<string>()
    users.forEach((user) => {
      const ut = tasks.filter((t) => t.userId === user.id && t.status !== 'TERMINADO')
      ut.forEach((task, i) => {
        const conflicts = detectConflicts(
          { startDate: parseDate(task.startDate), endDate: parseDate(task.endDate), userId: user.id },
          ut.filter((_, j) => j !== i).map((t) => ({ startDate: parseDate(t.startDate), endDate: parseDate(t.endDate), userId: t.userId, id: t.id }))
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
      left: Math.max(0, differenceInDays(parseDate(task.startDate), rangeStart) * cellWidth),
      width: Math.max(cellWidth, (differenceInDays(parseDate(task.endDate), parseDate(task.startDate)) + 1) * cellWidth),
    }
  }

  function getProjectBar(project: { startDate?: any; endDate?: any }, tasks: Task[]) {
    // Use project dates directly — independent of tasks
    if (!project.startDate || !project.endDate) return null
    // Force string parsing: take only YYYY-MM-DD and build local date
    const sd = String(project.startDate).substring(0, 10)
    const ed = String(project.endDate).substring(0, 10)
    const [sy, sm, sday] = sd.split('-').map(Number)
    const [ey, em, eday] = ed.split('-').map(Number)
    const startDate = new Date(sy, sm - 1, sday, 0, 0, 0, 0)
    const endDate = new Date(ey, em - 1, eday, 0, 0, 0, 0)
    const left = Math.max(0, differenceInDays(startDate, rangeStart) * cellWidth)
    const width = Math.max(cellWidth * 2, (differenceInDays(endDate, startDate) + 1) * cellWidth)
    const done = tasks.filter(t => t.status === 'TERMINADO').length
    const progress = tasks.length > 0 ? Math.round((done / tasks.length) * 100) : 0
    return { left, width, progress }
  }

  const todayOffset = differenceInDays(today, rangeStart) * cellWidth

  // Label column — wider to show full text
  const LABEL_W = 200

  const TimelineHeader = () => (
    <div className="flex border-b border-gray-100 dark:border-neutral-800 sticky top-0 bg-white dark:bg-neutral-900 z-10">
      <div className="flex-shrink-0 border-r border-gray-100 dark:border-neutral-800" style={{ width: LABEL_W }} />
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
  )

  async function handleExportPDF() {
    const tid = toast.loading('Generando PDF...')
    try {
      const { default: jsPDF } = await import('jspdf')
      const { default: autoTable } = await import('jspdf-autotable')
      const doc = new jsPDF({ orientation: 'landscape', format: 'a4' })
      const W = 297, H = 210, M = 12
      doc.setFillColor(99, 102, 241); doc.rect(0, 0, W, 14, 'F')
      doc.setTextColor(255, 255, 255); doc.setFontSize(10); doc.setFont('helvetica', 'bold')
      doc.text('KRONOZ — Diagrama de Gantt', M, 9)
      doc.setFontSize(7); doc.setFont('helvetica', 'normal')
      doc.text(format(new Date(), "dd 'de' MMMM yyyy", { locale: es }), W - M - 32, 9)
      const GT = 18, LW = 55, MH = 5, WH = 4, NH = 4, RH = 8
      const GL = M + LW, GW = W - M - GL, CW = GW / days.length
      const todayX = GL + differenceInDays(today, rangeStart) * CW
      const totalHeaderH = MH + WH + NH
      let mx = GL
      months.forEach((mo) => {
        const mw = mo.days.length * CW
        doc.setFillColor(230, 231, 250); doc.rect(mx, GT, mw - 0.1, MH, 'F')
        doc.setDrawColor(200, 202, 235); doc.setLineWidth(0.1); doc.line(mx, GT, mx, GT + MH)
        doc.setTextColor(79, 82, 200); doc.setFontSize(4.5); doc.setFont('helvetica', 'bold')
        doc.text(mo.label.toUpperCase().substring(0, 18), mx + 1.5, GT + 3.5); mx += mw
      })
      days.forEach((day, i) => {
        const x = GL + i * CW, we = isWeekend(day), td = isSameDay(day, today)
        if (td) doc.setFillColor(79, 82, 220); else if (we) doc.setFillColor(218, 219, 240); else doc.setFillColor(240, 241, 252)
        doc.rect(x, GT + MH, CW, WH, 'F')
        const letter = format(day, 'EEEEE', { locale: es }).toUpperCase()
        doc.setFontSize(3.5); doc.setFont('helvetica', 'bold')
        doc.setTextColor(td ? 255 : we ? 130 : 100, td ? 255 : we ? 130 : 110, td ? 255 : we ? 150 : 160)
        const tw = doc.getTextWidth(letter); doc.text(letter, x + (CW - tw) / 2, GT + MH + WH - 0.8)
      })
      days.forEach((day, i) => {
        const x = GL + i * CW, we = isWeekend(day), td = isSameDay(day, today)
        if (td) doc.setFillColor(99, 102, 241); else if (we) doc.setFillColor(228, 229, 245); else doc.setFillColor(248, 249, 255)
        doc.rect(x, GT + MH + WH, CW, NH, 'F')
        doc.setDrawColor(220, 221, 240); doc.setLineWidth(0.05); doc.line(x, GT + MH + WH, x, GT + MH + WH + NH)
        const num = format(day, 'd'); doc.setFontSize(3.2); doc.setFont('helvetica', td ? 'bold' : 'normal')
        doc.setTextColor(td ? 255 : we ? 140 : 80, td ? 255 : we ? 140 : 85, td ? 255 : we ? 160 : 120)
        const tw = doc.getTextWidth(num); doc.text(num, x + (CW - tw) / 2, GT + MH + WH + NH - 0.8)
      })
      doc.setFillColor(79, 82, 200); doc.rect(M, GT, LW, totalHeaderH, 'F')
      doc.setTextColor(255, 255, 255); doc.setFontSize(5); doc.setFont('helvetica', 'bold')
      doc.text('COLABORADOR / TAREA', M + 2, GT + totalHeaderH / 2 + 1.5)
      let rowY = GT + totalHeaderH
      groupedByUser.forEach(({ user, tasks: ut }) => {
        if (rowY > H - 18) { doc.addPage('a4', 'landscape'); rowY = 20 }
        const uRgb = hexToRgb(user.color || '#6366F1')
        doc.setFillColor(uRgb.r, uRgb.g, uRgb.b); doc.rect(M, rowY, LW, RH * 0.85, 'F')
        doc.setFillColor(Math.min(255, uRgb.r + Math.round((255 - uRgb.r) * 0.88)), Math.min(255, uRgb.g + Math.round((255 - uRgb.g) * 0.88)), Math.min(255, uRgb.b + Math.round((255 - uRgb.b) * 0.88)))
        doc.rect(GL, rowY, GW, RH * 0.85, 'F')
        days.forEach((d, i) => { if (isWeekend(d)) { doc.setFillColor(230, 231, 245); doc.rect(GL + i * CW, rowY, CW, RH * 0.85, 'F') } })
        doc.setFillColor(uRgb.r, uRgb.g, uRgb.b); doc.circle(M + 3.5, rowY + RH * 0.43, 2.5, 'F')
        doc.setTextColor(255, 255, 255); doc.setFontSize(3.5); doc.setFont('helvetica', 'bold')
        doc.text(getInitials(user.name), M + 1.8, rowY + RH * 0.54)
        doc.setFontSize(5.5); doc.text(user.name, M + 7.5, rowY + RH * 0.6)
        doc.setDrawColor(99, 102, 241); doc.setLineWidth(0.2); doc.line(todayX, rowY, todayX, rowY + RH * 0.85)
        rowY += RH * 0.85
        ut.forEach((task) => {
          if (rowY > H - 18) { doc.addPage('a4', 'landscape'); rowY = 20 }
          const conflict = conflictIds.has(task.id), bc = getTaskColor(task, conflict), bRgb = hexToRgb(bc)
          doc.setFillColor(252, 252, 255); doc.rect(M, rowY, W - M * 2, RH, 'F')
          doc.setFillColor(247, 248, 253); doc.rect(GL, rowY, GW, RH, 'F')
          days.forEach((d, i) => { if (isWeekend(d)) { doc.setFillColor(237, 238, 248); doc.rect(GL + i * CW, rowY, CW, RH, 'F') } })
          doc.setDrawColor(228, 229, 242); doc.setLineWidth(0.04); doc.line(M, rowY + RH, W - M, rowY + RH)
          days.forEach((_, i) => { doc.line(GL + i * CW, rowY, GL + i * CW, rowY + RH) })
          doc.setTextColor(55, 60, 90); doc.setFontSize(5); doc.setFont('helvetica', 'normal')
          doc.text(task.name.length > 25 ? task.name.substring(0, 24) + '…' : task.name, M + 2, rowY + RH * 0.65)
          const off = differenceInDays(new Date(task.startDate), rangeStart), dur = Math.max(1, differenceInDays(new Date(task.endDate), new Date(task.startDate)) + 1)
          const bx = GL + off * CW, bw = Math.max(CW, dur * CW), bh = RH * 0.55, by = rowY + (RH - bh) / 2
          if (conflict) { doc.setDrawColor(245, 158, 11); doc.setLineWidth(0.4); doc.roundedRect(bx - 0.5, by - 0.5, bw + 1, bh + 1, 0.5, 0.5, 'S') }
          doc.setFillColor(bRgb.r, bRgb.g, bRgb.b); doc.roundedRect(bx, by, bw, bh, 0.5, 0.5, 'F')
          if (task.progress > 0 && task.progress < 100) { doc.setFillColor(Math.min(255, bRgb.r + 50), Math.min(255, bRgb.g + 50), Math.min(255, bRgb.b + 50)); doc.roundedRect(bx, by, bw * (task.progress / 100), bh, 0.5, 0.5, 'F') }
          if (bw > 8) { doc.setTextColor(255, 255, 255); doc.setFontSize(3.8); doc.setFont('helvetica', 'bold'); const mc = Math.floor(bw / 2); doc.text(task.name.length > mc ? task.name.substring(0, mc - 1) + '…' : task.name, bx + 1.5, by + bh * 0.72) }
          doc.setDrawColor(99, 102, 241); doc.setLineWidth(0.2); doc.line(todayX, rowY, todayX, rowY + RH)
          rowY += RH
        })
        rowY += 1.5
      })
      doc.addPage('a4', 'landscape')
      doc.setFillColor(99, 102, 241); doc.rect(0, 0, W, 14, 'F')
      doc.setTextColor(255, 255, 255); doc.setFontSize(10); doc.setFont('helvetica', 'bold')
      doc.text('KRONOZ — Detalle de Tareas', M, 9)
      autoTable(doc, {
        startY: 20,
        head: [['Tarea', 'Proyecto', 'Responsable', 'Inicio', 'Fin', 'Estado', 'Avance']],
        body: filteredTasks.map((t) => [t.name, (t as any).project?.name || '', (t as any).user?.name || '', format(new Date(t.startDate), 'dd/MM/yyyy'), format(new Date(t.endDate), 'dd/MM/yyyy'), getStatusLabel(t.status), `${t.progress}%`]),
        headStyles: { fillColor: [79, 82, 200], textColor: 255, fontSize: 7, fontStyle: 'bold' },
        bodyStyles: { fontSize: 7, textColor: [40, 45, 80] },
        alternateRowStyles: { fillColor: [242, 243, 252] },
        columnStyles: { 0: { cellWidth: 60 }, 1: { cellWidth: 50 }, 2: { cellWidth: 45 }, 3: { cellWidth: 25 }, 4: { cellWidth: 25 }, 5: { cellWidth: 28 }, 6: { cellWidth: 18 } },
        margin: { left: M, right: M },
      })
      doc.save('kronoz-gantt.pdf')
      toast.dismiss(tid); toast.success('PDF descargado')
    } catch (err) { console.error(err); toast.dismiss(tid); toast.error('Error al generar PDF') }
  }

  return (
    <div className="space-y-4 animate-fade-in">
      {selectedTask && <TaskDetailPopup task={selectedTask} users={users} projects={projects} onClose={() => setSelectedTask(null)} />}

      <div className="page-header">
        <div>
          <h1 className="page-title">Diagrama Gantt</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{filteredTasks.length} tareas visualizadas</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1 bg-gray-100 dark:bg-neutral-800 rounded-lg p-1">
            <button onClick={() => setGroupMode('user')} className={cn('px-2.5 py-1 rounded-md text-xs font-medium transition-all flex items-center gap-1', groupMode === 'user' ? 'bg-white dark:bg-neutral-700 text-gray-800 dark:text-white shadow-sm' : 'text-gray-500 hover:text-gray-700')}>
              <Users className="w-3 h-3" /> Por usuario
            </button>
            <button onClick={() => setGroupMode('project')} className={cn('px-2.5 py-1 rounded-md text-xs font-medium transition-all flex items-center gap-1', groupMode === 'project' ? 'bg-white dark:bg-neutral-700 text-gray-800 dark:text-white shadow-sm' : 'text-gray-500 hover:text-gray-700')}>
              <Folder className="w-3 h-3" /> Por proyecto
            </button>
          </div>
          <div className="flex items-center gap-1 bg-gray-100 dark:bg-neutral-800 rounded-lg p-1">
            {(['status', 'user', 'project'] as ColorMode[]).map((mode) => (
              <button key={mode} onClick={() => setColorMode(mode)} className={cn('px-2.5 py-1 rounded-md text-xs font-medium transition-all', colorMode === mode ? 'bg-white dark:bg-neutral-700 text-gray-800 dark:text-white shadow-sm' : 'text-gray-500 hover:text-gray-700')}>
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
        <span className="text-gray-400 italic">Clic en una barra para ver detalle</span>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <div style={{ minWidth: days.length * cellWidth + LABEL_W }}>
            <TimelineHeader />

            {/* VISTA POR USUARIO */}
            {groupMode === 'user' && groupedByUser.map(({ user, tasks: ut }) => (
              <div key={user.id} className="border-b border-gray-50 dark:border-neutral-800">
                <div className="flex items-center bg-gray-50/50 dark:bg-neutral-800/20 border-b border-gray-100 dark:border-neutral-800/50">
                  <div className="flex-shrink-0 px-3 py-2 flex items-center gap-2 border-r border-gray-100 dark:border-neutral-800" style={{ width: LABEL_W }}>
                    <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-semibold flex-shrink-0" style={{ backgroundColor: user.color || '#6366F1' }}>{getInitials(user.name)}</div>
                    <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">{user.name}</span>
                  </div>
                  <div className="flex-1 h-8 relative">
                    <div className="absolute top-0 bottom-0 w-px bg-brand-400 opacity-40 z-10" style={{ left: todayOffset }} />
                    {days.map((d, i) => isWeekend(d) ? <div key={d.toISOString()} className="absolute top-0 bottom-0 bg-gray-100 dark:bg-neutral-800/60" style={{ left: i * cellWidth, width: cellWidth }} /> : null)}
                  </div>
                </div>
                {ut.map((task) => {
                  const { left, width } = getPos(task)
                  const conflict = conflictIds.has(task.id)
                  const project = projects.find(p => p.id === task.projectId)
                  const barColor = getTaskColor(task, conflict)
                  return (
                    <div key={task.id} className="flex items-center hover:bg-gray-50/50 dark:hover:bg-neutral-800/10 transition-colors">
                      <div className="flex-shrink-0 px-3 py-2 border-r border-gray-100 dark:border-neutral-800" style={{ width: LABEL_W }}>
                        <div className="flex items-center gap-1.5">
                          {conflict && <AlertTriangle className="w-3 h-3 text-amber-500 flex-shrink-0" />}
                          <p className="text-xs text-gray-700 dark:text-gray-300" title={task.name}>{task.name}</p>
                        </div>
                        {project && <div className="flex items-center gap-1 mt-0.5"><div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: project.color }} /><p className="text-xs text-gray-400">{project.name}</p></div>}
                      </div>
                      <div className="flex-1 h-10 relative" style={{ minWidth: days.length * cellWidth }}>
                        {days.map((d, i) => isWeekend(d) ? <div key={d.toISOString()} className="absolute top-0 bottom-0 bg-gray-100/70 dark:bg-neutral-800/40" style={{ left: i * cellWidth, width: cellWidth }} /> : null)}
                        <div className="absolute top-0 bottom-0 w-px bg-brand-400 z-10" style={{ left: todayOffset }} />
                        <div className={cn('absolute top-1/2 -translate-y-1/2 rounded-md flex items-center px-2 overflow-hidden cursor-pointer hover:brightness-110 transition-all', conflict && 'ring-2 ring-amber-400')}
                          style={{ left: Math.max(0, left), width: Math.max(cellWidth * 1.5, width), height: 22, backgroundColor: barColor, opacity: task.status === 'TERMINADO' ? 0.7 : 1 }}
                          onClick={() => setSelectedTask(task)}
                          title="Clic para ver detalle">
                          <div className="absolute top-0 left-0 h-full rounded-md opacity-25 bg-white" style={{ width: `${task.progress}%` }} />
                          {cellWidth >= 28 && <span className="relative text-white text-xs font-medium truncate z-10">{task.name}</span>}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            ))}

            {/* VISTA POR PROYECTO */}
            {groupMode === 'project' && groupedByProject.map(({ project, tasks: pt }) => {
              const projBar = getProjectBar(project, pt)
              return (
                <div key={project.id} className="border-b border-gray-50 dark:border-neutral-800">
                  {/* Project header with summary bar */}
                  <div className="flex items-center border-b border-gray-100 dark:border-neutral-800/50" style={{ backgroundColor: `${project.color}12` }}>
                    <div className="flex-shrink-0 px-3 py-2.5 flex items-center gap-2 border-r border-gray-100 dark:border-neutral-800" style={{ width: LABEL_W }}>
                      <div className="w-3 h-3 rounded-sm flex-shrink-0" style={{ backgroundColor: project.color }} />
                      <span className="text-xs font-bold text-gray-800 dark:text-white">{project.name}</span>
                      <span className="text-[10px] text-gray-400 flex-shrink-0 ml-auto">{pt.length} tareas</span>
                    </div>
                    <div className="flex-1 h-11 relative" style={{ minWidth: days.length * cellWidth }}>
                      {days.map((d, i) => isWeekend(d) ? <div key={d.toISOString()} className="absolute top-0 bottom-0 bg-gray-100/50" style={{ left: i * cellWidth, width: cellWidth }} /> : null)}
                      <div className="absolute top-0 bottom-0 w-px bg-brand-400 opacity-40 z-10" style={{ left: todayOffset }} />
                      {projBar && (
                        <div className="absolute rounded-lg overflow-hidden"
                          style={{ left: projBar.left, width: projBar.width, height: 18, top: '50%', transform: 'translateY(-50%)', backgroundColor: project.color, opacity: 0.9, borderRadius: 6 }}>
                          <div className="h-full rounded-lg bg-white opacity-30" style={{ width: `${projBar.progress}%` }} />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Task rows — thin with assignee */}
                  {pt.map((task) => {
                    const { left, width } = getPos(task)
                    const conflict = conflictIds.has(task.id)
                    const user = users.find(u => u.id === task.userId)
                    const barColor = getTaskColor(task, conflict)
                    return (
                      <div key={task.id} className="flex items-center hover:bg-gray-50/50 dark:hover:bg-neutral-800/10 transition-colors">
                        <div className="flex-shrink-0 px-3 py-1.5 border-r border-gray-100 dark:border-neutral-800" style={{ width: LABEL_W }}>
                          <div className="flex items-center gap-1.5 pl-3">
                            {conflict && <AlertTriangle className="w-2.5 h-2.5 text-amber-500 flex-shrink-0" />}
                            <p className="text-xs text-gray-600 dark:text-gray-400">{task.name}</p>
                          </div>
                          {user && (
                            <div className="flex items-center gap-1 mt-0.5 pl-3">
                              <div className="w-3.5 h-3.5 rounded-full flex items-center justify-center text-white flex-shrink-0" style={{ backgroundColor: user.color || '#6366F1', fontSize: 7 }}>
                                {getInitials(user.name).charAt(0)}
                              </div>
                              <p className="text-[10px] text-gray-400">{user.name.split(' ')[0]}</p>
                            </div>
                          )}
                        </div>
                        <div className="flex-1 relative" style={{ height: 32, minWidth: days.length * cellWidth }}>
                          {days.map((d, i) => isWeekend(d) ? <div key={d.toISOString()} className="absolute top-0 bottom-0 bg-gray-100/70 dark:bg-neutral-800/40" style={{ left: i * cellWidth, width: cellWidth }} /> : null)}
                          <div className="absolute top-0 bottom-0 w-px bg-brand-400 z-10" style={{ left: todayOffset }} />
                          <div
                            className={cn('absolute rounded cursor-pointer hover:brightness-110 transition-all overflow-hidden', conflict && 'ring-1 ring-amber-400')}
                            style={{ left: Math.max(0, left), width: Math.max(cellWidth * 1.5, width), height: 10, top: '50%', transform: 'translateY(-50%)', backgroundColor: barColor, opacity: task.status === 'TERMINADO' ? 0.6 : 1, borderRadius: 4 }}
                            onClick={() => setSelectedTask(task)}
                            title={`${task.name} — clic para ver detalle`}>
                            <div className="absolute top-0 left-0 h-full bg-white opacity-25" style={{ width: `${task.progress}%` }} />
                            {cellWidth >= 28 && width > 40 && <span className="relative text-white text-[9px] font-medium px-1 truncate z-10 leading-none flex items-center h-full">{task.name}</span>}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )
            })}

            {(groupMode === 'user' ? groupedByUser : groupedByProject).length === 0 && (
              <div className="py-16 text-center"><p className="text-gray-500 text-sm">No hay tareas para mostrar</p></div>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center gap-3">
        <button onClick={() => setCurrentDate(subMonths(currentDate, 1))} className="btn-secondary">← Mes anterior</button>
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300 capitalize min-w-[120px] text-center">{format(currentDate, 'MMMM yyyy', { locale: es })}</span>
        <button onClick={() => setCurrentDate(addMonths(currentDate, 1))} className="btn-secondary">Mes siguiente →</button>
        {!isCurrentMonth && (
          <button onClick={() => setCurrentDate(new Date())} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-brand-50 dark:bg-brand-950/30 text-brand-600 dark:text-brand-400 hover:bg-brand-100 transition-colors">
            <CalendarCheck className="w-3.5 h-3.5" /> Hoy
          </button>
        )}
      </div>
    </div>
  )
}
