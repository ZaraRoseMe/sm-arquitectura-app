'use client'
// src/components/tasks/TaskModal.tsx
import { useState } from 'react'
import { X } from 'lucide-react'
import { formatDateInput } from '@/lib/utils'
import type { Task, Project, User } from '@/types'

interface TaskModalProps {
  task: Task | null
  projects: Project[]
  users: User[]
  isAdmin: boolean
  currentUserId: string
  onClose: () => void
  onSave: (data: any) => Promise<boolean>
}

export default function TaskModal({ task, projects, users, isAdmin, currentUserId, onClose, onSave }: TaskModalProps) {
  const [form, setForm] = useState({
    name: task?.name || '',
    description: task?.description || '',
    startDate: task ? formatDateInput(task.startDate) : '',
    endDate: task ? formatDateInput(task.endDate) : '',
    status: task?.status || 'PENDIENTE',
    progress: task?.progress || 0,
    projectId: task?.projectId || '',
    userId: task?.userId || (isAdmin ? '' : currentUserId),
  })
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    await onSave(form)
    setLoading(false)
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl w-full max-w-lg animate-slide-up max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-neutral-800 sticky top-0 bg-white dark:bg-neutral-900">
          <h2 className="font-semibold text-gray-900 dark:text-white">
            {task ? 'Editar tarea' : 'Nueva tarea'}
          </h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-neutral-800 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="label">Nombre de la tarea *</label>
            <input
              className="input"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Ej: Diseño arquitectónico"
              required
            />
          </div>

          <div>
            <label className="label">Descripción</label>
            <textarea
              className="input resize-none"
              rows={2}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Descripción de la tarea..."
            />
          </div>

          <div>
            <label className="label">Proyecto *</label>
            <select
              className="input"
              value={form.projectId}
              onChange={(e) => setForm({ ...form, projectId: e.target.value })}
              required
            >
              <option value="">Seleccionar proyecto</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          {isAdmin && (
            <div>
              <label className="label">Asignar a *</label>
              <select
                className="input"
                value={form.userId}
                onChange={(e) => setForm({ ...form, userId: e.target.value })}
                required
              >
                <option value="">Seleccionar colaborador</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>{u.name} ({u.role === 'ADMIN' ? 'Admin' : 'Colaborador'})</option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Fecha inicio *</label>
              <input
                type="date"
                className="input"
                value={form.startDate}
                onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="label">Fecha fin *</label>
              <input
                type="date"
                className="input"
                value={form.endDate}
                min={form.startDate}
                onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Estado</label>
              <select
                className="input"
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value as any })}
              >
                <option value="PENDIENTE">Pendiente</option>
                <option value="EN_PROGRESO">En Progreso</option>
                <option value="PAUSADO">Pausado</option>
                <option value="TERMINADO">Terminado</option>
              </select>
            </div>
            <div>
              <label className="label">Progreso ({form.progress}%)</label>
              <input
                type="range"
                min={0}
                max={100}
                step={5}
                value={form.progress}
                onChange={(e) => setForm({ ...form, progress: parseInt(e.target.value) })}
                className="w-full mt-2 accent-brand-600"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 btn-secondary">
              Cancelar
            </button>
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
