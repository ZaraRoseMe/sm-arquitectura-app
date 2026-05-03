'use client'
// src/components/tasks/ConflictModal.tsx
import { useState } from 'react'
import { AlertTriangle, X, Zap, RefreshCw, UserX, PauseCircle, Calendar } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { eachDayOfInterval, format, isSameDay, isWithinInterval, differenceInDays } from 'date-fns'
import { es } from 'date-fns/locale'
import toast from 'react-hot-toast'
import type { User } from '@/types'

interface ConflictModalProps {
  conflicts: any[]
  taskData: any
  users: User[]
  onResolve: (action: string, taskData: any) => void
  onClose: () => void
}

// Mini timeline showing occupied days
function MiniTimeline({ conflicts, newTask }: { conflicts: any[]; newTask: any }) {
  const allDates = [
    ...conflicts.map((c) => new Date(c.startDate)),
    ...conflicts.map((c) => new Date(c.endDate)),
    new Date(newTask.startDate),
    new Date(newTask.endDate),
  ]
  const minDate = new Date(Math.min(...allDates.map((d) => d.getTime())))
  const maxDate = new Date(Math.max(...allDates.map((d) => d.getTime())))
  const days = eachDayOfInterval({ start: minDate, end: maxDate })

  // Limit to 42 days for display
  const displayDays = days.slice(0, 42)

  const STATUS_COLORS: Record<string, string> = {
    PENDIENTE: '#9CA3AF',
    EN_PROGRESO: '#3B82F6',
    PAUSADO: '#F59E0B',
    TERMINADO: '#10B981',
  }

  return (
    <div className="mt-3 mb-1">
      <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-1">
        <Calendar className="w-3 h-3" /> Línea de tiempo
      </p>
      <div className="bg-gray-50 dark:bg-neutral-800 rounded-xl p-3">
        {/* Legend */}
        <div className="flex items-center gap-3 mb-2 flex-wrap">
          {conflicts.map((c) => (
            <div key={c.id} className="flex items-center gap-1">
              <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: STATUS_COLORS[c.status] || '#9CA3AF' }} />
              <span className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[80px]">{c.name}</span>
            </div>
          ))}
          <div className="flex items-center gap-1">
            <div className="w-2.5 h-2.5 rounded-sm bg-red-400" />
            <span className="text-xs text-gray-500 dark:text-gray-400">Nueva tarea</span>
          </div>
        </div>

        {/* Day grid */}
        <div className="flex flex-wrap gap-0.5">
          {displayDays.map((day, i) => {
            const isNew = isWithinInterval(day, {
              start: new Date(newTask.startDate),
              end: new Date(newTask.endDate),
            })
            const conflictMatch = conflicts.find((c) =>
              isWithinInterval(day, {
                start: new Date(c.startDate),
                end: new Date(c.endDate),
              })
            )
            const isOverlap = isNew && conflictMatch
            const isToday = isSameDay(day, new Date())

            let bg = 'bg-gray-200 dark:bg-neutral-700'
            if (isOverlap) bg = 'bg-red-500'
            else if (isNew) bg = 'bg-red-300'
            else if (conflictMatch) bg = ''

            return (
              <div
                key={i}
                title={format(day, 'dd MMM', { locale: es })}
                className={`w-4 h-4 rounded-sm flex-shrink-0 ${bg} ${isToday ? 'ring-1 ring-brand-500' : ''}`}
                style={!bg.includes('bg-') && conflictMatch ? { backgroundColor: STATUS_COLORS[conflictMatch.status] || '#9CA3AF' } : undefined}
              />
            )
          })}
        </div>

        <div className="flex justify-between mt-1.5">
          <span className="text-xs text-gray-400">{format(minDate, 'dd MMM', { locale: es })}</span>
          <span className="text-xs text-gray-400 text-center text-red-500 font-medium">■ solapamiento</span>
          <span className="text-xs text-gray-400">{format(maxDate, 'dd MMM', { locale: es })}</span>
        </div>
      </div>
    </div>
  )
}

export default function ConflictModal({ conflicts, taskData, users, onResolve, onClose }: ConflictModalProps) {
  const [pauseMode, setPauseMode] = useState(false)
  const [selectedConflict, setSelectedConflict] = useState<any>(null)
  const [newEndDate, setNewEndDate] = useState('')
  const [pauseLoading, setPauseLoading] = useState(false)

  const conflictingUser = users.find((u) => u.id === taskData.userId)

  async function handlePauseAndReschedule() {
    if (!selectedConflict || !newEndDate) {
      toast.error('Selecciona una tarea y una nueva fecha fin')
      return
    }
    setPauseLoading(true)
    try {
      // Pause the conflicting task
      const pauseRes = await fetch(`/api/tasks/${selectedConflict.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'PAUSADO',
          endDate: newEndDate,
          pauseReason: 'Reprogramada por conflicto de horarios',
        }),
      })

      if (!pauseRes.ok) {
        toast.error('Error al pausar la tarea')
        setPauseLoading(false)
        return
      }

      toast.success(`"${selectedConflict.name}" pausada y reprogramada`)
      // Now force-create the new task
      onResolve('force', taskData)
    } catch {
      toast.error('Error al procesar')
    }
    setPauseLoading(false)
  }

  return (
    <div className="modal-backdrop z-60" onClick={onClose}>
      <div
        className="bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl w-full max-w-md animate-slide-up max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100 dark:border-neutral-800 bg-amber-50 dark:bg-amber-950/20 rounded-t-2xl sticky top-0">
          <div className="w-9 h-9 bg-amber-100 dark:bg-amber-900/30 rounded-xl flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
          </div>
          <div className="flex-1">
            <h2 className="font-semibold text-gray-900 dark:text-white">Conflicto de horarios</h2>
            <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
              {conflictingUser?.name} ya tiene tareas en ese período
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-6 py-4">
          {/* Conflicts list */}
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Tareas en conflicto:</p>
          <div className="space-y-2">
            {conflicts.map((c: any) => (
              <div key={c.id} className="flex items-center gap-3 p-3 bg-amber-50 dark:bg-amber-950/20 rounded-xl border border-amber-200 dark:border-amber-900">
                <div className="w-1.5 h-1.5 rounded-full bg-amber-500 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{c.name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {formatDate(c.startDate, 'dd MMM')} — {formatDate(c.endDate, 'dd MMM')}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Mini timeline */}
          <MiniTimeline conflicts={conflicts} newTask={taskData} />

          {/* Pause & reschedule mode */}
          {pauseMode ? (
            <div className="mt-4 space-y-3">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Selecciona la tarea a pausar y su nueva fecha fin:
              </p>
              <div className="space-y-2">
                {conflicts.map((c: any) => (
                  <button
                    key={c.id}
                    onClick={() => setSelectedConflict(c)}
                    className={`w-full text-left p-3 rounded-xl border transition-all ${
                      selectedConflict?.id === c.id
                        ? 'border-amber-400 bg-amber-50 dark:bg-amber-950/20'
                        : 'border-gray-200 dark:border-neutral-700 hover:border-amber-300'
                    }`}
                  >
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{c.name}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {formatDate(c.startDate, 'dd MMM')} — {formatDate(c.endDate, 'dd MMM')}
                    </p>
                  </button>
                ))}
              </div>

              {selectedConflict && (
                <div>
                  <label className="label">Nueva fecha fin para "{selectedConflict.name}"</label>
                  <input
                    type="date"
                    className="input"
                    value={newEndDate}
                    onChange={(e) => setNewEndDate(e.target.value)}
                    max={taskData.startDate}
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    Debe terminar antes del {formatDate(taskData.startDate, 'dd MMM')} para evitar el conflicto.
                  </p>
                </div>
              )}

              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => setPauseMode(false)}
                  className="flex-1 btn-secondary text-sm"
                >
                  Cancelar
                </button>
                <button
                  onClick={handlePauseAndReschedule}
                  disabled={pauseLoading || !selectedConflict || !newEndDate}
                  className="flex-1 btn-primary text-sm flex items-center justify-center gap-2"
                >
                  {pauseLoading && <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                  Pausar y crear
                </button>
              </div>
            </div>
          ) : (
            <>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mt-4 mb-3">¿Qué deseas hacer?</p>
              <div className="space-y-2">
                {/* Force create */}
                <button
                  type="button"
                  onClick={() => onResolve('force', taskData)}
                  className="w-full flex items-start gap-3 p-4 rounded-xl border border-gray-200 dark:border-neutral-700 hover:border-brand-300 hover:bg-brand-50 dark:hover:bg-brand-950/20 transition-all text-left group"
                >
                  <div className="w-8 h-8 bg-brand-100 dark:bg-brand-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Zap className="w-4 h-4 text-brand-600 dark:text-brand-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">Crear de todas formas</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Guardar la tarea aunque exista solapamiento</p>
                  </div>
                </button>

                {/* Pause & reschedule */}
                <button
                  type="button"
                  onClick={() => setPauseMode(true)}
                  className="w-full flex items-start gap-3 p-4 rounded-xl border border-gray-200 dark:border-neutral-700 hover:border-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/20 transition-all text-left group"
                >
                  <div className="w-8 h-8 bg-amber-100 dark:bg-amber-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                    <PauseCircle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">Pausar y reprogramar tarea existente</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Pausar la tarea en conflicto y ajustar su fecha fin</p>
                  </div>
                </button>

                {/* Reschedule new task */}
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full flex items-start gap-3 p-4 rounded-xl border border-gray-200 dark:border-neutral-700 hover:border-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950/20 transition-all text-left group"
                >
                  <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                    <RefreshCw className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">Reprogramar fechas</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Volver y ajustar las fechas de la nueva tarea</p>
                  </div>
                </button>

                {/* Assign to different user */}
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full flex items-start gap-3 p-4 rounded-xl border border-gray-200 dark:border-neutral-700 hover:border-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 transition-all text-left group"
                >
                  <div className="w-8 h-8 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                    <UserX className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">Asignar a otro colaborador</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Volver y seleccionar a una persona diferente</p>
                  </div>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
