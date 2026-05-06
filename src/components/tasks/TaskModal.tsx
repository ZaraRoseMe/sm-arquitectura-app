'use client'
// src/components/tasks/TaskModal.tsx
import { useState, useEffect } from 'react'
import { X, Plus, Clock, CalendarCheck, ChevronLeft, ChevronRight, Check } from 'lucide-react'
import { formatDateInput } from '@/lib/utils'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, startOfWeek, endOfWeek, isSameMonth, isToday, isSameDay, addMonths, subMonths, isWeekend } from 'date-fns'
import { es } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import toast from 'react-hot-toast'
import type { Task, Project, User } from '@/types'

interface DescriptionEntry {
  text: string
  createdAt: string
  authorName: string
}

interface WorkDay {
  date: string
  hours: number
  minutes: number
}

interface TaskModalProps {
  task: Task | null
  projects: any[]   // árbol de proyectos con children
  users: User[]
  isAdmin: boolean
  currentUserId: string
  currentUserName: string
  onClose: () => void
  onSave: (data: any) => Promise<boolean>
}

function parseDescriptionEntries(raw?: string | null): DescriptionEntry[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) return parsed
    return [{ text: raw, createdAt: new Date().toISOString(), authorName: '' }]
  } catch {
    return [{ text: raw, createdAt: new Date().toISOString(), authorName: '' }]
  }
}

function dateStr(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

// Aplana el árbol de proyectos con profundidad para el selector jerárquico
function flattenProjects(projects: any[], depth = 0): { project: any; depth: number }[] {
  return projects.flatMap(p => [
    { project: p, depth },
    ...flattenProjects(p.children || [], depth + 1),
  ])
}

export default function TaskModal({ task, projects, users, isAdmin, currentUserId, currentUserName, onClose, onSave }: TaskModalProps) {
  const existingEntries = parseDescriptionEntries((task as any)?.description)

  const [form, setForm] = useState({
    name: task?.name || '',
    startDate: task ? formatDateInput(task.startDate) : '',
    endDate: task ? formatDateInput(task.endDate) : '',
    status: task?.status || 'PENDIENTE',
    progress: task?.progress || 0,
    projectId: task?.projectId || '',
    userId: task?.userId || (isAdmin ? '' : currentUserId),
  })
  const [newEntry, setNewEntry] = useState('')
  const [entries, setEntries] = useState<DescriptionEntry[]>(existingEntries)
  const [loading, setLoading] = useState(false)

  // Work plan state
  const [showWorkPlan, setShowWorkPlan] = useState(false)
  const [workCalMonth, setWorkCalMonth] = useState(new Date())
  const [workDays, setWorkDays] = useState<Record<string, WorkDay>>({})
  const [editingWorkDay, setEditingWorkDay] = useState<string | null>(null)
  const [existingPlans, setExistingPlans] = useState<any[]>([])
  const [otherUserPlans, setOtherUserPlans] = useState<any[]>([])

  useEffect(() => {
    const uid = form.userId
    if (!uid || !showWorkPlan) return

    Promise.all([
      task ? fetch(`/api/work-plans?userId=${uid}`).then(r => r.json()) : Promise.resolve([]),
    ]).then(([allUserPlans]) => {
      if (task) {
        const thisTaskPlans = allUserPlans.filter((p: any) => p.taskId === task.id)
        const otherPlans = allUserPlans.filter((p: any) => p.taskId !== task.id)
        const existing: Record<string, WorkDay> = {}
        thisTaskPlans.forEach((p: any) => {
          const key = new Date(p.date).toISOString().substring(0, 10)
          existing[key] = { date: key, hours: p.hours, minutes: p.minutes }
        })
        setWorkDays(existing)
        setExistingPlans(thisTaskPlans)
        setOtherUserPlans(otherPlans)
      } else {
        setOtherUserPlans(allUserPlans)
      }
    }).catch(() => {})
  }, [form.userId, showWorkPlan])

  function toggleWorkDay(date: Date) {
    if (isWeekend(date) || !isSameMonth(date, workCalMonth)) return
    const key = dateStr(date)
    if (workDays[key]) {
      setEditingWorkDay(key)
    } else {
      setWorkDays(prev => ({ ...prev, [key]: { date: key, hours: 8, minutes: 0 } }))
      setEditingWorkDay(key)
    }
  }

  function removeWorkDay(key: string) {
    setWorkDays(prev => { const n = { ...prev }; delete n[key]; return n })
    if (editingWorkDay === key) setEditingWorkDay(null)
  }

  function updateWorkDay(key: string, field: 'hours' | 'minutes', value: number) {
    setWorkDays(prev => ({ ...prev, [key]: { ...prev[key], [field]: value } }))
  }

  function formatTime(h: number, m: number) {
    if (h === 0 && m === 0) return '—'
    if (h === 0) return `${m}min`
    if (m === 0) return `${h}h`
    return `${h}h ${m}min`
  }

  function isBusyDay(date: Date): boolean {
    const key = dateStr(date)
    return otherUserPlans.some((p: any) => new Date(p.date).toISOString().substring(0, 10) === key)
  }

  const totalWorkMins = Object.values(workDays).reduce((s, d) => s + d.hours * 60 + d.minutes, 0)

  function addEntry() {
    if (!newEntry.trim()) return
    const entry: DescriptionEntry = {
      text: newEntry.trim(),
      createdAt: new Date().toISOString(),
      authorName: currentUserName,
    }
    setEntries(prev => [...prev, entry])
    setNewEntry('')
  }

  async function saveWorkPlans(taskId: string) {
    if (Object.keys(workDays).length === 0) return
    if (existingPlans.length > 0) {
      await Promise.all(existingPlans.map(p =>
        fetch(`/api/work-plans/${p.id}`, { method: 'DELETE' })
      ))
    }
    await Promise.all(Object.values(workDays).map(day =>
      fetch('/api/work-plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskId, userId: form.userId,
          date: day.date, hours: day.hours, minutes: day.minutes,
        }),
      })
    ))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const success = await onSave({
      ...form,
      description: entries.length > 0 ? JSON.stringify(entries) : '',
    })
    if (success && isAdmin && Object.keys(workDays).length > 0) {
      const taskId = task?.id || ''
      if (taskId) await saveWorkPlans(taskId)
    }
    setLoading(false)
  }

  const calDays = eachDayOfInterval({
    start: startOfWeek(startOfMonth(workCalMonth), { weekStartsOn: 1 }),
    end: endOfWeek(endOfMonth(workCalMonth), { weekStartsOn: 1 }),
  })

  const selectedUser = users.find(u => u.id === form.userId)
  const flatProjects = flattenProjects(projects)

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl w-full max-w-lg animate-slide-up max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-neutral-800 sticky top-0 bg-white dark:bg-neutral-900">
          <h2 className="font-semibold text-gray-900 dark:text-white">{task ? 'Editar tarea' : 'Nueva tarea'}</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-neutral-800 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Name */}
          <div>
            <label className="label">Nombre de la tarea *</label>
            <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Ej: Diseño arquitectónico" required />
          </div>

          {/* Description */}
          <div>
            <label className="label">Descripción / Actualizaciones</label>
            {entries.length > 0 && (
              <div className="mb-3 space-y-2 max-h-40 overflow-y-auto">
                {entries.map((entry, i) => (
                  <div key={i} className="bg-gray-50 dark:bg-neutral-800 rounded-xl px-3 py-2.5 border border-gray-100 dark:border-neutral-700">
                    <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed">{entry.text}</p>
                    <div className="flex items-center gap-1.5 mt-1.5">
                      <Clock className="w-3 h-3 text-gray-400" />
                      <p className="text-[10px] text-gray-400">
                        {entry.authorName && <span className="font-medium">{entry.authorName} · </span>}
                        {format(new Date(entry.createdAt), "dd MMM yyyy 'a las' HH:mm", { locale: es })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <textarea className="input resize-none flex-1 text-sm" rows={2} value={newEntry}
                onChange={(e) => setNewEntry(e.target.value)}
                placeholder={entries.length > 0 ? 'Agregar actualización...' : 'Descripción de la tarea...'}
                onKeyDown={(e) => { if (e.key === 'Enter' && e.metaKey) addEntry() }} />
              <button type="button" onClick={addEntry} disabled={!newEntry.trim()}
                className="flex-shrink-0 w-9 h-9 mt-1 flex items-center justify-center rounded-xl bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-40 transition-colors">
                <Plus className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-1">Cada entrada queda registrada con fecha y hora.</p>
          </div>

          {/* Project — selector jerárquico con indentación */}
          <div>
            <label className="label">Proyecto *</label>
            <select className="input" value={form.projectId}
              onChange={(e) => setForm({ ...form, projectId: e.target.value })} required>
              <option value="">Seleccionar proyecto</option>
              {flatProjects.map(({ project: p, depth }) => (
                <option key={p.id} value={p.id} style={{ paddingLeft: depth * 16 }}>
                  {depth > 0 ? '\u00A0'.repeat(depth * 3) + '└ ' : ''}{p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Assign */}
          {isAdmin && (
            <div>
              <label className="label">Asignar a *</label>
              <select className="input" value={form.userId}
                onChange={(e) => { setForm({ ...form, userId: e.target.value }); setWorkDays({}); setEditingWorkDay(null) }} required>
                <option value="">Seleccionar colaborador</option>
                {users.map((u) => <option key={u.id} value={u.id}>{u.name} ({u.role === 'ADMIN' ? 'Admin' : u.role === 'COORDINADOR' ? 'Coordinador' : 'Colaborador'})</option>)}
              </select>
            </div>
          )}

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Fecha inicio *</label>
              <input type="date" className="input" value={form.startDate}
                onChange={(e) => setForm({ ...form, startDate: e.target.value })} required />
            </div>
            <div>
              <label className="label">Fecha fin *</label>
              <input type="date" className="input" value={form.endDate} min={form.startDate}
                onChange={(e) => setForm({ ...form, endDate: e.target.value })} required />
            </div>
          </div>

          {/* Status + Progress */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Estado</label>
              <select className="input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as any })}>
                <option value="PENDIENTE">Pendiente</option>
                <option value="EN_PROGRESO">En Progreso</option>
                <option value="PAUSADO">Pausado</option>
                <option value="TERMINADO">Terminado</option>
              </select>
            </div>
            <div>
              <label className="label">Progreso ({form.progress}%)</label>
              <input type="range" min={0} max={100} step={5} value={form.progress}
                onChange={(e) => setForm({ ...form, progress: parseInt(e.target.value) })}
                className="w-full mt-2 accent-brand-600" />
            </div>
          </div>

          {/* Work Plan Calendar */}
          {isAdmin && form.userId && (
            <div className="border border-gray-100 dark:border-neutral-800 rounded-xl overflow-hidden">
              <button type="button"
                onClick={() => setShowWorkPlan(!showWorkPlan)}
                className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-neutral-800 transition-colors">
                <div className="flex items-center gap-2">
                  <CalendarCheck className="w-4 h-4 text-emerald-500" />
                  <span>Programar días de trabajo</span>
                  {Object.keys(workDays).length > 0 && (
                    <span className="text-xs bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 px-2 py-0.5 rounded-full">
                      {Object.keys(workDays).length} días · {formatTime(Math.floor(totalWorkMins/60), totalWorkMins%60)}
                    </span>
                  )}
                </div>
                <span className="text-xs text-gray-400">{showWorkPlan ? '▲' : '▼'}</span>
              </button>

              {showWorkPlan && (
                <div className="p-4 border-t border-gray-100 dark:border-neutral-800 space-y-3">
                  <div className="flex items-center gap-4 text-[10px] text-gray-500">
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 rounded-sm bg-emerald-500 opacity-80" />
                      <span>Programado aquí</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 rounded-sm bg-amber-400 opacity-60" />
                      <span>Ocupado (otra tarea)</span>
                    </div>
                    {selectedUser && (
                      <div className="flex items-center gap-1.5">
                        <div className="w-4 h-4 rounded-full flex items-center justify-center text-white flex-shrink-0"
                          style={{ backgroundColor: (selectedUser as any).color || '#6366F1', fontSize: 8 }}>
                          {selectedUser.name.charAt(0)}
                        </div>
                        <span>{selectedUser.name.split(' ')[0]}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between">
                    <button type="button" onClick={() => setWorkCalMonth(subMonths(workCalMonth, 1))}
                      className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-neutral-800">
                      <ChevronLeft className="w-4 h-4 text-gray-500" />
                    </button>
                    <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 capitalize">
                      {format(workCalMonth, 'MMMM yyyy', { locale: es })}
                    </span>
                    <button type="button" onClick={() => setWorkCalMonth(addMonths(workCalMonth, 1))}
                      className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-neutral-800">
                      <ChevronRight className="w-4 h-4 text-gray-500" />
                    </button>
                  </div>

                  <div className="grid grid-cols-7 gap-0.5">
                    {['L','M','X','J','V','S','D'].map(d => (
                      <div key={d} className="text-center text-[9px] font-semibold text-gray-400 py-0.5">{d}</div>
                    ))}
                  </div>

                  <div className="grid grid-cols-7 gap-0.5">
                    {calDays.map(day => {
                      const key = dateStr(day)
                      const isCurrentMonth = isSameMonth(day, workCalMonth)
                      const isSelected = !!workDays[key]
                      const isEditing = editingWorkDay === key
                      const busy = isBusyDay(day)
                      const weekend = isWeekend(day)
                      const entry = workDays[key]

                      return (
                        <button key={key} type="button"
                          onClick={() => isCurrentMonth && !weekend && toggleWorkDay(day)}
                          disabled={!isCurrentMonth || weekend}
                          className={cn(
                            'relative flex flex-col items-center justify-center rounded-lg transition-all py-1 min-h-[36px]',
                            (!isCurrentMonth || weekend) && 'opacity-20 cursor-default',
                            isCurrentMonth && !weekend && !isSelected && !busy && 'hover:bg-gray-100 dark:hover:bg-neutral-800 cursor-pointer',
                            busy && !isSelected && 'bg-amber-50 dark:bg-amber-950/20 cursor-pointer',
                            isSelected && !isEditing && 'bg-emerald-100 dark:bg-emerald-950/50 ring-1 ring-emerald-400',
                            isEditing && 'bg-emerald-500 ring-2 ring-emerald-500',
                            isToday(day) && !isSelected && 'ring-1 ring-brand-300',
                          )}>
                          <span className={cn('text-[10px] font-medium',
                            isEditing ? 'text-white' :
                            isSelected ? 'text-emerald-700 dark:text-emerald-300' :
                            busy ? 'text-amber-600' :
                            isToday(day) ? 'text-brand-600' : 'text-gray-600 dark:text-gray-400')}>
                            {format(day, 'd')}
                          </span>
                          {entry && (
                            <span className={cn('text-[7px] leading-none',
                              isEditing ? 'text-white/80' : 'text-emerald-600')}>
                              {formatTime(entry.hours, entry.minutes)}
                            </span>
                          )}
                        </button>
                      )
                    })}
                  </div>

                  {editingWorkDay && workDays[editingWorkDay] && (
                    <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 rounded-xl p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 capitalize">
                          {format(new Date(editingWorkDay + 'T12:00:00'), "EEE d 'de' MMMM", { locale: es })}
                        </span>
                        <button type="button" onClick={() => removeWorkDay(editingWorkDay)}
                          className="text-[10px] text-red-500 hover:text-red-600">Quitar</button>
                      </div>
                      <div className="flex items-center gap-2">
                        <input type="number" min={0} max={23} className="w-12 input text-center text-xs py-1"
                          value={workDays[editingWorkDay].hours}
                          onChange={e => updateWorkDay(editingWorkDay, 'hours', Math.max(0, parseInt(e.target.value) || 0))} />
                        <span className="text-xs text-gray-400">h</span>
                        <input type="number" min={0} max={59} className="w-12 input text-center text-xs py-1"
                          value={workDays[editingWorkDay].minutes}
                          onChange={e => updateWorkDay(editingWorkDay, 'minutes', Math.max(0, Math.min(59, parseInt(e.target.value) || 0)))} />
                        <span className="text-xs text-gray-400">min</span>
                        <div className="flex gap-1 ml-1">
                          {[[4,0],[8,0],[9,0]].map(([h,m]) => (
                            <button key={`${h}${m}`} type="button"
                              onClick={() => { updateWorkDay(editingWorkDay, 'hours', h); updateWorkDay(editingWorkDay, 'minutes', m) }}
                              className="text-[10px] px-1.5 py-0.5 rounded bg-white dark:bg-neutral-700 border border-gray-200 dark:border-neutral-600 text-gray-600 hover:border-emerald-400">
                              {h}h
                            </button>
                          ))}
                        </div>
                      </div>
                      <button type="button" onClick={() => setEditingWorkDay(null)}
                        className="w-full flex items-center justify-center gap-1 py-1 rounded-lg bg-emerald-500 text-white text-xs hover:bg-emerald-600">
                        <Check className="w-3 h-3" /> Listo
                      </button>
                    </div>
                  )}

                  {Object.keys(workDays).length > 0 && (
                    <p className="text-xs text-center text-emerald-600 font-medium">
                      {Object.keys(workDays).length} días · Total: {formatTime(Math.floor(totalWorkMins/60), totalWorkMins%60)}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 btn-secondary">Cancelar</button>
            <button type="submit" disabled={loading} className="flex-1 btn-primary flex items-center justify-center gap-2">
              {loading && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              {task ? 'Actualizar' : 'Crear tarea'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
