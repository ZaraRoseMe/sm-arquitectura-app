'use client'
// src/components/time/TimeEntryModal.tsx
import { useState } from 'react'
import { X, Clock, ChevronLeft, ChevronRight, Check } from 'lucide-react'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, startOfWeek, endOfWeek, isSameMonth, isToday, isSameDay, addMonths, subMonths } from 'date-fns'
import { es } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import toast from 'react-hot-toast'

interface DayEntry {
  date: string // YYYY-MM-DD
  hours: number
  minutes: number
  note: string
}

interface TimeEntryModalProps {
  taskId: string
  taskName: string
  onClose: () => void
  onSaved: (entries: any[]) => void
}

export default function TimeEntryModal({ taskId, taskName, onClose, onSaved }: TimeEntryModalProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDays, setSelectedDays] = useState<Record<string, DayEntry>>({})
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
    const key = dateStr(date)
    if (selectedDays[key]) {
      // Already selected — open editor
      setEditingDay(key)
    } else {
      // Select and open editor
      setSelectedDays(prev => ({
        ...prev,
        [key]: { date: key, hours: 0, minutes: 0, note: '' }
      }))
      setEditingDay(key)
    }
  }

  function removeDay(key: string) {
    setSelectedDays(prev => {
      const next = { ...prev }
      delete next[key]
      return next
    })
    if (editingDay === key) setEditingDay(null)
  }

  function updateDay(key: string, field: keyof DayEntry, value: any) {
    setSelectedDays(prev => ({
      ...prev,
      [key]: { ...prev[key], [field]: value }
    }))
  }

  function formatTime(h: number, m: number) {
    if (h === 0 && m === 0) return '—'
    if (h === 0) return `${m}min`
    if (m === 0) return `${h}h`
    return `${h}h ${m}min`
  }

  const totalMins = Object.values(selectedDays).reduce((sum, d) => sum + d.hours * 60 + d.minutes, 0)
  const totalHours = Math.floor(totalMins / 60)
  const totalMinutes = totalMins % 60

  async function handleSave() {
    const entries = Object.values(selectedDays)
    if (entries.length === 0) { toast.error('Selecciona al menos un día'); return }
    if (entries.some(e => e.hours === 0 && e.minutes === 0)) {
      toast.error('Ingresa el tiempo de cada día seleccionado')
      return
    }
    setLoading(true)
    try {
      const results = await Promise.all(entries.map(entry =>
        fetch('/api/time-entries', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ taskId, date: entry.date, hours: entry.hours, minutes: entry.minutes, note: entry.note || null }),
        }).then(r => r.json())
      ))
      toast.success(`${entries.length} registro${entries.length > 1 ? 's' : ''} guardado${entries.length > 1 ? 's' : ''}`)
      onSaved(results)
    } catch {
      toast.error('Error al guardar')
    }
    setLoading(false)
  }

  const editingEntry = editingDay ? selectedDays[editingDay] : null

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl w-full max-w-md animate-slide-up max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-neutral-800 sticky top-0 bg-white dark:bg-neutral-900">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-brand-600" />
            <div>
              <h2 className="font-semibold text-gray-900 dark:text-white text-sm">Registrar tiempo</h2>
              <p className="text-xs text-gray-400 truncate max-w-[220px]">{taskName}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-neutral-800 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
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
            {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map(d => (
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
              const isWeekend = day.getDay() === 0 || day.getDay() === 6

              return (
                <button key={key} onClick={() => isCurrentMonth && toggleDay(day)} disabled={!isCurrentMonth}
                  className={cn(
                    'relative flex flex-col items-center justify-center rounded-xl transition-all py-1.5 min-h-[44px]',
                    !isCurrentMonth && 'opacity-20 cursor-default',
                    isCurrentMonth && !isSelected && !isWeekend && 'hover:bg-gray-100 dark:hover:bg-neutral-800 cursor-pointer',
                    isCurrentMonth && !isSelected && isWeekend && 'hover:bg-gray-50 cursor-pointer',
                    isSelected && !isEditing && 'bg-brand-100 dark:bg-brand-950/50 ring-1 ring-brand-300',
                    isEditing && 'bg-brand-600 ring-2 ring-brand-600',
                    isToday(day) && !isSelected && 'ring-1 ring-brand-300',
                    isWeekend && !isSelected && 'bg-gray-50 dark:bg-neutral-800/30',
                  )}>
                  <span className={cn('text-xs font-medium',
                    isEditing ? 'text-white' :
                    isSelected ? 'text-brand-700 dark:text-brand-300' :
                    isToday(day) ? 'text-brand-600' :
                    isWeekend ? 'text-gray-400' : 'text-gray-700 dark:text-gray-300')}>
                    {format(day, 'd')}
                  </span>
                  {hasTime && (
                    <span className={cn('text-[8px] leading-none mt-0.5',
                      isEditing ? 'text-white/80' : 'text-brand-600 dark:text-brand-400')}>
                      {formatTime(entry.hours, entry.minutes)}
                    </span>
                  )}
                  {isSelected && !hasTime && (
                    <span className={cn('text-[8px] leading-none mt-0.5',
                      isEditing ? 'text-white/60' : 'text-brand-400')}>
                      —
                    </span>
                  )}
                </button>
              )
            })}
          </div>

          {/* Editor for selected day */}
          {editingDay && editingEntry && (
            <div className="bg-gray-50 dark:bg-neutral-800 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-gray-800 dark:text-white capitalize">
                  {format(new Date(editingDay + 'T12:00:00'), "EEEE d 'de' MMMM", { locale: es })}
                </span>
                <button onClick={() => removeDay(editingDay)}
                  className="text-xs text-red-500 hover:text-red-600 transition-colors">
                  Quitar día
                </button>
              </div>

              {/* Time inputs */}
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5">
                  <input type="number" min={0} max={23}
                    className="w-14 input text-center text-sm py-1.5"
                    value={editingEntry.hours}
                    onChange={e => updateDay(editingDay, 'hours', Math.max(0, parseInt(e.target.value) || 0))} />
                  <span className="text-xs text-gray-500">hrs</span>
                </div>
                <span className="text-gray-400">:</span>
                <div className="flex items-center gap-1.5">
                  <input type="number" min={0} max={59}
                    className="w-14 input text-center text-sm py-1.5"
                    value={editingEntry.minutes}
                    onChange={e => updateDay(editingDay, 'minutes', Math.max(0, Math.min(59, parseInt(e.target.value) || 0)))} />
                  <span className="text-xs text-gray-500">min</span>
                </div>
              </div>

              {/* Quick time buttons */}
              <div className="flex gap-1.5 flex-wrap">
                {[[0,30],[1,0],[2,0],[4,0],[8,0]].map(([h,m]) => (
                  <button key={`${h}${m}`} type="button"
                    onClick={() => { updateDay(editingDay, 'hours', h); updateDay(editingDay, 'minutes', m) }}
                    className={cn('text-xs px-2 py-1 rounded-lg transition-colors',
                      editingEntry.hours === h && editingEntry.minutes === m
                        ? 'bg-brand-600 text-white'
                        : 'bg-white dark:bg-neutral-700 text-gray-600 dark:text-gray-300 hover:bg-brand-50 hover:text-brand-600 border border-gray-200 dark:border-neutral-600')}>
                    {h > 0 ? `${h}h` : ''}{m > 0 ? `${m}min` : ''}
                  </button>
                ))}
              </div>

              {/* Note */}
              <textarea className="input resize-none text-sm" rows={2}
                value={editingEntry.note}
                onChange={e => updateDay(editingDay, 'note', e.target.value)}
                placeholder="¿Qué hiciste este día? (opcional)" />

              <button onClick={() => setEditingDay(null)}
                className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-brand-600 text-white text-sm hover:bg-brand-700 transition-colors">
                <Check className="w-3.5 h-3.5" /> Listo
              </button>
            </div>
          )}

          {/* Selected days summary */}
          {Object.keys(selectedDays).length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Días seleccionados</p>
              {Object.values(selectedDays).sort((a,b) => a.date.localeCompare(b.date)).map(entry => (
                <div key={entry.date}
                  onClick={() => setEditingDay(entry.date)}
                  className={cn('flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-colors',
                    editingDay === entry.date
                      ? 'bg-brand-50 dark:bg-brand-950/30 border border-brand-200'
                      : 'bg-gray-50 dark:bg-neutral-800 hover:bg-gray-100 dark:hover:bg-neutral-700')}>
                  <span className="text-xs text-gray-700 dark:text-gray-300 capitalize">
                    {format(new Date(entry.date + 'T12:00:00'), "EEE d MMM", { locale: es })}
                  </span>
                  <div className="flex items-center gap-2">
                    {entry.note && <span className="text-[10px] text-gray-400 truncate max-w-[80px]">{entry.note}</span>}
                    <span className={cn('text-xs font-semibold',
                      entry.hours === 0 && entry.minutes === 0 ? 'text-amber-500' : 'text-brand-600 dark:text-brand-400')}>
                      {formatTime(entry.hours, entry.minutes)}
                    </span>
                  </div>
                </div>
              ))}

              {totalMins > 0 && (
                <div className="flex justify-between items-center pt-1 border-t border-gray-100 dark:border-neutral-700">
                  <span className="text-xs text-gray-500">Total</span>
                  <span className="text-sm font-bold text-brand-600">{formatTime(totalHours, totalMinutes)}</span>
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button onClick={onClose} className="flex-1 btn-secondary">Cancelar</button>
            <button onClick={handleSave} disabled={loading || Object.keys(selectedDays).length === 0}
              className="flex-1 btn-primary flex items-center justify-center gap-2">
              {loading && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              Guardar {Object.keys(selectedDays).length > 0 ? `(${Object.keys(selectedDays).length} día${Object.keys(selectedDays).length > 1 ? 's' : ''})` : ''}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
