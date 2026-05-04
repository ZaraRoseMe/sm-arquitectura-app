'use client'
// src/components/tasks/TaskCard.tsx
import { useState } from 'react'
import { Edit2, Trash2, Play, Pause, CheckCircle, Clock, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react'
import { cn, getStatusColor, getStatusLabel, formatDate, isOverdue, getInitials } from '@/lib/utils'
import type { Task } from '@/types'

interface TaskCardProps {
  task: Task
  isAdmin: boolean
  currentUserId: string
  onEdit: (task: Task) => void
  onDelete: (id: string) => void
  onStatusChange: (id: string, status: string, reason?: string) => void
}

export default function TaskCard({ task, isAdmin, currentUserId, onEdit, onDelete, onStatusChange }: TaskCardProps) {
  const [showPauseDialog, setShowPauseDialog] = useState(false)
  const [pauseReason, setPauseReason] = useState('')
  const [showDesc, setShowDesc] = useState(false)

  const colors = getStatusColor(task.status)
  const overdue = isOverdue(task.endDate) && task.status !== 'TERMINADO'
  const canEdit = isAdmin || task.userId === currentUserId
  const avatarColor = (task.user as any)?.color || '#6366F1'
  const daysLeft = Math.ceil((new Date(task.endDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
  const hasDesc = !!(task as any).description?.trim()

  return (
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
        {canEdit && (
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
            {isAdmin && (
              <>
                <button onClick={() => onEdit(task)} className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-950/30 transition-colors">
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => onDelete(task.id)} className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* Status badge */}
      <span className={cn('badge mb-3', colors.bg, colors.text)}>
        <span className={cn('w-1.5 h-1.5 rounded-full', colors.dot)} />
        {getStatusLabel(task.status)}
      </span>

      {/* Description preview */}
      {hasDesc && (
        <div className="mb-3">
          <button
            onClick={() => setShowDesc(!showDesc)}
            className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors w-full text-left"
          >
            {showDesc ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            <span>{showDesc ? 'Ocultar descripción' : 'Ver descripción'}</span>
          </button>
          {showDesc && (
            <p className="mt-2 text-xs text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-neutral-800 rounded-lg px-3 py-2 leading-relaxed">
              {(task as any).description}
            </p>
          )}
        </div>
      )}

      {/* Progress bar */}
      {task.status === 'EN_PROGRESO' && (
        <div className="mb-3">
          <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
            <span>Progreso</span>
            <span>{task.progress}%</span>
          </div>
          <div className="h-1.5 bg-gray-100 dark:bg-neutral-700 rounded-full overflow-hidden">
            <div className="h-full bg-brand-500 rounded-full transition-all" style={{ width: `${task.progress}%` }} />
          </div>
        </div>
      )}

      {/* Dates */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        <div>
          <p className="text-xs text-gray-400 mb-0.5">Inicio</p>
          <p className="text-xs font-medium text-gray-700 dark:text-gray-300">{formatDate(task.startDate, 'dd MMM')}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400 mb-0.5">Fin</p>
          <p className={cn('text-xs font-medium', overdue ? 'text-red-500' : 'text-gray-700 dark:text-gray-300')}>
            {formatDate(task.endDate, 'dd MMM')}
          </p>
        </div>
      </div>

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
      <div className="flex items-center justify-between">
        {task.user && (
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-semibold" style={{ backgroundColor: avatarColor }}>
              {getInitials(task.user.name)}
            </div>
            <span className="text-xs text-gray-500 dark:text-gray-400">{task.user.name.split(' ')[0]}</span>
          </div>
        )}

        {canEdit && task.status !== 'TERMINADO' && (
          <div className="flex gap-1 ml-auto">
            {task.status === 'EN_PROGRESO' && (
              <button onClick={() => setShowPauseDialog(true)} className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/30 transition-colors">
                <Pause className="w-3.5 h-3.5" /> Pausar
              </button>
            )}
            {(task.status === 'PENDIENTE' || task.status === 'PAUSADO') && (
              <button onClick={() => onStatusChange(task.id, 'EN_PROGRESO')} className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-colors">
                <Play className="w-3.5 h-3.5" /> {task.status === 'PAUSADO' ? 'Reanudar' : 'Iniciar'}
              </button>
            )}
            {task.status === 'EN_PROGRESO' && (
              <button onClick={() => onStatusChange(task.id, 'TERMINADO')} className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-colors">
                <CheckCircle className="w-3.5 h-3.5" /> Terminar
              </button>
            )}
          </div>
        )}
      </div>

      {/* Pause dialog */}
      {showPauseDialog && (
        <div className="mt-3 pt-3 border-t border-gray-100 dark:border-neutral-800">
          <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">Motivo de pausa (opcional)</p>
          <textarea value={pauseReason} onChange={(e) => setPauseReason(e.target.value)} className="input text-xs resize-none mb-2" rows={2} placeholder="¿Por qué se pausa esta tarea?" />
          <div className="flex gap-2">
            <button onClick={() => setShowPauseDialog(false)} className="flex-1 btn-secondary text-xs py-1.5">Cancelar</button>
            <button onClick={() => { onStatusChange(task.id, 'PAUSADO', pauseReason); setShowPauseDialog(false); setPauseReason('') }}
              className="flex-1 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs rounded-lg font-medium transition-colors">
              Pausar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
