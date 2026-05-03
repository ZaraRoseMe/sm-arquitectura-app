'use client'
// src/components/tasks/ConflictModal.tsx
import { AlertTriangle, X, Zap, RefreshCw, UserX } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import type { User } from '@/types'

interface ConflictModalProps {
  conflicts: any[]
  taskData: any
  users: User[]
  onResolve: (action: string, taskData: any) => void
  onClose: () => void
}

export default function ConflictModal({ conflicts, taskData, users, onResolve, onClose }: ConflictModalProps) {
  const conflictingUser = users.find((u) => u.id === taskData.userId)

  return (
    <div className="modal-backdrop z-60" onClick={onClose}>
      <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl w-full max-w-md animate-slide-up" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100 dark:border-neutral-800 bg-amber-50 dark:bg-amber-950/20 rounded-t-2xl">
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

        {/* Conflicts list */}
        <div className="px-6 py-4">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Tareas en conflicto:</p>
          <div className="space-y-2 mb-5">
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

          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">¿Qué deseas hacer?</p>
          <div className="space-y-2">
            {/* Force create */}
            <button
              onClick={() => onResolve('force', taskData)}
              className="w-full flex items-start gap-3 p-4 rounded-xl border border-gray-200 dark:border-neutral-700 hover:border-brand-300 hover:bg-brand-50 dark:hover:bg-brand-950/20 transition-all text-left group"
            >
              <div className="w-8 h-8 bg-brand-100 dark:bg-brand-900/30 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:bg-brand-200 transition-colors">
                <Zap className="w-4 h-4 text-brand-600 dark:text-brand-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">Crear de todas formas</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Guardar la tarea aunque exista solapamiento</p>
              </div>
            </button>

            {/* Cancel and adjust dates */}
            <button
              onClick={onClose}
              className="w-full flex items-start gap-3 p-4 rounded-xl border border-gray-200 dark:border-neutral-700 hover:border-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950/20 transition-all text-left group"
            >
              <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:bg-blue-200 transition-colors">
                <RefreshCw className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">Reprogramar fechas</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Volver y ajustar las fechas de la tarea</p>
              </div>
            </button>

            {/* Assign to different user */}
            <button
              onClick={onClose}
              className="w-full flex items-start gap-3 p-4 rounded-xl border border-gray-200 dark:border-neutral-700 hover:border-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 transition-all text-left group"
            >
              <div className="w-8 h-8 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:bg-emerald-200 transition-colors">
                <UserX className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">Asignar a otro colaborador</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Volver y seleccionar a una persona diferente</p>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
