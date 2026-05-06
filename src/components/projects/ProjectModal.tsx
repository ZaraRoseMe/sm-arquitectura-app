'use client'
// src/components/projects/ProjectModal.tsx
import { useState } from 'react'
import { X, Users, FolderOpen } from 'lucide-react'
import { formatDateInput } from '@/lib/utils'
import toast from 'react-hot-toast'

const PROJECT_COLORS = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444',
  '#8B5CF6', '#06B6D4', '#EC4899', '#6366F1',
  '#F97316', '#84CC16', '#14B8A6', '#A855F7',
]

interface ProjectModalProps {
  project: any | null
  parentProject?: any | null   // padre preseleccionado al click en 📁+
  projects?: any[]             // lista aplanada para selector de padre
  teams?: any[]
  onClose: () => void
  onSaved: (project: any) => void
}

export default function ProjectModal({ project, parentProject, projects = [], teams = [], onClose, onSaved }: ProjectModalProps) {
  const [form, setForm] = useState({
    name: project?.name || '',
    description: project?.description || '',
    startDate: project ? formatDateInput(project.startDate) : '',
    endDate: project ? formatDateInput(project.endDate) : '',
    color: project?.color || parentProject?.color || '#3B82F6',
    teamId: project?.teamId || '',
    parentId: project?.parentId || parentProject?.id || '',
  })
  const [loading, setLoading] = useState(false)

  // No mostrar el proyecto actual ni sus descendientes como opciones de padre
  const parentOptions = projects.filter(p => p.id !== project?.id)

  // Breadcrumb del padre seleccionado
  const selectedParent = parentOptions.find(p => p.id === form.parentId)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    const method = project ? 'PATCH' : 'POST'
    const url = project ? `/api/projects/${project.id}` : '/api/projects'

    const body: any = { ...form }
    if (!body.teamId) body.teamId = null
    if (!body.parentId) body.parentId = null

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    if (res.ok) {
      const data = await res.json()
      onSaved(data)
      toast.success(project ? 'Proyecto actualizado' : 'Proyecto creado')
    } else {
      const err = await res.json()
      toast.error(err.error || 'Error al guardar')
    }
    setLoading(false)
  }

  const isSubproject = !!form.parentId

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl w-full max-w-md animate-slide-up max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-neutral-800 sticky top-0 bg-white dark:bg-neutral-900">
          <div>
            <h2 className="font-semibold text-gray-900 dark:text-white">
              {project ? 'Editar proyecto' : isSubproject ? 'Nuevo subproyecto' : 'Nuevo desarrollo'}
            </h2>
            {selectedParent && (
              <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                <FolderOpen className="w-3 h-3" />
                dentro de: {selectedParent.name}
              </p>
            )}
          </div>
          <button onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-neutral-800 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">

          {/* Proyecto padre */}
          <div>
            <label className="label flex items-center gap-1.5">
              <FolderOpen className="w-3.5 h-3.5" /> Proyecto padre (opcional)
            </label>
            <select className="input" value={form.parentId}
              onChange={e => {
                const parent = parentOptions.find(p => p.id === e.target.value)
                setForm(f => ({
                  ...f,
                  parentId: e.target.value,
                  color: parent ? parent.color : f.color,
                }))
              }}>
              <option value="">— Ninguno (desarrollo raíz) —</option>
              {parentOptions.map(p => (
                <option key={p.id} value={p.id}>
                  {'  '.repeat(0)}{p.name}
                  {p.parent ? ` (en ${p.parent.name})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Nombre */}
          <div>
            <label className="label">Nombre *</label>
            <input className="input"
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              placeholder={isSubproject ? 'Ej: Golf Villas, Línea 1, GV5A...' : 'Ej: Chileno, Palmilla, Maravilla...'}
              required />
          </div>

          {/* Descripción */}
          <div>
            <label className="label">Descripción</label>
            <textarea className="input resize-none" rows={2}
              value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
              placeholder="Descripción..." />
          </div>

          {/* Fechas */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Fecha inicio *</label>
              <input type="date" className="input"
                value={form.startDate}
                onChange={e => setForm({ ...form, startDate: e.target.value })}
                required />
            </div>
            <div>
              <label className="label">Fecha fin *</label>
              <input type="date" className="input"
                value={form.endDate}
                min={form.startDate}
                onChange={e => setForm({ ...form, endDate: e.target.value })}
                required />
            </div>
          </div>

          {/* Color */}
          <div>
            <label className="label">Color</label>
            <div className="flex gap-2 flex-wrap">
              {PROJECT_COLORS.map(color => (
                <button key={color} type="button" onClick={() => setForm({ ...form, color })}
                  className="w-8 h-8 rounded-full transition-all hover:scale-110"
                  style={{ backgroundColor: color, outline: form.color === color ? `3px solid ${color}` : 'none', outlineOffset: '2px' }} />
              ))}
            </div>
          </div>

          {/* Coordinador — solo admin, solo si hay equipos */}
          {teams.length > 0 && (
            <div>
              <label className="label flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5" /> Coordinador asignado
              </label>
              <select className="input" value={form.teamId}
                onChange={e => setForm({ ...form, teamId: e.target.value })}>
                <option value="">Sin asignar</option>
                {teams.map(team => (
                  <option key={team.id} value={team.id}>
                    {team.coordinator?.name} — {team.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 btn-secondary">Cancelar</button>
            <button type="submit" disabled={loading}
              className="flex-1 btn-primary flex items-center justify-center gap-2">
              {loading && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              {project ? 'Actualizar' : 'Crear'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
