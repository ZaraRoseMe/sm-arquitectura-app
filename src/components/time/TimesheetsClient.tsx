'use client'
// src/components/time/TimesheetsClient.tsx
import { useState, useMemo } from 'react'
import { Clock, Download, Trash2, Filter } from 'lucide-react'
import { format, startOfWeek, endOfWeek, eachWeekOfInterval, startOfMonth, endOfMonth, subMonths } from 'date-fns'
import { es } from 'date-fns/locale'
import { cn, getInitials } from '@/lib/utils'
import toast from 'react-hot-toast'

interface TimesheetsClientProps {
  entries: any[]
  projects: any[]
  users: any[]
  isAdmin: boolean
  currentUserId: string
}

function formatTime(hours: number, minutes: number) {
  if (hours === 0) return `${minutes}min`
  if (minutes === 0) return `${hours}h`
  return `${hours}h ${minutes}min`
}

function totalMinutes(entries: any[]) {
  return entries.reduce((sum, e) => sum + e.hours * 60 + e.minutes, 0)
}

function minutesToTime(mins: number) {
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return formatTime(h, m)
}

function toDateStr(date: any) {
  const d = new Date(date)
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, '0')
  const day = String(d.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export default function TimesheetsClient({ entries: initialEntries, projects, users, isAdmin, currentUserId }: TimesheetsClientProps) {
  const [entries, setEntries] = useState(initialEntries)
  const [projectFilter, setProjectFilter] = useState('ALL')
  const [userFilter, setUserFilter] = useState('ALL')
  const [monthFilter, setMonthFilter] = useState(() => format(new Date(), 'yyyy-MM'))

  const filtered = useMemo(() => entries.filter(e => {
    if (projectFilter !== 'ALL' && e.task?.project?.id !== projectFilter) return false
    if (userFilter !== 'ALL' && e.userId !== userFilter) return false
    const entryMonth = toDateStr(e.date).substring(0, 7)
    if (monthFilter && entryMonth !== monthFilter) return false
    return true
  }), [entries, projectFilter, userFilter, monthFilter])

  // Group by project
  const byProject = useMemo(() => {
    const g: Record<string, { project: any; entries: any[]; total: number }> = {}
    filtered.forEach(e => {
      const pid = e.task?.project?.id || 'sin-proyecto'
      if (!g[pid]) g[pid] = { project: e.task?.project, entries: [], total: 0 }
      g[pid].entries.push(e)
      g[pid].total += e.hours * 60 + e.minutes
    })
    return Object.values(g).sort((a, b) => b.total - a.total)
  }, [filtered])

  // Group by user (for admin)
  const byUser = useMemo(() => {
    const g: Record<string, { user: any; total: number }> = {}
    filtered.forEach(e => {
      const uid = e.userId
      if (!g[uid]) g[uid] = { user: e.user, total: 0 }
      g[uid].total += e.hours * 60 + e.minutes
    })
    return Object.values(g).sort((a, b) => b.total - a.total)
  }, [filtered])

  const grandTotal = totalMinutes(filtered)
  const maxUserMinutes = Math.max(...byUser.map(u => u.total), 1)

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
      doc.text(`${monthFilter} · Total: ${minutesToTime(grandTotal)}`, W - M - 40, 9)

      autoTable(doc, {
        startY: 20,
        head: [['Fecha', 'Proyecto', 'Tarea', 'Colaborador', 'Tiempo', 'Nota']],
        body: filtered.map(e => [
          toDateStr(e.date),
          e.task?.project?.name || '',
          e.task?.name || '',
          e.user?.name || '',
          formatTime(e.hours, e.minutes),
          e.note || '',
        ]),
        headStyles: { fillColor: [79, 82, 200], textColor: 255, fontSize: 7, fontStyle: 'bold' },
        bodyStyles: { fontSize: 7, textColor: [40, 45, 80] },
        alternateRowStyles: { fillColor: [242, 243, 252] },
        columnStyles: { 0: { cellWidth: 22 }, 1: { cellWidth: 45 }, 2: { cellWidth: 55 }, 3: { cellWidth: 40 }, 4: { cellWidth: 22 }, 5: { cellWidth: 60 } },
        margin: { left: M, right: M },
      })

      doc.save(`kronoz-tiempos-${monthFilter}.pdf`)
      toast.dismiss(tid); toast.success('PDF descargado')
    } catch (err) {
      toast.dismiss(tid); toast.error('Error al generar PDF')
    }
  }

  async function handleExportExcel() {
    const tid = toast.loading('Generando Excel...')
    try {
      const { default: ExcelJS } = await import('exceljs')
      const wb = new ExcelJS.Workbook()
      const ws = wb.addWorksheet('Tiempos')

      ws.columns = [
        { header: 'Fecha', key: 'date', width: 14 },
        { header: 'Proyecto', key: 'project', width: 25 },
        { header: 'Tarea', key: 'task', width: 35 },
        { header: 'Colaborador', key: 'user', width: 22 },
        { header: 'Horas', key: 'hours', width: 8 },
        { header: 'Minutos', key: 'minutes', width: 10 },
        { header: 'Tiempo', key: 'time', width: 12 },
        { header: 'Nota', key: 'note', width: 40 },
      ]

      ws.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } }
      ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF6366F1' } }

      filtered.forEach(e => {
        ws.addRow({
          date: toDateStr(e.date),
          project: e.task?.project?.name || '',
          task: e.task?.name || '',
          user: e.user?.name || '',
          hours: e.hours,
          minutes: e.minutes,
          time: formatTime(e.hours, e.minutes),
          note: e.note || '',
        })
      })

      // Total row
      const totalRow = ws.addRow({ date: 'TOTAL', time: minutesToTime(grandTotal) })
      totalRow.font = { bold: true }
      totalRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E7FF' } }

      const buf = await wb.xlsx.writeBuffer()
      const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a'); a.href = url; a.download = `kronoz-tiempos-${monthFilter}.xlsx`; a.click()
      URL.revokeObjectURL(url)
      toast.dismiss(tid); toast.success('Excel descargado')
    } catch (err) {
      toast.dismiss(tid); toast.error('Error al generar Excel')
    }
  }

  // Month options — last 6 months
  const monthOptions = Array.from({ length: 6 }, (_, i) => {
    const d = subMonths(new Date(), i)
    return { value: format(d, 'yyyy-MM'), label: format(d, 'MMMM yyyy', { locale: es }) }
  })

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Tiempos</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Total: <span className="font-semibold text-gray-800 dark:text-white">{minutesToTime(grandTotal)}</span>
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleExportExcel} className="btn-secondary flex items-center gap-2 text-sm">
            <Download className="w-4 h-4" /> Excel
          </button>
          <button onClick={handleExportPDF} className="btn-secondary flex items-center gap-2 text-sm">
            <Download className="w-4 h-4" /> PDF
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <select value={monthFilter} onChange={e => setMonthFilter(e.target.value)} className="input w-48 capitalize">
          {monthOptions.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
        </select>
        <select value={projectFilter} onChange={e => setProjectFilter(e.target.value)} className="input w-48">
          <option value="ALL">Todos los proyectos</option>
          {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        {isAdmin && (
          <select value={userFilter} onChange={e => setUserFilter(e.target.value)} className="input w-44">
            <option value="ALL">Todos los usuarios</option>
            {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
        )}
      </div>

      {/* Charts — hours by user */}
      {byUser.length > 0 && (
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Horas por colaborador</h2>
          <div className="space-y-3">
            {byUser.map(({ user, total }) => (
              <div key={user.id} className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-semibold flex-shrink-0"
                  style={{ backgroundColor: user.color || '#6366F1' }}>
                  {getInitials(user.name)}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{user.name}</span>
                    <span className="text-xs text-gray-500">{minutesToTime(total)}</span>
                  </div>
                  <div className="h-2 bg-gray-100 dark:bg-neutral-700 rounded-full overflow-hidden">
                    <div className="h-full rounded-full bg-brand-500 transition-all duration-700"
                      style={{ width: `${(total / maxUserMinutes) * 100}%`, backgroundColor: user.color || '#6366F1' }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* By project */}
      <div className="space-y-4">
        {byProject.map(({ project, entries: pEntries, total }) => (
          <div key={project?.id || 'sin'} className="card overflow-hidden">
            {/* Project header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 dark:border-neutral-800"
              style={{ backgroundColor: project?.color ? `${project.color}12` : undefined }}>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: project?.color || '#6366F1' }} />
                <span className="font-semibold text-sm text-gray-800 dark:text-white">{project?.name || 'Sin proyecto'}</span>
                <span className="text-xs text-gray-400">{pEntries.length} registros</span>
              </div>
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">{minutesToTime(total)}</span>
            </div>

            {/* Entries table */}
            <div className="divide-y divide-gray-50 dark:divide-neutral-800">
              {pEntries.map(entry => (
                <div key={entry.id} className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50/50 dark:hover:bg-neutral-800/20 group">
                  <div className="w-20 flex-shrink-0">
                    <span className="text-xs text-gray-500">{toDateStr(entry.date)}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-700 dark:text-gray-300 truncate">{entry.task?.name}</p>
                    {entry.note && <p className="text-xs text-gray-400 truncate mt-0.5">{entry.note}</p>}
                  </div>
                  {isAdmin && (
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <div className="w-5 h-5 rounded-full flex items-center justify-center text-white flex-shrink-0"
                        style={{ backgroundColor: entry.user?.color || '#6366F1', fontSize: 9 }}>
                        {getInitials(entry.user?.name || '')}
                      </div>
                      <span className="text-xs text-gray-400">{entry.user?.name?.split(' ')[0]}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-sm font-semibold text-gray-700 dark:text-gray-300 w-16 text-right">
                      {formatTime(entry.hours, entry.minutes)}
                    </span>
                    {(entry.userId === currentUserId || isAdmin) && (
                      <button onClick={() => handleDelete(entry.id)}
                        className="opacity-0 group-hover:opacity-100 w-6 h-6 flex items-center justify-center rounded text-gray-400 hover:text-red-500 transition-all">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="py-16 text-center">
            <Clock className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No hay registros de tiempo para este período</p>
          </div>
        )}
      </div>
    </div>
  )
}
