'use client'
// src/components/users/UserModal.tsx
import { useState } from 'react'
import { X, Users } from 'lucide-react'
import { cn } from '@/lib/utils'
import toast from 'react-hot-toast'

const PRESET_COLORS = [
  '#6366F1','#3B82F6','#0EA5E9','#10B981','#F59E0B',
  '#EF4444','#EC4899','#8B5CF6','#14B8A6','#F97316',
  '#84CC16','#06B6D4','#A855F7','#E11D48','#64748B',
]

interface UserModalProps {
  user: any | null
  onClose: () => void
  onSaved: (user: any) => void
}

export default function UserModal({ user, onClose, onSaved }: UserModalProps) {
  const [form, setForm] = useState({
    username: user?.username || '',
    name: user?.name || '',
    password: '',
    role: user?.role || 'COLABORADOR',
    color: user?.color || '#6366F1',
    teamName: user?.ledTeam?.name || '',
  })
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    const method = user ? 'PATCH' : 'POST'
    const url = user ? `/api/users/${user.id}` : '/api/users'

    const body: any = { ...form }
    if (!body.password) delete body.password
    if (body.role !== 'COORDINADOR') delete body.teamName

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    if (res.ok) {
      const data = await res.json()
      onSaved(data)
      toast.success(user ? 'Usuario actualizado' : 'Usuario creado')
    } else {
      const err = await res.json()
      toast.error(err.error || 'Error al guardar')
    }
    setLoading(false)
  }

  const isCoordinador = form.role === 'COORDINADOR'

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl w-full max-w-md animate-slide-up"
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-neutral-800">
          <h2 className="font-semibold text-gray-900 dark:text-white">
            {user ? 'Editar usuario' : 'Nuevo usuario'}
          </h2>
          <button onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-neutral-800 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Username */}
          <div>
            <label className="label">Nombre de usuario *</label>
            <input className="input"
              value={form.username}
              onChange={e => setForm({ ...form, username: e.target.value.toLowerCase().replace(/\s/g, '_') })}
              placeholder="ej: ana_garcia"
              required
              disabled={!!user}
            />
            {!user && <p className="text-xs text-gray-400 mt-1">Solo minúsculas y guiones bajos. No se puede cambiar después.</p>}
          </div>

          {/* Nombre completo */}
          <div>
            <label className="label">Nombre completo *</label>
            <input className="input"
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              placeholder="Ej: Ana García"
              required
            />
          </div>

          {/* Contraseña */}
          <div>
            <label className="label">{user ? 'Nueva contraseña (dejar vacío para no cambiar)' : 'Contraseña *'}</label>
            <input type="password" className="input"
              value={form.password}
              onChange={e => setForm({ ...form, password: e.target.value })}
              placeholder="••••••••"
              required={!user}
              minLength={6}
            />
          </div>

          {/* Rol */}
          <div>
            <label className="label">Rol</label>
            <select className="input" value={form.role}
              onChange={e => setForm({ ...form, role: e.target.value as any })}>
              <option value="COLABORADOR">Colaborador</option>
              <option value="COORDINADOR">Coordinador</option>
              <option value="ADMIN">Administrador</option>
            </select>
          </div>

          {/* Nombre del equipo — solo si es COORDINADOR */}
          {isCoordinador && (
            <div className="bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/30 rounded-xl p-4 space-y-2">
              <div className="flex items-center gap-2 mb-1">
                <Users className="w-4 h-4 text-indigo-500" />
                <span className="text-sm font-medium text-indigo-700 dark:text-indigo-400">Equipo del coordinador</span>
              </div>
              <div>
                <label className="label">Nombre del equipo</label>
                <input className="input"
                  value={form.teamName}
                  onChange={e => setForm({ ...form, teamName: e.target.value })}
                  placeholder={`Equipo de ${form.name || 'coordinador'}`}
                />
                <p className="text-xs text-gray-400 mt-1">El coordinador podrá editar este nombre después.</p>
              </div>
            </div>
          )}

          {/* Color */}
          <div>
            <label className="label">Color en el Gantt</label>
            <div className="flex items-center gap-3 mt-1">
              <div className="w-9 h-9 rounded-full border-2 border-white shadow-md flex-shrink-0 flex items-center justify-center text-white text-xs font-bold"
                style={{ backgroundColor: form.color }}>
                {form.name ? form.name.charAt(0).toUpperCase() : '?'}
              </div>
              <div className="flex flex-wrap gap-2">
                {PRESET_COLORS.map(c => (
                  <button key={c} type="button" onClick={() => setForm({ ...form, color: c })}
                    className="w-6 h-6 rounded-full transition-transform hover:scale-110 focus:outline-none"
                    style={{ backgroundColor: c, boxShadow: form.color === c ? `0 0 0 2px white, 0 0 0 4px ${c}` : undefined }} />
                ))}
                <input type="color" value={form.color}
                  onChange={e => setForm({ ...form, color: e.target.value })}
                  className="w-6 h-6 rounded-full cursor-pointer border-0 p-0 bg-transparent"
                  title="Color personalizado" />
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 btn-secondary">Cancelar</button>
            <button type="submit" disabled={loading}
              className="flex-1 btn-primary flex items-center justify-center gap-2">
              {loading && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              {user ? 'Actualizar' : 'Crear usuario'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
