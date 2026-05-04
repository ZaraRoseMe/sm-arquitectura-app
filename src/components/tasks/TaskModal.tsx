'use client'
// src/components/tasks/TaskModal.tsx
import { useState } from 'react'
import { X, Plus, Clock } from 'lucide-react'
import { formatDateInput } from '@/lib/utils'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import type { Task, Project, User } from '@/types'

interface DescriptionEntry {
  text: string
  createdAt: string
  authorName: string
}

interface TaskModalProps {
  task: Task | null
  projects: Project[]
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
    // Legacy plain text — wrap as single entry
    return [{ text: raw, createdAt: new Date().toISOString(), authorName: '' }]
  } catch {
    return [{ text: raw, createdAt: new Date().toISOString(), authorName: '' }]
  }
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

  function addEntry() {
    if (!newEntry.trim()) return
    const entry: DescriptionEntry = {
      text: newEntry.trim(),
      createdAt: new Date().toISOString(),
      authorName: currentUserName,
    }
    setEntries((prev) => [...prev, entry])
    setNewEntry('')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    await onSave({
      ...form,
      description: entries.length > 0 ? JSON.stringify(entries) : '',
    })
    setLoading(false)
  }

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
            <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ej: Diseño arquitectónico" required />
          </div>

          {/* Description entries */}
          <div>
            <label className="label">Descripción / Actualizaciones</label>

            {/* Existing entries */}
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

            {/* New entry input */}
            <div className="flex gap-2">
              <textarea
                className="input resize-none flex-1 text-sm"
                rows={2}
                value={newEntry}
                onChange={(e) => setNewEntry(e.target.value)}
                placeholder={entries.length > 0 ? 'Agregar actualización...' : 'Descripción de la tarea...'}
                onKeyDown={(e) => { if (e.key === 'Enter' && e.metaKey) addEntry() }}
              />
              <button type="button" onClick={addEntry} disabled={!newEntry.trim()}
                className="flex-shrink-0 w-9 h-9 mt-1 flex items-center justify-center rounded-xl bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-40 transition-colors">
                <Plus className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-1">Cada entrada queda registrada con fecha y hora.</p>
          </div>

          {/* Project */}
          <div>
            <label className="label">Proyecto *</label>
            <select className="input" value={form.projectId} onChange={(e) => setForm({ ...form, projectId: e.target.value })} required>
              <option value="">Seleccionar proyecto</option>
              {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>

          {/* Assign */}
          {isAdmin && (
            <div>
              <label className="label">Asignar a *</label>
              <select className="input" value={form.userId} onChange={(e) => setForm({ ...form, userId: e.target.value })} required>
                <option value="">Seleccionar colaborador</option>
                {users.map((u) => <option key={u.id} value={u.id}>{u.name} ({u.role === 'ADMIN' ? 'Admin' : 'Colaborador'})</option>)}
              </select>
            </div>
          )}

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Fecha inicio *</label>
              <input type="date" className="input" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} required />
            </div>
            <div>
              <label className="label">Fecha fin *</label>
              <input type="date" className="input" value={form.endDate} min={form.startDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} required />
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
