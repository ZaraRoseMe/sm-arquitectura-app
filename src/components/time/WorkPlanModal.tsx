'use client'
// src/components/time/WorkPlanModal.tsx
import { useState } from 'react'
import { X, CalendarCheck, ChevronLeft, ChevronRight, Check } from 'lucide-react'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, startOfWeek, endOfWeek, isSameMonth, isToday, isSameDay, addMonths, subMonths, isWeekend } from 'date-fns'
import { es } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import toast from 'react-hot-toast'

interface DayPlan {
  date: string
  hours: number
  minutes: number
  note: string
}

interface WorkPlanModalProps {
  tasks: { id: string; name: string; project?: { name: string } }[]
  users: { id: string; name: string; color?: string }[]
  onClose: () => void
  onSaved: (plans: any[]) => void
}

export default function WorkPlanModal({ tasks, users, onClose, onSaved }: WorkPlanModalProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedTaskId, setSelectedTaskId] = useState('')
  const [selectedUserId, setSelectedUserId] = useState('')
  const [selectedDays, setSelectedDays] = useState<Record<string, DayPlan>>({})
  const [editingDay, setEditingDay] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const calStart = startOfWeek(monthStart, { weekStartsOn: 1 })
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })
  const calDays = eachDayOfInterval({ start: calStart, end: calEnd })

  function dateStr(date: Date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
  }

  function toggleDay(date: Date) {
    if (isWeekend(date) || !isSameMonth(date, currentMonth)) return
    const key = dateStr(date)
    if (selectedDays[key]) {
      setEditingDay(key)
    } else {
      setSelectedDays(prev => ({ ...prev, [key]: { date: key, hours: 8, minutes: 0, note: '' } }))
      setEditingDay(key)
    }
  }

  function removeDay(key: string) {
    setSelectedDays(prev => { const n = { ...prev }; delete n[key]; return n })
    if (editingDay === key) setEditingDay(null)
  }

  function updateDay(key: string, field: keyof DayPlan, value: any) {
    setSelectedDays(prev => ({ ...prev, [key]: { ...prev[key], [field]: value } }))
  }

  function formatTime(h: number, m: number) {
    if (h === 0 && m === 0) return '—'
    if (h === 0) return `${m}min`
    if (m === 0) return `${h}h`
    return `${h}h ${m}min`
  }

  const totalMins = Object.values(selectedDays).reduce((s, d) => s + d.hours * 60 + d.minutes, 0)
  const selectedUser = users.find(u => u.id === selectedUserId)

  async function handleSave() {
    if (!selectedTaskId) { toast.error('Selecciona una tarea'); return }
    if (!selectedUserId) { toast.error('Selecciona un colaborador'); return }
    const entries = Object.values(selectedDays)
    if (entries.length === 0) { toast.error('Selecciona al menos un día'); return }

    setLoading(true)
    try {
      const results = await Promise.all(entries.map(entry =>
        fetch('/api/work-plans', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            taskId: selectedTaskId,
            userId: selectedUserId,
            date: entry.date,
            hours: entry.hours,
            minutes: entry.minutes,
            note: entry.note || null,
          }),
        }).then(r => r.json())
      ))
      toast.success(`${entries.length} día${entries.length > 1 ? 's' : ''} programado${entries.length > 1 ? 's' : ''} para ${selectedUser?.name}`)
      onSaved(results)
    } catch {
      toast.error('Error al programar')
    }
    setLoading(false)
  }

  const editingEntry = editingDay ? selectedDays[editingDay] : null

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl w-full max-w-md animate-slide-up max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}>

        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-neutral-800 sticky top-0 bg-white dark:bg-neutral-900">
          <div className="flex items-center gap-2">
            <CalendarCheck className="w-4 h-4 text-brand-600" />
            <h2 className="font-semibold text-gray-900 dark:text-white text-sm">Programar tiempo</h2>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-neutral-800 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Tarea */}
          <div>
            <label className="label">Tarea *</label>
            <select className="input" value={selectedTaskId} onChange={e => setSelectedTaskId(e.target.value)} required>
              <option value="">Seleccionar tarea</option>
              {tasks.map(t => (
                <option key={t.id} value={t.id}>{t.name} {t.project ? `· ${t.project.name}` : ''}</option>
              ))}
            </select>
          </div>

          {/* Colaborador */}
          <div>
            <label className="label">Colaborador *</label>
            <div className="flex flex-wrap gap-2">
              {users.map(u => (
                <button key={u.id} type="button"
                  onClick={() => setSelectedUserId(u.id)}
                  className={cn('flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium transition-all border',
                    selectedUserId === u.id
                      ? 'border-brand-400 bg-brand-50 dark:bg-brand-950/30 text-brand-700 dark:text-brand-300'
                      : 'border-gray-200 dark:border-neutral-700 text-gray-600 dark:text-gray-400 hover:border-brand-300')}>
                  <div className="w-5 h-5 rounded-full flex items-center justify-center text-white flex-shrink-0"
                    style={{ backgroundColor: u.color || '#6366F1', fontSize: 9 }}>
                    {u.name.charAt(0)}
                  </div>
                  {u.name.split(' ')[0]}
                </button>
              ))}
            </div>
          </div>

          {/* Calendar nav */}
          <div className="flex items-center justify-between">
            <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-neutral-800 transition-colors">
              <ChevronLeft className="w-4 h-4 text-gray-500" />
            </button>
            <span className="text-sm font-semibold text-gray-800 dark:text-white capitalize">
              {format(currentMonth, 'MMMM yyyy', { locale: es })}
            </span>
            <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-neutral-800 transition-colors">
              <ChevronRight className="w-4 h-4 text-gray-500" />
            </button>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 gap-1">
            {['L','M','X','J','V','S','D'].map(d => (
              <div key={d} className="text-center text-[10px] font-semibold text-gray-400 py-1">{d}</div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-1">
            {calDays.map(day => {
              const key = dateStr(day)
              const isSelected = !!selectedDays[key]
              const isCurrentMonth = isSameMonth(day, currentMonth)
              const isEditing = editingDay === key
              const entry = selectedDays[key]
              const hasTime = entry && (entry.hours > 0 || entry.minutes > 0)
              const weekend = isWeekend(day)

              return (
                <button key={key}
                  onClick={() => toggleDay(day)}
                  disabled={!isCurrentMonth || weekend}
                  className={cn(
                    'relative flex flex-col items-center justify-center rounded-xl transition-all py-1.5 min-h-[44px]',
                    (!isCurrentMonth || weekend) && 'opacity-20 cursor-default',
                    isCurrentMonth && !weekend && !isSelected && 'hover:bg-gray-100 dark:hover:bg-neutral-800 cursor-pointer',
                    isSelected && !isEditing && 'bg-emerald-100 dark:bg-emerald-950/50 ring-1 ring-emerald-300',
                    isEditing && 'bg-emerald-600 ring-2 ring-emerald-600',
                    isToday(day) && !isSelected && 'ring-1 ring-brand-300',
                  )}>
                  <span className={cn('text-xs font-medium',
                    isEditing ? 'text-white' :
                    isSelected ? 'text-emerald-700 dark:text-emerald-300' :
                    isToday(day) ? 'text-brand-600' : 'text-gray-700 dark:text-gray-300')}>
                    {format(day, 'd')}
                  </span>
                  {hasTime && (
                    <span className={cn('text-[8px] leading-none mt-0.5',
                      isEditing ? 'text-white/80' : 'text-emerald-600 dark:text-emerald-400')}>
                      {formatTime(entry.hours, entry.minutes)}
                    </span>
                  )}
                </button>
              )
            })}
          </div>

          {/* Editor */}
          {editingDay && editingEntry && (
            <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-gray-800 dark:text-white capitalize">
                  {format(new Date(editingDay + 'T12:00:00'), "EEEE d 'de' MMMM", { locale: es })}
                </span>
                <button onClick={() => removeDay(editingDay)} className="text-xs text-red-500 hover:text-red-600">Quitar</button>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5">
                  <input type="number" min={0} max={23} className="w-14 input text-center text-sm py-1.5"
                    value={editingEntry.hours}
                    onChange={e => updateDay(editingDay, 'hours', Math.max(0, parseInt(e.target.value) || 0))} />
                  <span className="text-xs text-gray-500">hrs</span>
                </div>
                <span className="text-gray-400">:</span>
                <div className="flex items-center gap-1.5">
                  <input type="number" min={0} max={59} className="w-14 input text-center text-sm py-1.5"
                    value={editingEntry.minutes}
                    onChange={e => updateDay(editingDay, 'minutes', Math.max(0, Math.min(59, parseInt(e.target.value) || 0)))} />
                  <span className="text-xs text-gray-500">min</span>
                </div>
              </div>

              <div className="flex gap-1.5 flex-wrap">
                {[[0,30],[1,0],[2,0],[4,0],[8,0]].map(([h,m]) => (
                  <button key={`${h}${m}`} type="button"
                    onClick={() => { updateDay(editingDay, 'hours', h); updateDay(editingDay, 'minutes', m) }}
                    className={cn('text-xs px-2 py-1 rounded-lg transition-colors border',
                      editingEntry.hours === h && editingEntry.minutes === m
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : 'bg-white dark:bg-neutral-700 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-neutral-600 hover:border-emerald-400')}>
                    {h > 0 ? `${h}h` : ''}{m > 0 ? `${m}min` : ''}
                  </button>
                ))}
              </div>

              <textarea className="input resize-none text-sm" rows={2}
                value={editingEntry.note}
                onChange={e => updateDay(editingDay, 'note', e.target.value)}
                placeholder="Nota para el colaborador (opcional)" />

              <button onClick={() => setEditingDay(null)}
                className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-emerald-600 text-white text-sm hover:bg-emerald-700 transition-colors">
                <Check className="w-3.5 h-3.5" /> Listo
              </button>
            </div>
          )}

          {/* Summary */}
          {Object.keys(selectedDays).length > 0 && (
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <p className="text-xs font-medium text-gray-500">{Object.keys(selectedDays).length} días programados</p>
                {totalMins > 0 && (
                  <span className="text-sm font-bold text-emerald-600">
                    Total: {formatTime(Math.floor(totalMins/60), totalMins%60)}
                  </span>
                )}
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <button onClick={onClose} className="flex-1 btn-secondary">Cancelar</button>
            <button onClick={handleSave} disabled={loading || !selectedTaskId || !selectedUserId || Object.keys(selectedDays).length === 0}
              className="flex-1 btn-primary flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700">
              {loading && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              Programar {Object.keys(selectedDays).length > 0 ? `(${Object.keys(selectedDays).length} días)` : ''}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
