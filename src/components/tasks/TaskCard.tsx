'use client'
// src/components/tasks/TaskCard.tsx
import { useState } from 'react'
import { Edit2, Trash2, Play, Pause, CheckCircle, Clock, AlertTriangle, ChevronDown, ChevronUp, Timer, RotateCcw } from 'lucide-react'
import { cn, getStatusColor, getStatusLabel, formatDate, isOverdue, getInitials } from '@/lib/utils'
import { format, addDays, isWeekend } from 'date-fns'
import { es } from 'date-fns/locale'
import type { Task } from '@/types'
import TimeEntryModal from '@/components/time/TimeEntryModal'

interface DescriptionEntry { text: string; createdAt: string; authorName: string }

function parseEntries(raw?: string | null): DescriptionEntry[] {
  if (!raw) return []
  try {
    const p = JSON.parse(raw)
    if (Array.isArray(p)) return p
    return [{ text: raw, createdAt: new Date().toISOString(), authorName: '' }]
  } catch { return [{ text: raw, createdAt: new Date().toISOString(), authorName: '' }] }
}

function addWorkingDays(date: Date, days: number): Date {
  let result = new Date(date)
  let added = 0
  while (added < days) {
    result = addDays(result, 1)
    if (!isWeekend(result)) added++
  }
  return result
}

function countWorkingDays(start: Date, end: Date): number {
  let count = 0
  let current = new Date(start)
  while (current <= end) {
    if (!isWeekend(current)) count++
    current = addDays(current, 1)
  }
  return count
}

interface TaskCardProps {
  task: Task
  isAdmin: boolean
  currentUserId: string
  onEdit: (task: Task) => void
  onDelete: (id: string) => void
  onStatusChange: (id: string, status: string, reason?: string) => void
}

// Popup de reanudar tarea pausada
function ResumePrompt({ pausedTaskName, onYes, onNo, loading }: {
  pausedTaskName: string
  onYes: () => void
  onNo: () => void
  loading: boolean
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={onNo}>
      <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl p-6 w-full max-w-sm mx-4 animate-slide-up" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/30 rounded-xl flex items-center justify-center flex-shrink-0">
            <RotateCcw className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white text-sm">Tarea pausada pendiente</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Esta tarea estaba esperando</p>
          </div>
        </div>
        <p className="text-sm text-gray-700 dark:text-gray-300 mb-5">
          La tarea <span className="font-semibold">"{pausedTaskName}"</span> fue pausada por esta tarea. ¿Deseas reanudarla ahora?
        </p>
        <p className="text-xs text-gray-400 mb-5">
          Los días pendientes se reprogramarán automáticamente desde hoy.
        </p>
        <div className="flex gap-3">
          <button onClick={onNo} className="flex-1 btn-secondary text-sm">No por ahora</button>
          <button onClick={onYes} disabled={loading}
            className="flex-1 btn-primary text-sm flex items-center justify-center gap-2">
            {loading && <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
            <RotateCcw className="w-3.5 h-3.5" />
            Reanudar
          </button>
        </div>
      </div>
    </div>
  )
}

export default function TaskCard({ task, isAdmin, currentUserId, onEdit, onDelete, onStatusChange }: TaskCardProps) {
  const [showPauseDialog, setShowPauseDialog] = useState(false)
  const [pauseReason, setPauseReason] = useState('')
  const [showDesc, setShowDesc] = useState(false)
  const [showTimeModal, setShowTimeModal] = useState(false)
  const [resumePrompt, setResumePrompt] = useState<{ taskId: string; taskName: string } | null>(null)
  const [resumeLoading, setResumeLoading] = useState(false)

  const colors = getStatusColor(task.status)
  const overdue = isOverdue(task.endDate) && task.status !== 'TERMINADO'
  const canEdit = isAdmin || task.userId === currentUserId
  const canLogTime = isAdmin || task.userId === currentUserId
  const avatarColor = (task.user as any)?.color || '#6366F1'
  const daysLeft = Math.ceil((new Date(task.endDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
  const entries = parseEntries((task as any).description)
  const hasDesc = entries.length > 0

  // Al marcar como terminada, buscar si hay una tarea pausada por esta
  async function handleMarkDone() {
    // Primero marcar como terminada
    onStatusChange(task.id, 'TERMINADO')

    // Luego buscar tareas pausadas por esta tarea
    try {
      const res = await fetch(`/api/tasks/paused-by?taskName=${encodeURIComponent(task.name)}&userId=${task.userId}`)
      if (res.ok) {
        const pausedTasks = await res.json()
        if (pausedTasks.length > 0) {
          // Mostrar prompt para el primero encontrado
          setResumePrompt({ taskId: pausedTasks[0].id, taskName: pausedTasks[0].name })
        }
      }
    } catch (err) {
      console.error('Error buscando tareas pausadas:', err)
    }
  }

  async function handleResume() {
    if (!resumePrompt) return
    setResumeLoading(true)

    try {
      // Obtener la tarea pausada para calcular días restantes
      const taskRes = await fetch(`/api/tasks/${resumePrompt.taskId}`)
      const pausedTask = await taskRes.json()

      // Calcular días restantes basados en pauseLogs
      const pauseLog = pausedTask.pauseLogs?.find((p: any) =>
        p.reason?.startsWith('__paused_by_task__') && !p.resumedAt
      )

      if (pauseLog) {
        const pausedAt = new Date(pauseLog.pausedAt)
        const taskEnd = new Date(pausedTask.endDate)

        // Días hábiles que quedaban desde que se pausó hasta el fin original
        const daysRemaining = countWorkingDays(pausedAt, taskEnd)

        // Nueva fecha de inicio = hoy (saltando fines de semana)
        let newStart = new Date()
        while (isWeekend(newStart)) newStart = addDays(newStart, 1)

        // Nueva fecha de fin = hoy + días restantes
        const newEnd = addWorkingDays(newStart, Math.max(0, daysRemaining - 1))

        await fetch(`/api/tasks/${resumePrompt.taskId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            status: 'EN_PROGRESO',
            startDate: newStart.toISOString().split('T')[0],
            endDate: newEnd.toISOString().split('T')[0],
          }),
        })
      } else {
        // Si no hay pauseLog con esa razón, solo reanudar sin cambiar fechas
        await fetch(`/api/tasks/${resumePrompt.taskId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'EN_PROGRESO' }),
        })
      }

      setResumePrompt(null)
      // Recargar la página para reflejar cambios en Gantt
      window.location.reload()
    } catch (err) {
      console.error('Error reanudando tarea:', err)
    }
    setResumeLoading(false)
  }

  return (
    <>
      {resumePrompt && (
        <ResumePrompt
          pausedTaskName={resumePrompt.taskName}
          onYes={handleResume}
          onNo={() => setResumePrompt(null)}
          loading={resumeLoading}
        />
      )}

      <div className={cn('card p-5 group hover:shadow-md transition-all', overdue && 'ring-1 ring-red-200 dark:ring-red-900')}>
        {/* Header */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-1">
              {overdue && <AlertTriangle className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />}
              <h3 className="font-semibold text-gray-900 dark:text-white text-sm truncate">{task.name}</h3>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">{(task as any).project?.name}</p>
          </div>
          {canEdit && isAdmin && (
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
              <button onClick={() => onEdit(task)} className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-950/30 transition-colors">
                <Edit2 className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => onDelete(task.id)} className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Status */}
        <span className={cn('badge mb-3', colors.bg, colors.text)}>
          <span className={cn('w-1.5 h-1.5 rounded-full', colors.dot)} />
          {getStatusLabel(task.status)}
        </span>

        {/* Description entries */}
        {hasDesc && (
          <div className="mb-3">
            <button onClick={() => setShowDesc(!showDesc)}
              className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
              {showDesc ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              <span>{showDesc ? 'Ocultar' : `Ver descripción (${entries.length})`}</span>
            </button>
            {showDesc && (
              <div className="mt-2 space-y-2 max-h-36 overflow-y-auto">
                {entries.map((entry, i) => (
                  <div key={i} className="bg-gray-50 dark:bg-neutral-800 rounded-lg px-3 py-2 border border-gray-100 dark:border-neutral-700">
                    <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed">{entry.text}</p>
                    <div className="flex items-center gap-1 mt-1">
                      <Clock className="w-2.5 h-2.5 text-gray-400" />
                      <p className="text-[10px] text-gray-400">
                        {entry.authorName && <span className="font-medium">{entry.authorName} · </span>}
                        {format(new Date(entry.createdAt), "dd MMM yyyy HH:mm", { locale: es })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Progress */}
        {task.status === 'EN_PROGRESO' && (
          <div className="mb-3">
            <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
              <span>Progreso</span><span>{task.progress}%</span>
            </div>
            <div className="h-1.5 bg-gray-100 dark:bg-neutral-700 rounded-full overflow-hidden">
              <div className="h-full bg-brand-500 rounded-full transition-all" style={{ width: `${task.progress}%` }} />
            </div>
          </div>
        )}

        {/* Dates */}
        <div className="grid grid-cols-2 gap-2 mb-3">
          <div>
            <p className="text-xs text-gray-400 mb-0.5">Inicio</p>
            <p className="text-xs font-medium text-gray-700 dark:text-gray-300">{formatDate(task.startDate, 'dd MMM')}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-0.5">Fin</p>
            <p className={cn('text-xs font-medium', overdue ? 'text-red-500' : 'text-gray-700 dark:text-gray-300')}>{formatDate(task.endDate, 'dd MMM')}</p>
          </div>
        </div>

        {/* Updated at */}
        <p className="text-[10px] text-gray-400 mb-3 flex items-center gap-1">
          <Clock className="w-2.5 h-2.5" />
          Actualizado {format(new Date(task.updatedAt), "dd MMM yyyy HH:mm", { locale: es })}
        </p>

        {/* Days indicator */}
        {task.status !== 'TERMINADO' && (
          <div className={cn('flex items-center gap-1.5 text-xs mb-4 px-2.5 py-1.5 rounded-lg',
            overdue ? 'bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400'
            : daysLeft <= 7 ? 'bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400'
            : 'bg-gray-50 dark:bg-neutral-800 text-gray-500 dark:text-gray-400')}>
            <Clock className="w-3.5 h-3.5" />
            {overdue ? `Retrasado ${Math.abs(daysLeft)} días` : daysLeft === 0 ? 'Vence hoy' : `${daysLeft} días restantes`}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between gap-2">
          {task.user && (
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-semibold" style={{ backgroundColor: avatarColor }}>
                {getInitials(task.user.name)}
              </div>
              <span className="text-xs text-gray-500 dark:text-gray-400">{task.user.name.split(' ')[0]}</span>
            </div>
          )}

          <div className="flex gap-1 ml-auto flex-wrap justify-end">
            {canLogTime && (
              <button onClick={() => setShowTimeModal(true)}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-950/30 transition-colors"
                title="Registrar tiempo">
                <Timer className="w-3.5 h-3.5" /> Tiempo
              </button>
            )}

            {canEdit && task.status !== 'TERMINADO' && (
              <>
                {task.status === 'EN_PROGRESO' && (
                  <button onClick={() => setShowPauseDialog(true)}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/30 transition-colors">
                    <Pause className="w-3.5 h-3.5" /> Pausar
                  </button>
                )}
                {(task.status === 'PENDIENTE' || task.status === 'PAUSADO') && (
                  <button onClick={() => onStatusChange(task.id, 'EN_PROGRESO')}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-colors">
                    <Play className="w-3.5 h-3.5" /> {task.status === 'PAUSADO' ? 'Reanudar' : 'Iniciar'}
                  </button>
                )}
                {task.status === 'EN_PROGRESO' && (
                  <button onClick={handleMarkDone}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-colors">
                    <CheckCircle className="w-3.5 h-3.5" /> Terminar
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {/* Pause dialog */}
        {showPauseDialog && (
          <div className="mt-3 pt-3 border-t border-gray-100 dark:border-neutral-800">
            <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">Motivo de pausa (opcional)</p>
            <textarea value={pauseReason} onChange={e => setPauseReason(e.target.value)}
              className="input text-xs resize-none mb-2" rows={2} placeholder="¿Por qué se pausa esta tarea?" />
            <div className="flex gap-2">
              <button onClick={() => setShowPauseDialog(false)} className="flex-1 btn-secondary text-xs py-1.5">Cancelar</button>
              <button onClick={() => { onStatusChange(task.id, 'PAUSADO', pauseReason); setShowPauseDialog(false); setPauseReason('') }}
                className="flex-1 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs rounded-lg font-medium transition-colors">
                Pausar
              </button>
            </div>
          </div>
        )}

        {showTimeModal && (
          <TimeEntryModal taskId={task.id} taskName={task.name}
            onClose={() => setShowTimeModal(false)} onSaved={() => setShowTimeModal(false)} />
        )}
      </div>
    </>
  )
}
